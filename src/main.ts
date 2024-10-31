import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({
  path: path.resolve(__dirname, `../.env`),
});

import {
  createLogger,
  createEventEmitter,
  createNBXplorerService,
  createNtfyService,
  createProcessManager,
} from "./factories/factories";

export async function main(): Promise<void> {
  const eventEmitter = createEventEmitter();

  const mainLogger = createLogger("Main");
  const nbxLogger = createLogger("NBXplorerService");
  const ntfyLogger = createLogger("NtfyService");
  const processLogger = createLogger("ProcessManager");

  const nbxplorerService = createNBXplorerService(eventEmitter, nbxLogger);
  const ntfyService = createNtfyService(eventEmitter, ntfyLogger);
  const processManager = createProcessManager(
    eventEmitter,
    processLogger,
    nbxplorerService,
    ntfyService
  );

  try {
    mainLogger.info("Initializing Application");
    await processManager.start();
  } catch (error) {
    mainLogger.error("Error occurred during startup", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error("Unhandled error in main function", error);
    process.exit(1);
  });
}
