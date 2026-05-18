// ============================================================
// logging.ts — Structured JSON logger (F-010)
// ============================================================

type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  [key: string]: unknown;
}

function formatLog(
  level: LogLevel,
  event: string,
  message: string,
  extra?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    ...extra,
  };
}

function writeLog(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "ERROR") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  info(event: string, message: string, extra?: Record<string, unknown>): void {
    writeLog(formatLog("INFO", event, message, extra));
  },

  warn(event: string, message: string, extra?: Record<string, unknown>): void {
    writeLog(formatLog("WARN", event, message, extra));
  },

  error(event: string, message: string, extra?: Record<string, unknown>): void {
    writeLog(formatLog("ERROR", event, message, extra));
  },
};
