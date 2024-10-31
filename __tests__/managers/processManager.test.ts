import { ProcessManager } from "../../src/managers/processManager";
import { NtfyService } from "../../src/services/ntfyService";
import { NBXplorerService } from "../../src/services/nbxplorerService";
import { Logger } from "../../src/logger/logger";
import EventEmitter from "events";

jest.mock("../../src/services/nbxplorerService");
jest.mock("../../src/services/ntfyService");
jest.mock("../../src/logger/logger");
jest.mock("events");

describe("ProcessManager", () => {
  let processManager: ProcessManager;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
  let mockLogger: jest.Mocked<Logger>;
  let mockNBXplorerService: jest.Mocked<NBXplorerService>;
  let mockNtfyService: jest.Mocked<NtfyService>;

  beforeEach(() => {
    mockLogger = new Logger("test") as jest.Mocked<Logger>;
    mockEventEmitter = new EventEmitter() as jest.Mocked<EventEmitter>;

    mockNBXplorerService = {
      start: jest.fn(),
      stop: jest.fn(),
    } as unknown as jest.Mocked<NBXplorerService>;

    mockNtfyService = {
      start: jest.fn(),
      stop: jest.fn(),
    } as unknown as jest.Mocked<NtfyService>;

    processManager = new ProcessManager(
      mockEventEmitter,
      mockLogger,
      mockNBXplorerService,
      mockNtfyService
    );

    jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("start", () => {
    it("should create services and setup event listeners ", async () => {
      jest.spyOn(processManager as any, "setupEventListeners");
      await processManager.start();

      expect(mockNBXplorerService.start).toHaveBeenCalled();
      expect(mockNtfyService.start).toHaveBeenCalled();
      expect((processManager as any).setupEventListeners).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Application started successfully"
      );
    });

    it("should log error and exec shutdown if an error occurs", async () => {
      mockNBXplorerService.start.mockRejectedValue(new Error());
      jest.spyOn(processManager as any, "shutdown");

      await processManager.start();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error occurred during startup",
        expect.any(Error)
      );
      expect((processManager as any).shutdown).toHaveBeenCalled();
    });
  });

  describe("setupEventListeners", () => {
    it("should set up event listeners", () => {
      jest.spyOn(process, "on");
      (processManager as any).setupEventListeners();

      expect(mockEventEmitter.on).toHaveBeenCalledWith(
        "shutdown",
        expect.any(Function)
      );
      expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    });
  });

  describe("shutdown", () => {
    it("should stop services and exit with code 0 on success", async () => {
      (processManager as any).isRunning = true;
      (processManager as any).shutdown();

      expect(mockNBXplorerService.stop).toHaveBeenCalled();
      expect(mockNtfyService.stop).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("should exit with code 1 on error", async () => {
      mockNBXplorerService.stop.mockImplementation(() => {
        throw new Error();
      });
      (processManager as any).isRunning = true;
      (processManager as any).shutdown();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error occurred during shutdown",
        expect.any(Error)
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
