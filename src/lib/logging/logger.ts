/**
 * Structured JSON logger for Korva.
 * Outputs structured logs in production, readable logs in development.
 * Compatible with Vercel log drains and any JSON-based log aggregator.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  /** User ID performing the action */
  userId?: string;
  /** Store ID being accessed */
  storeId?: string;
  /** HTTP method */
  method?: string;
  /** Request path */
  path?: string;
  /** HTTP status code */
  status?: number;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Error object */
  error?: Error | unknown;
  /** Any additional metadata */
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      error_name: err.name,
      error_message: err.message,
      error_stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    };
  }
  return { error_message: String(err) };
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (!shouldLog(level)) return;

  const { error, ...rest } = context;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "korva",
    ...rest,
    ...(error ? formatError(error) : {}),
  };

  const isProduction = process.env.NODE_ENV === "production";

  // Capture errors to Sentry when available
  if (level === "error" && error) {
    try {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
          extra: rest,
        });
      }).catch(() => {
        // Sentry not available — no-op
      });
    } catch {
      // Dynamic import not supported in this context — no-op
    }
  }

  if (isProduction) {
    // JSON output for log aggregators
    const output = JSON.stringify(entry);
    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    // Human-readable output for development
    const prefix = `[${level.toUpperCase()}]`;
    const contextStr = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
    const errorStr = error ? ` | ${formatError(error).error_message}` : "";
    if (level === "error") {
      console.error(`${prefix} ${message}${contextStr}${errorStr}`);
    } else if (level === "warn") {
      console.warn(`${prefix} ${message}${contextStr}${errorStr}`);
    } else {
      console.log(`${prefix} ${message}${contextStr}${errorStr}`);
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),

  /**
   * Create a child logger with preset context (e.g., userId, storeId).
   */
  child: (defaultContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      emit("debug", message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      emit("info", message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      emit("warn", message, { ...defaultContext, ...context }),
    error: (message: string, context?: LogContext) =>
      emit("error", message, { ...defaultContext, ...context }),
  }),
};

/**
 * Measures execution time and logs it.
 */
export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.info(label, { ...context, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    logger.error(label, { ...context, durationMs: Date.now() - start, error });
    throw error;
  }
}
