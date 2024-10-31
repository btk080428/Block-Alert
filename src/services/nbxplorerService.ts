import axios, { AxiosInstance } from "axios";
import WebSocket, { ErrorEvent } from "ws";
import { EventEmitter } from "events";
import { Logger } from "../logger/logger";
import {
  TransactionData,
  NewTransactionMessage,
  SubscribeMessage,
  Utxos,
} from "../types/interfaces";
import { analyzeTransaction } from "../utils/analyzeUtils";
import { convertToAuthHeader } from "../utils/convertUtils";

export class NBXplorerService {
  private axios: AxiosInstance;
  private ws: WebSocket | null = null;
  private baseURL: string;
  private isRunning: boolean = false;
  private balanceReportTimeout: NodeJS.Timeout | null = null;
  private readonly HEALTH_MAX_ATTEMPTS = 10;
  private readonly HEALTH_MAX_DELAY_MS = 32000;

  constructor(
    private eventEmitter: EventEmitter,
    private readonly logger: Logger,
    private readonly NBX_URL: string,
    private readonly CRYPTO_CODE: string,
    private readonly EXTENDED_PUBKEY: string,
    private readonly BALANCE_REPORT_INTERVAL_MS: number,
    private readonly NBX_USER: string | null,
    private readonly NBX_PASSWORD: string | null
  ) {
    this.baseURL = `${this.NBX_URL}/v1/cryptos/${this.CRYPTO_CODE}`;
    const axiosConfig: any = {
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (this.NBX_USER && this.NBX_PASSWORD) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        ...convertToAuthHeader(this.NBX_USER, this.NBX_PASSWORD),
      };
    }

    this.axios = axios.create(axiosConfig);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("NBXplorerService is already running");
      return;
    }

    try {
      this.logger.info("Starting NBXplorerService");
      await this.healthCheck();
      await this.track();
      await this.connectWebSocket();
      await this.subscribeEvents();
      await this.waitForScanCompletion();

      this.startPeriodicBalanceReport();
      this.isRunning = true;
      this.logger.info("NBXplorerService started successfully");
    } catch (error) {
      this.logger.error("Failed to start NBXplorerService", error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn("NBXplorerService is not running");
      return;
    }

    try {
      this.eventEmitter.removeAllListeners("utxo_request");
      this.closeWebSocket();
      this.stopPeriodicBalanceReport();

      this.isRunning = false;
      this.logger.info("NBXplorerService stopped");
    } catch (error) {
      this.logger.error("Failed to stop NBXplorerService", error);
      throw error;
    }
  }

  private async healthCheck(): Promise<void> {
    this.logger.info("Starting NBXplorer health check...");

    let attempts = 0;

    while (attempts < this.HEALTH_MAX_ATTEMPTS) {
      try {
        const res = await this.axios.get(`/status`);

        if (res.status === 200) {
          this.logger.info("NBXplorer health check passed");
          return;
        } else {
          this.logger.warn(`Health check failed with status: ${res.status}`);
        }
      } catch (error) {
        this.logger.warn(`Health check error: ${error}`);
      }

      attempts++;
      const delay = Math.min(
        1000 * 2 ** (attempts - 1),
        this.HEALTH_MAX_DELAY_MS
      );

      this.logger.info(`Retrying health check in ${delay} ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.logger.error("NBXplorer health check failed after maximum attempts");
    throw new Error("NBXplorer health check failed");
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: WebSocket.ClientOptions = {};
      if (this.NBX_USER && this.NBX_PASSWORD) {
        options.headers = {
          ...options.headers,
          ...convertToAuthHeader(this.NBX_USER, this.NBX_PASSWORD),
        };
      }

      this.ws = new WebSocket(`${this.baseURL}/connect`, options);

      const onOpen = () => {
        this.logger.info("Connected to NBXplorer WebSocket");
        this.ws!.on("message", (data: WebSocket.Data) => {
          this.onMessage(data);
        });

        this.ws!.on("close", (code: number, reason: string) => {
          this.onClose(code, reason);
        });

        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        this.logger.error("Error connecting to NBXplorer WebSocket", error);
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        this.ws!.removeListener("open", onOpen);
        this.ws!.removeListener("error", onError);
      };

      this.ws.on("open", onOpen);
      this.ws.on("error", onError);
    });
  }

  private async onMessage(data: WebSocket.Data): Promise<void> {
    const message: NewTransactionMessage = JSON.parse(data.toString());

    if (message.type === "newtransaction") {
      const derivationStrategy = message.data.derivationStrategy;
      const txHash = message.data.transactionData.transactionHash;

      try {
        const txData = await this.getTransaction(txHash, derivationStrategy);
        const analysis = analyzeTransaction(txData, derivationStrategy);
        this.eventEmitter.emit("transaction_detection", analysis);
        this.logger.info(
          `${analysis.status} transaction detected - txid: ${analysis.txid}`
        );
      } catch (error) {
        this.logger.error("Failed to process incoming message", error);
      }
    }
  }

  private async onClose(code: number, reason: string): Promise<void> {
    if (code !== 1000) {
      this.logger.warn(`WebSocket closed with code ${code}. Reason: ${reason}`);
      try {
        await this.healthCheck();
        await this.connectWebSocket();
        await this.subscribeEvents();
      } catch (error) {
        this.eventEmitter.emit("shutdown", `Reconnection failed: ${error}`);
      }
    }
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.close(1000, "Normal closure");
      this.ws = null;
    }
  }

  private async scanUtxos(xpub: string, method: "POST" | "GET"): Promise<any> {
    const url = `/derivations/${xpub}/utxos/scan`;
    try {
      const res =
        method === "POST"
          ? await this.axios.post(url)
          : await this.axios.get(url);
      return res.data;
    } catch (error) {
      this.logger.error(
        `Failed to ${
          method === "POST" ? "initiate" : "get progress for"
        } UTXO scan for ${xpub}`,
        error
      );
      throw error;
    }
  }

  private startPeriodicBalanceReport(): void {
    if (this.balanceReportTimeout) {
      clearTimeout(this.balanceReportTimeout);
    }

    this.logger.info("Starting periodic balance report");

    const reportBalance = async () => {
      try {
        const utxos = await this.getUtxos();
        this.logger.info("UTXOs retrieved successsfully");
        this.eventEmitter.emit("balance_report", utxos);
      } catch (error) {
        this.logger.error("Failed to get UTXOs periodically", error);
      }

      this.balanceReportTimeout = setTimeout(
        reportBalance,
        this.BALANCE_REPORT_INTERVAL_MS
      );
    };

    reportBalance();
  }

  private stopPeriodicBalanceReport(): void {
    if (this.balanceReportTimeout) {
      clearTimeout(this.balanceReportTimeout);
      this.balanceReportTimeout = null;
    }
  }

  private async waitForScanCompletion(): Promise<void> {
    this.logger.info("Starting UTXOs scan for extended public key...");

    try {
      await this.scanUtxos(this.EXTENDED_PUBKEY, "POST");

      while (true) {
        const progress = await this.scanUtxos(this.EXTENDED_PUBKEY, "GET");

        switch (progress.status) {
          case "Queued":
            this.logger.info(`Scan for ${this.EXTENDED_PUBKEY} is queued.`);
            break;
          case "Pending":
            const { overallProgress, remainingSeconds } = progress.progress;
            const eta =
              remainingSeconds !== null
                ? `ETA: ${remainingSeconds}s`
                : "ETA: Unknown";
            this.logger.info(
              `Scan progress for ${this.EXTENDED_PUBKEY}: Progress: ${overallProgress}%, ${eta}`
            );
            break;
          case "Complete":
            this.logger.info(`UTXO scan completed for ${this.EXTENDED_PUBKEY}`);
            return;
          case "Error":
            throw new Error(`Scan error for ${this.EXTENDED_PUBKEY}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      throw error;
    }
  }

  private async track(): Promise<void> {
    try {
      await this.axios.post(`/derivations/${this.EXTENDED_PUBKEY}`);
      this.logger.info(`Tracked extended public key: ${this.EXTENDED_PUBKEY}`);
    } catch (error) {
      this.logger.error(
        `Failed to track extended public key: ${this.EXTENDED_PUBKEY}`
      );
      throw error;
    }
  }

  private async getTransaction(
    txHash: string,
    derivationStrategy: string
  ): Promise<TransactionData> {
    try {
      const res = await this.axios.get(
        `/derivations/${derivationStrategy}/transactions/${txHash}`
      );
      return res.data;
    } catch (error) {
      this.logger.error(`Failed to get transaction: ${txHash}`, error);
      throw error;
    }
  }

  private async getUtxos(): Promise<Utxos> {
    try {
      const res = await this.axios.get(
        `/derivations/${this.EXTENDED_PUBKEY}/utxos`
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  private async subscribeEvents(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const error = new Error("WebSocket is not open. Cannot subscribe");
      this.logger.error(error.message);
      throw error;
    }

    const message: SubscribeMessage = {
      type: "subscribetransaction",
      data: {
        cryptoCode: this.CRYPTO_CODE,
        derivationSchemes: [this.EXTENDED_PUBKEY],
      },
    };

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(message), (error) => {
        if (error) {
          this.logger.error("Failed to send subscribe message", error);
          reject(error);
        } else {
          this.logger.info(`Subscribed ${this.EXTENDED_PUBKEY} to NBXplorer`);
          resolve();
        }
      });
    });
  }
}
