import { LogLevel, LogEntry } from "../types/interfaces";

export class Logger {
  private static globalLogLevel: LogLevel = LogLevel.INFO;

  constructor(private context: string) {}

  static setGlobalLogLevel(level: LogLevel) {
    Logger.globalLogLevel = level;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, context, message, meta } = entry;
    let formattedMessage = `[${timestamp}] [${LogLevel[level]}] [${context}] ${message}`;
    if (meta) {
      formattedMessage += ` ${JSON.stringify(meta, this.errorReplacer)}`;
    }
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, meta?: any) {
    if (level <= Logger.globalLogLevel) {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        meta,
      };
      console.log(this.formatLogEntry(entry));
    }
  }

  private errorReplacer(key: string, value: any): any {
    if (value instanceof Error) {
      return {
        message: value.message,
        name: value.name,
        stack: value.stack,
        ...Object.getOwnPropertyNames(value).reduce((acc, prop) => {
          acc[prop] = (value as any)[prop];
          return acc;
        }, {} as Record<string, any>),
      };
    }

    return value;
  }

  public error(message: string, meta?: any) {
    this.log(LogLevel.ERROR, message, meta);
  }

  public warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  }

  public info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }

  public debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, meta);
  }
}
