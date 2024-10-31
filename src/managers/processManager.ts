import { Logger } from "../logger/logger";
import { NBXplorerService } from "../services/nbxplorerService";
import { NtfyService } from "../services/ntfyService";
import EventEmitter from "events";

export class ProcessManager {
  private eventEmitter: EventEmitter;
  private logger: Logger;
  private isRunning: boolean = false;

  constructor(
    eventEmitter: EventEmitter,
    logger: Logger,
    private nbxplorerService: NBXplorerService,
    private ntfyService: NtfyService
  ) {
    this.eventEmitter = eventEmitter;
    this.logger = logger;
    this.nbxplorerService = nbxplorerService;
    this.ntfyService = ntfyService;
  }

  public async start(): Promise<void> {
    try {
      if (this.isRunning) {
        this.logger.warn("ProcessManager is already running");
        return;
      }

      this.isRunning = true;
      this.setupEventListeners();

      this.logger.info("Starting all services...");
      await this.ntfyService.start();
      await this.nbxplorerService.start();

      this.eventEmitter.emit("startup_success");
      this.logger.info("Application started successfully");
    } catch (error) {
      this.logger.error("Error occurred during startup", error);
      this.shutdown("Startup failure");
    }
  }

  private setupEventListeners(): void {
    this.eventEmitter.on("shutdown", (reason: string) => this.shutdown(reason));
    process.on("SIGINT", () => this.shutdown("SIGINT received"));
    process.on("SIGTERM", () => this.shutdown("SIGTERM received"));
  }

  private shutdown(reason: string): void {
    if (!this.isRunning) {
      this.logger.warn("ProcessManager is not running");
      return;
    }

    this.logger.info(`Initiating shutdown: ${reason}`);
    try {
      this.eventEmitter.removeAllListeners("shutdown");
      process.removeAllListeners("SIGINT");
      process.removeAllListeners("SIGTERM");
      this.nbxplorerService.stop();
      this.ntfyService.stop();
      this.logger.info("All services stopped successfully");
      process.exit(0);
    } catch (error) {
      this.logger.error("Error occurred during shutdown", error);
      process.exit(1);
    }
  }
}
