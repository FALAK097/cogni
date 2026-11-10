import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";

import { ensureDefaultWorkspace } from "@/lib/auth/provision-workspace";
import { getDb } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import * as schema from "@/lib/db/schema";

function createAuth() {
  const db = getDb();

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  return betterAuth({
    appName: "cogni",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    emailAndPassword: {
      enabled:
        process.env.NODE_ENV !== "production" ||
        process.env.LOCAL_DEV_EMAIL_PASSWORD_AUTH === "true",
      requireEmailVerification: false,
      async sendResetPassword({ user, url }) {
        console.log(`[Better Auth Local Fallback] Reset password URL for ${user.email}: ${url}`);
      },
    },
    emailVerification: {
      async sendVerificationEmail({ user, url }) {
        console.log(`[Better Auth Local Fallback] Verification URL for ${user.email}: ${url}`);
      },
    },
    socialProviders,
    trustedOrigins: [env.BETTER_AUTH_URL, "http://localhost:3000", "http://127.0.0.1:3000"].filter(
      Boolean,
    ),
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      cookiePrefix: "ba",
      defaultCookieAttributes: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true,
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await ensureDefaultWorkspace(db, user);
          },
        },
      },
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  auth ??= createAuth();
  return auth;
}
