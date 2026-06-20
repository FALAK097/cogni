import "server-only";

type LogContext = Record<string, string | number | boolean | null | undefined>;

function baseContext(context: LogContext) {
  return {
    timestamp: new Date().toISOString(),
    ...context,
  };
}

export function logInfo(event: string, context: LogContext = {}) {
  console.info(
    JSON.stringify({
      level: "info",
      event,
      ...baseContext(context),
    }),
  );
}

export function logError(event: string, context: LogContext = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...baseContext(context),
    }),
  );
}
