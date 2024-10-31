import { Logger } from "../../src/logger/logger";
import { LogEntry, LogLevel } from "../../src/types/interfaces";

describe("Logger", () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger("Test");
    consoleLogSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    Logger.setGlobalLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("setGlobalLogLevel", () => {
    it("should set the global log level", () => {
      Logger.setGlobalLogLevel(LogLevel.ERROR);
      expect((Logger as any).globalLogLevel).toBe(0);
    });
  });

  describe("log methods", () => {
    it("should log error messages", () => {
      logger.error("Error message");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR] [Test] Error message")
      );
    });

    it("should log warn messages", () => {
      logger.warn("Warning message");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[WARN] [Test] Warning message")
      );
    });

    it("should log info messages", () => {
      logger.info("Info message");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[INFO] [Test] Info message")
      );
    });

    it("should debug info messages", () => {
      logger.debug("Debug message");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG] [Test] Debug message")
      );
    });
  });

  describe("meta logging", () => {
    it("should log meta infomation", () => {
      const meta = { key: "value" };
      logger.info("Info with meta", meta);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"key":"value"')
      );
    });

    it("should log an error in meta", () => {
      const error = new Error("Test error");
      logger.error("Error with meta", error);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test error"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name":"Error"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"stack":')
      );
    });
  });

  describe("formatLogEntry", () => {
    it("should format log entries correctly", () => {
      const entry: LogEntry = {
        timestamp: "2023-08-01T12:34:56.789Z",
        level: LogLevel.INFO,
        context: "Test",
        message: "Test message",
        meta: { key: "value" },
      };
      const formattedEntry = (logger as any).formatLogEntry(entry);
      expect(formattedEntry).toBe(
        '[2023-08-01T12:34:56.789Z] [INFO] [Test] Test message {"key":"value"}'
      );
    });
  });
});
