import { z } from "zod";

const serverEnvShape = {
  ENV: z.enum(["development", "production"]),
  DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  LOCAL_DEV_EMAIL_PASSWORD_AUTH: z.string().optional(),
  UPLOAD_STORAGE: z.enum(["local", "r2"]).optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_AI_SEARCH_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_INGESTION_QUEUE_URL: z.url().optional(),
  INGESTION_SHARED_SECRET: z.string().min(32).optional(),
  INGESTION_RECLAIM_STALE: z.enum(["true", "false"]).default("true"),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  SEARCH_INDEX: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  COMPOSIO_API_KEY: z.string().min(1).optional(),
  COMPOSIO_WEBHOOK_SECRET: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
  DISCORD_BOT_TOKEN: z.string().min(1).optional(),
  DISCORD_PUBLIC_KEY: z.string().min(1).optional(),
  DISCORD_BOT_PERMISSIONS: z.string().regex(/^\d+$/).default("274878221376"),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(3).optional(),
  RESEND_REPLY_TO: z.email().default("hi@falakgala.dev"),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  WIDGET_MODEL_PROVIDER: z.enum(["OPENAI", "GOOGLE"]).optional(),
  WIDGET_MODEL_NAME: z.string().optional(),
};

const serverEnvSchema = z.object(serverEnvShape);

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const skipValidationDefaults: Partial<Record<keyof ServerEnv, string>> = {
  INGESTION_RECLAIM_STALE: "true",
  DISCORD_BOT_PERMISSIONS: "274878221376",
  RESEND_REPLY_TO: "hi@falakgala.dev",
};

function readRawRuntimeEnv(): Record<string, string | undefined> {
  const cfContext = (
    globalThis as unknown as Record<symbol, { env?: Record<string, unknown> } | undefined>
  )[Symbol.for("__cloudflare-context__")];
  const merged: Record<string, string | undefined> = {};

  if (cfContext?.env) {
    for (const [key, value] of Object.entries(cfContext.env)) {
      if (typeof value === "string" && value !== "") {
        merged[key] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value !== "" && merged[key] === undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

function resolveValidatedEnv(): ServerEnv {
  const raw = readRawRuntimeEnv();
  if (raw.SKIP_ENV_VALIDATION ?? process.env.SKIP_ENV_VALIDATION) {
    const partial: Record<string, string | undefined> = { ...skipValidationDefaults };
    for (const key of Object.keys(serverEnvShape)) {
      if (raw[key] !== undefined) {
        partial[key] = raw[key];
      }
    }
    return partial as ServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.issues);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, property) {
    if (typeof property !== "string" || !(property in serverEnvShape)) {
      return undefined;
    }
    return resolveValidatedEnv()[property as keyof ServerEnv];
  },
  has(_target, property) {
    return typeof property === "string" && property in serverEnvShape;
  },
  ownKeys() {
    return Object.keys(serverEnvShape);
  },
  getOwnPropertyDescriptor(_target, property) {
    if (typeof property !== "string" || !(property in serverEnvShape)) {
      return undefined;
    }
    return {
      configurable: true,
      enumerable: true,
      writable: false,
      value: resolveValidatedEnv()[property as keyof ServerEnv],
    };
  },
});
