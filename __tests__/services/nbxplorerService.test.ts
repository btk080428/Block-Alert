import { EventEmitter } from "events";
import WebSocket from "ws";
import axios from "axios";
import { NBXplorerService } from "../../src/services/nbxplorerService";
import { Logger } from "../../src/logger/logger";
import { analyzeTransaction } from "../../src/utils/analyzeUtils";

jest.mock("events");
jest.mock("ws");
jest.mock("axios");
jest.mock("../../src/logger/logger");
jest.mock("../../src/utils/analyzeUtils");

describe("NBXplorerService", () => {
  let nbxplorerService: NBXplorerService;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
  let mockLogger: jest.Mocked<Logger>;
  let mockWebSocket: jest.Mocked<WebSocket>;
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockEventEmitter = new EventEmitter() as jest.Mocked<EventEmitter>;
    mockLogger = new Logger("test") as jest.Mocked<Logger>;
    mockWebSocket = new WebSocket("") as jest.Mocked<WebSocket>;
    (WebSocket as jest.MockedClass<typeof WebSocket>).mockImplementation(
      () => mockWebSocket
    );
    mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.create.mockReturnValue(mockAxios);

    nbxplorerService = new NBXplorerService(
      mockEventEmitter,
      mockLogger,
      "http://127.0.0.1:24446",
      "BTC",
      "xpub1",
      60000,
      "nbx_user",
      "nbx_password"
    );

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("start", () => {
    it("should start the service successfully", async () => {
      jest
        .spyOn(nbxplorerService as any, "healthCheck")
        .mockResolvedValue(true);
      jest.spyOn(nbxplorerService as any, "track").mockResolvedValue(true);

      jest
        .spyOn(nbxplorerService as any, "connectWebSocket")
        .mockResolvedValue(true);
      jest
        .spyOn(nbxplorerService as any, "subscribeEvents")
        .mockResolvedValue(true);
      jest
        .spyOn(nbxplorerService as any, "waitForScanCompletion")
        .mockResolvedValue(true);
      jest
        .spyOn(nbxplorerService as any, "startPeriodicBalanceReport")
        .mockImplementation(() => {});

      await nbxplorerService.start();

      expect((nbxplorerService as any).isRunning).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "NBXplorerService started successfully"
      );
    });

    it("should throw an error if starting fails", async () => {
      jest
        .spyOn(nbxplorerService as any, "healthCheck")
        .mockRejectedValueOnce(new Error());
      await expect(nbxplorerService.start()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to start NBXplorerService",
        expect.any(Error)
      );
    });
  });

  describe("stop", () => {
    it("should stop the service successfully", () => {
      (nbxplorerService as any).isRunning = true;
      (nbxplorerService as any).ws = mockWebSocket;

      nbxplorerService.stop();

      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("NBXplorerService stopped");
    });

    it("should handle an error if stopping fails", () => {
      (nbxplorerService as any).isRunning = true;
      (nbxplorerService as any).ws = mockWebSocket;
      mockWebSocket.close.mockImplementationOnce(() => {
        throw new Error();
      });

      expect(() => nbxplorerService.stop()).toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to stop NBXplorerService",
        expect.any(Error)
      );
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

      await (nbxplorerService as any).healthCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting NBXplorer health check..."
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "NBXplorer health check passed"
      );
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(mockAxios.get).toHaveBeenCalledWith("/status");
    });

    it("should pass health check after retries", async () => {
      mockAxios.get
        .mockRejectedValueOnce(new Error("some errors"))
        .mockRejectedValueOnce(new Error("some errors"))
        .mockResolvedValueOnce({ status: 200 });

      jest.useFakeTimers();

      (nbxplorerService as any).healthCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting NBXplorer health check..."
      );

      await Promise.resolve(); // resolve first GET
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(mockAxios.get).toHaveBeenCalledWith("/status");
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
      expect(mockAxios.get).toHaveBeenCalledWith("/status");
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
      expect(mockAxios.get).toHaveBeenCalledWith("/status");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "NBXplorer health check passed"
      );

      jest.useRealTimers();
    });

    it("should fail health check after maximum attempts", async () => {
      (nbxplorerService as any).HEALTH_MAX_ATTEMPTS = 3;
      mockAxios.get
        .mockRejectedValueOnce(new Error("some errors"))
        .mockRejectedValueOnce(new Error("some errors"))
        .mockResolvedValueOnce(new Error("some errors"));

      jest.useFakeTimers();

      const promise = (nbxplorerService as any).healthCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting NBXplorer health check..."
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
        "NBXplorer health check failed after maximum attempts"
      );
      await expect(promise).rejects.toThrow("NBXplorer health check failed");
    });
  });

  describe("connectWebSocket", () => {
    it("should create a WebSocket connection with correct URL", async () => {
      const connectPromise = (nbxplorerService as any).connectWebSocket();

      const openCallback = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === "open"
      )?.[1] as Function;

      openCallback();

      await connectPromise;

      expect(WebSocket).toHaveBeenCalledWith(
        "http://127.0.0.1:24446/v1/cryptos/BTC/connect",
        {
          headers: {
            Authorization: "Basic bmJ4X3VzZXI6bmJ4X3Bhc3N3b3Jk",
          },
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Connected to NBXplorer WebSocket"
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        "message",
        expect.any(Function)
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        "close",
        expect.any(Function)
      );
    });

    it("should reject if connection fails", async () => {
      const connectPromise = (nbxplorerService as any).connectWebSocket();

      const errorCallback = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === "error"
      )?.[1] as Function;

      const mockErrorEvent = new Error("Connection failed");
      errorCallback(mockErrorEvent);

      await expect(connectPromise).rejects.toThrow("Connection failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error connecting to NBXplorer WebSocket",
        expect.any(Error)
      );
    });
  });

  describe("closeWebSocket", () => {
    it("should close the WebSocket connection if it's open", () => {
      (nbxplorerService as any).ws = mockWebSocket;
      (nbxplorerService as any).closeWebSocket();

      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, "Normal closure");
      expect((nbxplorerService as any).ws).toBeNull();
    });

    it("should do nothing if WebSocket is already null", () => {
      (nbxplorerService as any).closeWebSocket();
      expect(mockWebSocket.close).not.toHaveBeenCalled();
    });
  });

  describe("getTransaction", () => {
    it("should fetch transaction data successfully", async () => {
      const mockTxData = {
        someData: "value",
      };
      mockAxios.get.mockResolvedValue({ data: mockTxData });
      const result = await (nbxplorerService as any).getTransaction(
        "txHash",
        "derivationStrategy"
      );
      expect(result).toEqual(mockTxData);
      expect(mockAxios.get).toHaveBeenCalledWith(
        "/derivations/derivationStrategy/transactions/txHash"
      );
    });

    it("should throw an error if fetching transaction fails", async () => {
      mockAxios.get.mockRejectedValueOnce(new Error());
      await expect(
        (nbxplorerService as any).getTransaction("txHash", "derivationStrategy")
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to get transaction: txHash",
        expect.any(Error)
      );
    });
  });

  describe("track", () => {
    it("should track xpub successfully", async () => {
      mockAxios.post.mockResolvedValue(true);

      await (nbxplorerService as any).track();

      expect(mockAxios.post).toHaveBeenCalledWith("/derivations/xpub1");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Tracked extended public key: xpub1"
      );
    });

    it("should log an error and throw when tracking fails", async () => {
      mockAxios.post.mockRejectedValue(new Error());

      await expect((nbxplorerService as any).track()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to track extended public key: xpub1"
      );
    });
  });

  describe("getUtxos", () => {
    const res = {
      data: {
        trackedSource: "DERIVATIONSCHEME:xpub1",
        derivationStrategy: "xpub1",
        currentHeight: 107,
        unconfirmed: {
          utxOs: [],
          spentOutpoints: [],
          hasChanges: true,
        },
        confirmed: {
          utxOs: [],
          spentOutpoints: [],
          spentUnconfirmed: [],
          hasChanges: true,
        },
      },
    };

    it("should get utxos successfully", async () => {
      mockAxios.get.mockResolvedValue(res);

      const result = await (nbxplorerService as any).getUtxos();

      expect(mockAxios.get).toHaveBeenCalledWith("/derivations/xpub1/utxos");
      expect(result).toEqual(res.data);
    });

    it("should throw an error when getting utxos fails", async () => {
      mockAxios.get.mockRejectedValue(new Error());

      await expect((nbxplorerService as any).getUtxos()).rejects.toThrow();
    });
  });

  describe("scanUtxos", () => {
    const derivationScheme = "xpub1";

    it("should initiate UTXO scan with POST request", async () => {
      const mockResponse = { data: { status: "Queued" } };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await (nbxplorerService as any).scanUtxos(
        derivationScheme,
        "POST"
      );

      expect(mockAxios.post).toHaveBeenCalledWith(
        `/derivations/${derivationScheme}/utxos/scan`
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should get UTXO scan progess with GET request", async () => {
      const mockResponse = {
        data: {
          status: "Pending",
          progress: { overallProgress: 50, remainingSeconds: 30 },
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await (nbxplorerService as any).scanUtxos(
        derivationScheme,
        "GET"
      );

      expect(mockAxios.get).toHaveBeenCalledWith(
        `/derivations/${derivationScheme}/utxos/scan`
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle errors for POST request", async () => {
      mockAxios.post.mockRejectedValue(new Error());

      await expect(
        (nbxplorerService as any).scanUtxos(derivationScheme, "POST")
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to initiate UTXO scan for ${derivationScheme}`,
        expect.any(Error)
      );
    });

    it("should handle errors for POST request", async () => {
      mockAxios.get.mockRejectedValue(new Error());

      await expect(
        (nbxplorerService as any).scanUtxos(derivationScheme, "GET")
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to get progress for UTXO scan for ${derivationScheme}`,
        expect.any(Error)
      );
    });
  });

  describe("waitForScanCompletion", () => {
    const derivationScheme = "xpub1";

    it("should complete scan successfully", async () => {
      const scanUtxosSpy = jest
        .spyOn(nbxplorerService as any, "scanUtxos")
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ status: "Queued" })
        .mockResolvedValueOnce({
          status: "Pending",
          progress: { overallProgress: 50, remainingSeconds: 30 },
        })
        .mockResolvedValueOnce({ status: "Complete" });

      (nbxplorerService as any).waitForScanCompletion(derivationScheme);

      await Promise.resolve(); // resolve initial POST
      await Promise.resolve(); // resolve first GET
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Scan for ${derivationScheme} is queued.`
      );

      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // resolve first setTimeout
      await Promise.resolve(); // resolve second GET
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Scan progress for ${derivationScheme}: Progress: 50%, ETA: 30s`
      );

      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // resolve second setTimeout
      await Promise.resolve(); // resolve third GET
      expect(mockLogger.info).toHaveBeenCalledWith(
        `UTXO scan completed for ${derivationScheme}`
      );

      expect(scanUtxosSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe("subscribeEvents", () => {
    it("should send a subscribe message with correct data", async () => {
      const mockSend = jest.fn((message, callback) => callback());
      (nbxplorerService as any).ws = {
        readyState: WebSocket.OPEN,
        send: mockSend,
      };

      await (nbxplorerService as any).subscribeEvents();

      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: "subscribetransaction",
          data: {
            cryptoCode: "BTC",
            derivationSchemes: ["xpub1"],
          },
        }),
        expect.any(Function)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Subscribed xpub1 to NBXplorer"
      );
    });

    it("should throw an error if WebSocket is not open", async () => {
      (nbxplorerService as any).ws = null;
      await expect((nbxplorerService as any).subscribeEvents()).rejects.toThrow(
        "WebSocket is not open. Cannot subscribe"
      );
    });
  });

  describe("onMessage", () => {
    const mockMessage = JSON.stringify({
      type: "newtransaction",
      data: {
        derivationStrategy: "strategy1",
        transactionData: { transactionHash: "hash123" },
      },
    });
    it("should process new transaction messages correctly", async () => {
      const mockTxData = { transactionHash: "hash123" };
      const analysis = { txid: "hash123", status: "Confirmed" };
      jest
        .spyOn(nbxplorerService as any, "getTransaction")
        .mockResolvedValue(mockTxData);
      (analyzeTransaction as jest.Mock).mockReturnValueOnce(analysis);

      await (nbxplorerService as any).onMessage(mockMessage);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "transaction_detection",
        analysis
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `${analysis.status} transaction detected - txid: ${analysis.txid}`
      );
    });

    it("should handle errors during message processing", async () => {
      jest
        .spyOn(nbxplorerService as any, "getTransaction")
        .mockRejectedValue(new Error());
      await (nbxplorerService as any).onMessage(mockMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to process incoming message",
        expect.any(Error)
      );
    });
  });

  describe("onClose", () => {
    it("should log a warning and attempt reconnect", async () => {
      jest
        .spyOn(nbxplorerService as any, "healthCheck")
        .mockResolvedValue(true);
      jest
        .spyOn(nbxplorerService as any, "connectWebSocket")
        .mockResolvedValue(true);
      jest
        .spyOn(nbxplorerService as any, "subscribeEvents")
        .mockResolvedValue(true);

      await (nbxplorerService as any).onClose(12345, "Some errors");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "WebSocket closed with code 12345. Reason: Some errors"
      );
    });

    it("should emit shudown event if reconnection fails", async () => {
      const error = new Error("some error");
      jest
        .spyOn(nbxplorerService as any, "healthCheck")
        .mockRejectedValue(error);

      await (nbxplorerService as any).onClose(12345, "Some errors");
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "shutdown",
        `Reconnection failed: ${error}`
      );
    });
  });

  describe("startPeriodicBalanceReport", () => {
    it("should start periodic balance reporting", async () => {
      const mockUtxos = { utxos: [] };
      jest
        .spyOn(nbxplorerService as any, "getUtxos")
        .mockResolvedValueOnce(mockUtxos);
      jest.spyOn(global, "setTimeout");

      (nbxplorerService as any).startPeriodicBalanceReport();

      await Promise.resolve();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting periodic balance report"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "UTXOs retrieved successsfully"
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "balance_report",
        mockUtxos
      );
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it("should clear existing timeout before starting a new one", async () => {
      const existingTimeout = setTimeout(() => {}, 1000);
      jest
        .spyOn(nbxplorerService as any, "getUtxos")
        .mockResolvedValueOnce(true);
      jest.spyOn(global, "setTimeout");
      jest.spyOn(global, "clearTimeout");

      (nbxplorerService as any).balanceReportTimeout = existingTimeout;
      (nbxplorerService as any).startPeriodicBalanceReport();

      await Promise.resolve();

      expect(clearTimeout).toHaveBeenCalledWith(existingTimeout);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it("should emit balance_report event on successful UTXO retrieval", async () => {
      const mockUtxos = { utxos: [] };
      jest
        .spyOn(nbxplorerService as any, "getUtxos")
        .mockResolvedValueOnce(mockUtxos);
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");

      (nbxplorerService as any).startPeriodicBalanceReport();

      await Promise.resolve();

      const reportBalance = setTimeoutSpy.mock.calls[0][0];

      await reportBalance();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "UTXOs retrieved successsfully"
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        "balance_report",
        mockUtxos
      );
    });

    it("should handle an error when periodic UTXO retrieval fails", async () => {
      jest
        .spyOn(nbxplorerService as any, "getUtxos")
        .mockRejectedValue(new Error());

      (nbxplorerService as any).startPeriodicBalanceReport();

      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to get UTXOs periodically",
        expect.any(Error)
      );
    });
  });

  describe("stopPeriodicBalanceReport", () => {
    it("should clear the balance report timeout if it exists", () => {
      const existingTimeout = setTimeout(() => {}, 1000);
      (nbxplorerService as any).balanceReportTimeout = existingTimeout;
      jest.spyOn(global, "clearTimeout");

      (nbxplorerService as any).stopPeriodicBalanceReport();

      expect(clearTimeout).toHaveBeenCalledWith(existingTimeout);
      expect((nbxplorerService as any).balanceReportTimeout).toBeNull();
    });

    it("should do nothing if balanceReportTimeout is already null", () => {
      (nbxplorerService as any).balanceReportTimeout = null;
      jest.spyOn(global, "clearTimeout");

      (nbxplorerService as any).stopPeriodicBalanceReport();

      expect(clearTimeout).not.toHaveBeenCalled();
      expect((nbxplorerService as any).balanceReportTimeout).toBeNull();
    });
  });
});
