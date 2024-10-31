import {
  createLogger,
  createEventEmitter,
  createNBXplorerService,
  createNtfyService,
  createProcessManager,
} from "../../src/factories/factories";

import { Logger } from "../../src/logger/logger";
import { NBXplorerService } from "../../src/services/nbxplorerService";
import { NtfyService } from "../../src/services/ntfyService";
import { ProcessManager } from "../../src/managers/processManager";
import { config } from "../../src/config/config";
import EventEmitter from "events";

jest.mock("../../src/logger/logger");
jest.mock("../../src/services/nbxplorerService");
jest.mock("../../src/services/ntfyService");
jest.mock("../../src/managers/processManager");
jest.mock("../../src/config/config", () => ({
  config: {
    nbx: {
      nbxUrl: "http://127.0.0.1:24444",
      cryptoCode: "BTC",
      extendedPubKey: "xpub...",
      balanceReportInterval: 3600000,
      nbxUser: "nbx_user",
      nbxPassword: "nbx_password",
    },
    ntfy: {
      ntfyUrl: "http://127.0.0.1:80",
      topic: "ntfy_topic",
      ntfyUser: "ntfy_user",
      ntfyPassword: "ntfy_password",
    },
  },
}));

describe("factories", () => {
  describe("createLogger", () => {
    it("should create Logger instance", () => {
      const name = "Logger";
      const logger = createLogger(name);

      expect(logger).toBeInstanceOf(Logger);
      expect(Logger).toHaveBeenCalledWith(name);
    });
  });

  describe("createEventEmitter", () => {
    it("should create EventEmmiter instance", () => {
      const eventEmitter = createEventEmitter();

      expect(eventEmitter).toBeInstanceOf(EventEmitter);
    });
  });

  describe("createNBXplorerService", () => {
    it("should create NBXplorerService instance", () => {
      const logger = new Logger("NBXplorerService");
      const eventEmitter = new EventEmitter();

      const nbxplorerService = createNBXplorerService(eventEmitter, logger);

      expect(nbxplorerService).toBeInstanceOf(NBXplorerService);
      expect(NBXplorerService).toHaveBeenCalledWith(
        eventEmitter,
        logger,
        config.nbx.nbxUrl,
        config.nbx.cryptoCode,
        config.nbx.extendedPubKey,
        config.nbx.balanceReportInterval,
        config.nbx.nbxUser,
        config.nbx.nbxPassword
      );
    });
  });

  describe("createNtfyService", () => {
    it("should create NtfyService instance", () => {
      const logger = new Logger("NtfyService");
      const eventEmitter = new EventEmitter();

      const ntfyService = createNtfyService(eventEmitter, logger);

      expect(ntfyService).toBeInstanceOf(NtfyService);
      expect(NtfyService).toHaveBeenCalledWith(
        eventEmitter,
        logger,
        config.ntfy.ntfyUrl,
        config.ntfy.topic,
        "ntfy_user",
        "ntfy_password"
      );
    });
  });

  describe("createProcessManager", () => {
    it("should create ProcessManager instance", () => {
      const logger = new Logger("ProcessManager");
      const eventEmitter = new EventEmitter();

      const mockNBXplorerService = new NBXplorerService(
        eventEmitter,
        logger,
        config.nbx.nbxUrl,
        config.nbx.cryptoCode,
        config.nbx.extendedPubKey,
        config.nbx.balanceReportInterval,
        "nbx_user",
        "nbx_password"
      );
      const mockNtfyService = new NtfyService(
        eventEmitter,
        logger,
        config.ntfy.ntfyUrl,
        config.ntfy.topic,
        "ntfy_user",
        "ntfy_password"
      );

      const processManager = createProcessManager(
        eventEmitter,
        logger,
        mockNBXplorerService,
        mockNtfyService
      );

      expect(processManager).toBeInstanceOf(ProcessManager);
      expect(ProcessManager).toHaveBeenCalledWith(
        eventEmitter,
        logger,
        mockNBXplorerService,
        mockNtfyService
      );
    });
  });
});
