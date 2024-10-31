import { Logger } from "../logger/logger";
import { NBXplorerService } from "../services/nbxplorerService";
import { NtfyService } from "../services/ntfyService";
import { ProcessManager } from "../managers/processManager";
import { config } from "../config/config";
import EventEmitter from "events";

export function createLogger(name: string): Logger {
  return new Logger(name);
}

export function createEventEmitter(): EventEmitter {
  return new EventEmitter();
}

export function createNBXplorerService(
  eventEmitter: EventEmitter,
  logger: Logger
): NBXplorerService {
  return new NBXplorerService(
    eventEmitter,
    logger,
    config.nbx.nbxUrl,
    config.nbx.cryptoCode,
    config.nbx.extendedPubKey,
    config.nbx.balanceReportInterval,
    config.nbx.nbxUser || null,
    config.nbx.nbxPassword || null
  );
}

export function createNtfyService(
  eventEmitter: EventEmitter,
  logger: Logger
): NtfyService {
  return new NtfyService(
    eventEmitter,
    logger,
    config.ntfy.ntfyUrl,
    config.ntfy.topic,
    config.ntfy.ntfyUser || null,
    config.ntfy.ntfyPassword || null
  );
}

export function createProcessManager(
  eventEmitter: EventEmitter,
  logger: Logger,
  nbxplorerService: NBXplorerService,
  ntfyService: NtfyService
): ProcessManager {
  return new ProcessManager(
    eventEmitter,
    logger,
    nbxplorerService,
    ntfyService
  );
}
