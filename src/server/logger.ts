import "server-only";

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 99,
} as const;

type Level = Exclude<keyof typeof LEVELS, "silent">;
type Fields = Record<string, unknown>;

// Anything whose name suggests personal or secret data is replaced, whatever the caller passes.
const SENSITIVE_KEY =
  /pass(word)?|token|secret|authorization|cookie|session|e-?mail|phone|card|iban|address|api[-_]?key|otp|totp/i;
const MAX_STRING = 500;
const MAX_DEPTH = 3;

function threshold(): number {
  const configured = process.env.LOG_LEVEL as keyof typeof LEVELS | undefined;
  return configured && configured in LEVELS ? LEVELS[configured] : LEVELS.info;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  }
  const result: Fields = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key)
      ? "[redacted]"
      : sanitize(item, depth + 1);
  }
  return result;
}

/**
 * Turns an error into loggable fields. It keeps the name, a short message, the
 * error code and the stack, but never the database `detail` text, which can
 * contain customer data.
 */
export function serializeError(error: unknown): Fields {
  if (!(error instanceof Error)) return { value: sanitize(String(error)) };
  const code = (error as { code?: unknown }).code;
  return {
    name: error.name,
    message: sanitize(error.message),
    ...(typeof code === "string" || typeof code === "number" ? { code } : {}),
    stack: error.stack,
  };
}

function write(level: Level, message: string, fields?: Fields): void {
  if (LEVELS[level] < threshold()) return;
  const line = JSON.stringify({
    ...(sanitize(fields ?? {}) as Fields),
    time: new Date().toISOString(),
    level,
    msg: message,
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

/** One JSON object per line, easy to search and ship to a log service later. */
export const logger = {
  debug: (message: string, fields?: Fields) => write("debug", message, fields),
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
