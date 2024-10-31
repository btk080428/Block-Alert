import axios, { AxiosInstance } from "axios";
import { EventEmitter } from "events";
import { Logger } from "../logger/logger";
import { TransactionAnalysis, Utxos } from "../types/interfaces";
import { formatTransaction, formatUtxos } from "../utils/formatUtils";
import { convertToAuthHeader } from "../utils/convertUtils";

export class NtfyService {
  private isRunning: boolean = false;
  private readonly axios: AxiosInstance;
  private readonly HEALTH_MAX_ATTEMPTS = 10;
  private readonly HEALTH_MAX_DELAY_MS = 32000;

  constructor(
    private eventEmitter: EventEmitter,
    private readonly logger: Logger,
    private readonly NTFY_URL: string,
    private readonly TOPIC: string,
    private readonly NTFY_USER: string | null,
    private readonly NTFY_PASSWORD: string | null
  ) {
    const baseURL = `${this.NTFY_URL}/${this.TOPIC}`;

    const axiosConfig: any = {
      baseURL,
      headers: {
        "Content-Type": "text/plain",
      },
    };

    if (this.NTFY_USER && this.NTFY_PASSWORD) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        ...convertToAuthHeader(this.NTFY_USER, this.NTFY_PASSWORD),
      };
    }

    this.axios = axios.create(axiosConfig);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("NtfyService is already running");
      return;
    }

    try {
      this.logger.info("Starting NtfyService");
      await this.healthCheck();

      this.setupEventListeners();
      this.isRunning = true;
      this.logger.info("NtfyService started successfully");
    } catch (error) {
      this.logger.error("Failed to start NtfyService", error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn("NtfyService is not running");
      return;
    }

    try {
      this.eventEmitter.removeAllListeners("transaction_detection");
      this.eventEmitter.removeAllListeners("balance_report");
      this.isRunning = false;
      this.logger.info("NtfyService stopped");
    } catch (error) {
      this.logger.error("Failed to stop NtfyService", error);
      throw error;
    }
  }

  private async healthCheck(): Promise<void> {
    this.logger.info("Starting Ntfy health check...");

    let attempts = 0;

    while (attempts < this.HEALTH_MAX_ATTEMPTS) {
      try {
        const res = await this.axios.get(`${this.NTFY_URL}/v1/health`);

        if (res.status === 200) {
          this.logger.info("Ntfy health check passed");
          return;
        } else if (res.data.healthy !== true) {
          this.logger.warn("Health check fails because healthy is not true");
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

    this.logger.error("Ntfy health check failed after maximum attempts");
    throw new Error("Ntfy health check failed");
  }

  private setupEventListeners(): void {
    this.eventEmitter.on("startup_success", async () => {
      await this.sendMessage("Block-Alert setup completed successfully 👍");
      this.eventEmitter.removeAllListeners("startup_success");
    });

    this.eventEmitter.on(
      "transaction_detection",
      async (analysis: TransactionAnalysis) => {
        await this.handleNewTransaction(analysis);
      }
    );

    this.eventEmitter.on("balance_report", async (utxos: Utxos) => {
      await this.sendUtxos(utxos);
    });
  }

  private async handleNewTransaction(
    analysis: TransactionAnalysis
  ): Promise<void> {
    try {
      await this.sendTransactionNotification(analysis);
    } catch (error) {
      this.logger.error("Failed to send transaction notification", error);
    }
  }

  private async sendTransactionNotification(
    analysis: TransactionAnalysis
  ): Promise<void> {
    try {
      const body = formatTransaction(analysis);
      const headers = {
        Actions: `view, View on mempool.space, https://mempool.space/tx/${analysis.txid}`,
      };

      await this.axios.post("", body, { headers });
      this.logger.info("Transaction notification sent successfully");
    } catch (error) {
      this.logger.error("Failed to send transaction notification", error);
      throw error;
    }
  }

  private async sendUtxos(utxos: Utxos) {
    try {
      const message = formatUtxos(utxos);
      await this.sendMessage(message);
      this.logger.info("Balance report sent successfully");
    } catch (error) {
      this.logger.error("Failed to send balance report", error);
    }
  }

  private async sendMessage(text: string): Promise<void> {
    try {
      await this.axios.post("", text);
    } catch (error) {
      this.logger.error("Failed to send message to ntfy server", error);
      throw error;
    }
  }
}
