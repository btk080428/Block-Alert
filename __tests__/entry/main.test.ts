import EventEmitter from "events";
import * as factories from "../../src/factories/factories";
import { main } from "../../src/main";

let mockMainLogger = {
  info: jest.fn(),
  error: jest.fn(),
};
let mockEventEmitter = new (require("events").EventEmitter)();
let mockProcessManager = {
  start: jest.fn(),
};

jest.mock("../../src/factories/factories", () => {
  return {
    createLogger: jest.fn(() => mockMainLogger),
    createEventEmitter: jest.fn(() => mockEventEmitter),
    createNBXplorerService: jest.fn(() => ({})),
    createNtfyService: jest.fn(() => ({})),
    createProcessManager: jest.fn(() => mockProcessManager),
  };
});

jest.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit called");
});

describe("main", () => {
  it("should initialize and start the application successfully", async () => {
    mockProcessManager.start.mockResolvedValue(true);

    await main();

    expect(factories.createLogger).toHaveBeenCalledTimes(4);
    expect(factories.createLogger).toHaveBeenCalledWith("Main");
    expect(factories.createLogger).toHaveBeenCalledWith("NBXplorerService");
    expect(factories.createLogger).toHaveBeenCalledWith("NtfyService");
    expect(factories.createLogger).toHaveBeenCalledWith("ProcessManager");

    expect(factories.createEventEmitter).toHaveBeenCalled();

    expect(factories.createNBXplorerService).toHaveBeenCalledWith(
      mockEventEmitter,
      mockMainLogger
    );
    expect(factories.createNtfyService).toHaveBeenCalledWith(
      mockEventEmitter,
      mockMainLogger
    );
    expect(factories.createProcessManager).toHaveBeenCalledWith(
      mockEventEmitter,
      mockMainLogger,
      {},
      {}
    );

    expect(mockMainLogger.info).toHaveBeenCalledWith(
      "Initializing Application"
    );
    expect(mockProcessManager.start).toHaveBeenCalled();

    expect(mockMainLogger.error).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("should log an error and exit if an error occurs during startup", async () => {
    const startupError = new Error("Startup failed");
    mockProcessManager.start.mockRejectedValue(startupError);

    await expect(main()).rejects.toThrow("process.exit called");

    expect(mockMainLogger.error).toHaveBeenCalledWith(
      "Error occurred during startup",
      startupError
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
