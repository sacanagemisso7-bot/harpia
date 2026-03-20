type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = {
  message: string;
  area?: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
};

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return error;
}

function writeLog(level: LogLevel, payload: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    area: payload.area ?? "app",
    message: payload.message,
    error: payload.error ? normalizeError(payload.error) : undefined,
    metadata: payload.metadata ?? undefined
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(message: string, metadata?: Record<string, unknown>, area?: string) {
  writeLog("info", { message, metadata, area });
}

export function logWarn(message: string, metadata?: Record<string, unknown>, area?: string) {
  writeLog("warn", { message, metadata, area });
}

export function logError(message: string, error?: unknown, metadata?: Record<string, unknown>, area?: string) {
  writeLog("error", { message, error, metadata, area });
}
