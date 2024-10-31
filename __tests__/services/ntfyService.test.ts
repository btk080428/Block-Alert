import { EventEmitter } from "events";
import axios from "axios";
import { NtfyService } from "../../src/services/ntfyService";
import { Logger } from "../../src/logger/logger";
import { formatTransaction, formatUtxos } from "../../src/utils/formatUtils";
import { TransactionAnalysis, Utxos } from "../../src/types/interfaces";

jest.mock("axios");
jest.mock("events");
jest.mock("../../src/logger/logger");
jest.mock("../../src/utils/formatUtils");

describe("NtfyService", () => {
  let ntfyService: NtfyService;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
  let mockLogger: jest.Mocked<Logger>;
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockEventEmitter = new EventEmitter() as jest.Mocked<EventEmitter>;
    mockLogger = new Logger("test") as jest.Mocked<Logger>;
    mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.create.mockReturnValue(mockAxios);

    ntfyService = new NtfyService(
      mockEventEmitter,
      mockLogger,
      "ntfy_url",
      "ntfy_topic",
      "ntfy_user",
      "ntfy_password"
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("start", () => {
    it("should start the service successfully", async () => {
      jest.spyOn(ntfyService as any, "healthCheck").mockResolvedValue(true);
      jest
        .spyOn(ntfyService as any, "setupEventListeners")
        .mockReturnValue(null);

      await ntfyService.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "NtfyService started successfully"
      );
      expect((ntfyService as any).setupEventListeners).toHaveBeenCalled();
    });

    it("should throw an error if starting fails", async () => {
      jest
        .spyOn(ntfyService as any, "healthCheck")
        .mockRejectedValue(new Error());

      await expect(ntfyService.start()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to start NtfyService",
        expect.any(Error)
      );
    });
  });

  describe("stop", () => {
    it("should stop the service successfully", async () => {
      (ntfyService as any).isRunning = true;

      await ntfyService.stop();

      expect(mockEventEmitter.removeAllListeners).toHaveBeenCalledWith(
        "transaction_detection"
      );
      expect(mockEventEmitter.removeAllListeners).toHaveBeenCalledWith(
        "balance_report"
      );
      expect((ntfyService as any).isRunning).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith("NtfyService stopped");
    });
  });

  describe("healthCheck", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should pass health check on status 200", async () => {
      mockAxios.get.mockResolvedValue({ status: 200 });

      await (ntfyService as any).healthCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting Ntfy health check..."
      );
      expect(mockLogger.info).toHaveBeenCalledWith("Ntfy health check passed");
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(mockAxios.get).toHaveBeenCalledWith("ntfy_url/v1/health");
    });

    it("should pass health check after retries", async () => {
      mockAxios.get
        .mockRejectedValueOnce(new Error("some errors"))
        .mockRejectedValueOnce(new Error("some errors"))
        .mockResolvedValueOnce({ status: 200 });

      jest.useFakeTimers();

      (ntfyService as any).healthCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting Ntfy health check..."
      );

      await Promise.resolve(); // resolve first GET
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(mockAxios.get).toHaveBeenCalledWith("ntfy_url/v1/health");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Health check error: Error: some errors"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Retrying health check in 1000 ms..."
      );
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // resolve setTimeout

      await Promise.resolve(); // resolve second GET
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
      expect(mockAxios.get).toHaveBeenCalledWith("ntfy_url/v1/health");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Health check error: Error: some errors"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Retrying health check in 2000 ms..."
      );
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // resolve setTimeout

      await Promise.resolve(); // resolve third GET
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
      expect(mockAxios.get).toHaveBeenCalledWith("ntfy_url/v1/health");
      expect(mockLogger.info).toHaveBeenCalledWith("Ntfy health check passed");

      jest.useRealTimers();
    });

    it("should fail health check after maximum attempts", async () => {
      (ntfyService as any).HEALTH_MAX_ATTEMPTS = 3;
      mockAxios.get
        .mockRejectedValueOnce(new Error("some errors"))
        .mockRejectedValueOnce(new Error("some errors"))
        .mockResolvedValueOnce(new Error("some errors"));

      jest.useFakeTimers();

      const promise = (ntfyService as any).healthCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting Ntfy health check..."
      );

      await Promise.resolve(); // resolve first GET
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // resolve setTimeout

      await Promise.resolve(); // resolve second GET
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // resolve setTimeout

      await Promise.resolve(); // resolve third GET
      jest.advanceTimersByTime(4000);
      await Promise.resolve(); // resolve setTimeout

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Ntfy health check failed after maximum attempts"
      );
      await expect(promise).rejects.toThrow("Ntfy health check failed");
    });
  });

  describe("setupEventListeners", () => {
    it("should set up event listeners correctly", () => {
      (ntfyService as any).setupEventListeners();

      expect(mockEventEmitter.on).toHaveBeenCalledWith(
        "startup_success",
        expect.any(Function)
      );
      expect(mockEventEmitter.on).toHaveBeenCalledWith(
        "transaction_detection",
        expect.any(Function)
      );
      expect(mockEventEmitter.on).toHaveBeenCalledWith(
        "balance_report",
        expect.any(Function)
      );
    });
  });

  describe("handleNewTransaction", () => {
    it("should send transaction notification", async () => {
      const mockAnalysis: TransactionAnalysis = {
        txid: "123",
        type: "Received",
        amount: 1,
        status: "Confirmed",
        xpub: "xpub123",
        timestamp: 1234567890,
      };
      jest
        .spyOn(ntfyService as any, "sendTransactionNotification")
        .mockResolvedValue(null);

      await (ntfyService as any).handleNewTransaction(mockAnalysis);

      expect(
        (ntfyService as any).sendTransactionNotification
      ).toHaveBeenCalledWith(mockAnalysis);
    });

    it("should log error if sending notification fails", async () => {
      const mockAnalysis: TransactionAnalysis = {
        txid: "123",
        type: "Received",
        amount: 1,
        status: "Confirmed",
        xpub: "xpub123",
        timestamp: 1234567890,
      };
      jest
        .spyOn(ntfyService as any, "sendTransactionNotification")
        .mockRejectedValue(new Error());

      await (ntfyService as any).handleNewTransaction(mockAnalysis);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to send transaction notification",
        expect.any(Error)
      );
    });
  });

  describe("sendTransactionNotification", () => {
    it("should send transaction notification successfully", async () => {
      const mockAnalysis: TransactionAnalysis = {
        txid: "123",
        type: "Received",
        amount: 1,
        status: "Confirmed",
        xpub: "xpub123",
        timestamp: 1234567890,
      };
      (formatTransaction as jest.Mock).mockReturnValue("Formatted transaction");
      mockAxios.post.mockResolvedValue({});

      await (ntfyService as any).sendTransactionNotification(mockAnalysis);

      expect(mockAxios.post).toHaveBeenCalledWith("", "Formatted transaction", {
        headers: {
          Actions: `view, View on mempool.space, https://mempool.space/tx/123`,
        },
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Transaction notification sent successfully"
      );
    });

    it("should throw error if sending notification fails", async () => {
      const mockAnalysis: TransactionAnalysis = {
        txid: "123",
        type: "Received",
        amount: 1,
        status: "Confirmed",
        xpub: "xpub123",
        timestamp: 1234567890,
      };
      mockAxios.post.mockRejectedValueOnce(new Error());

      await expect(
        (ntfyService as any).sendTransactionNotification(mockAnalysis)
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to send transaction notification",
        expect.any(Error)
      );
    });
  });

  describe("sendMessage", () => {
    it("should send message successfully", async () => {
      mockAxios.post.mockResolvedValueOnce({});

      await (ntfyService as any).sendMessage("Test message");

      expect(mockAxios.post).toHaveBeenCalledWith("", "Test message");
    });

    it("should throw error if sending message fails", async () => {
      mockAxios.post.mockRejectedValueOnce(new Error());

      await expect(
        (ntfyService as any).sendMessage("Test message")
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to send message to ntfy server",
        expect.any(Error)
      );
    });
  });

  describe("sendUtxos", () => {
    it("should send UTXOs successfully", async () => {
      const mockUtxos: Utxos[] = [
        {
          derivationStrategy: "xpub123",
          trackedSource: "xpun123",
          currentHeight: 100,
          confirmed: { utxOs: [], spentOutpoints: [] },
          unconfirmed: { utxOs: [], spentOutpoints: [] },
          spentUnconfirmed: [],
        },
      ];
      (formatUtxos as jest.Mock).mockReturnValueOnce("Formatted UTXOs");
      jest
        .spyOn(ntfyService as any, "sendMessage")
        .mockResolvedValueOnce(undefined);

      await (ntfyService as any).sendUtxos(mockUtxos);

      expect(formatUtxos).toHaveBeenCalledWith(mockUtxos);
      expect((ntfyService as any).sendMessage).toHaveBeenCalledWith(
        "Formatted UTXOs"
      );
    });

    it("should log error if sending UTXOs fails", async () => {
      const mockUtxos: Utxos[] = [
        {
          derivationStrategy: "xpub123",
          trackedSource: "xpun123",
          currentHeight: 100,
          confirmed: { utxOs: [], spentOutpoints: [] },
          unconfirmed: { utxOs: [], spentOutpoints: [] },
          spentUnconfirmed: [],
        },
      ];
      jest
        .spyOn(ntfyService as any, "sendMessage")
        .mockRejectedValueOnce(new Error());

      await (ntfyService as any).sendUtxos(mockUtxos);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to send balance report",
        expect.any(Error)
      );
    });
  });
});
