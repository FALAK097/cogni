import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const isProd = process.env.NODE_ENV === "production" || process.env.ENV === "production";

// Create a proxy for the runtime environment to support dynamic lookup of Cloudflare bindings/secrets
const runtimeEnv = new Proxy({} as Record<string, string | undefined>, {
  get(_, prop) {
    if (typeof prop !== "string") return undefined;

    // 1. Check process.env first (for local dev, build, etc.)
    if (process.env[prop] !== undefined) {
      return process.env[prop];
    }

    // 2. Check Cloudflare context env (for production/preview worker at request time)
    try {
      const cfEnv = getCloudflareContext().env as Record<string, unknown>;
      if (cfEnv && cfEnv[prop] !== undefined) {
        return String(cfEnv[prop]);
      }
    } catch {
      // Ignored: getCloudflareContext may fail during build or worker startup outside of requests
    }

    return undefined;
  },
});

export const env = createEnv({
  server: {
    ENV: z.enum(["development", "production"]),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
    CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
    CLOUDFLARE_AI_SEARCH_TOKEN: z.string().min(1).optional(),
    D1_DATABASE_ID: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    SEARCH_INDEX: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: runtimeEnv,
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION) || isProd,
});
