import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
    CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
    D1_DATABASE_ID: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    VECTORIZE_INDEX: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    VERCEL_TOKEN: z.string().min(1).optional(),
    VERCEL_CONNECT_SECRET: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});

export function getD1Config() {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const databaseId = env.D1_DATABASE_ID;
  if (!accountId && !apiToken && !databaseId) {
    return null;
  }

  if (!accountId || !apiToken || !databaseId) {
    return null;
  }

  return {
    accountId,
    apiToken,
    databaseId,
  };
}
