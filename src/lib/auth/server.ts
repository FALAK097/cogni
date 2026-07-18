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
    appName: "cogni",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
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
