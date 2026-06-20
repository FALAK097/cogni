import "server-only";

import { env } from "@/lib/env/server";
import { logError } from "@/lib/logging/logger";

export function captureException(
  error: unknown,
  context: Record<string, string | number | boolean | null | undefined> = {},
) {
  logError("error.captured", {
    ...context,
    sentryEnabled: Boolean(env.SENTRY_DSN),
    message: error instanceof Error ? error.message : "Unknown error",
  });
}
