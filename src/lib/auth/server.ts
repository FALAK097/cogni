import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";

import { ensureDefaultWorkspace } from "@/lib/auth/provision-workspace";
import { getDb } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import * as schema from "@/lib/db/schema";

function createAuth() {
  const db = getDb();

  return betterAuth({
    appName: "widget",
    baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: env.BETTER_AUTH_SECRET ?? "build-only-secret-not-valid-at-runtime",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "build-only-google-client-id",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "build-only-google-client-secret",
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
