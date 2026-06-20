#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const required = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "D1_DATABASE_ID"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Set Cloudflare D1 credentials before deploying.`);
    process.exit(1);
  }
}

process.env.ENV = "production";

const deploy = spawnSync("pnpm", ["db:deploy"], { stdio: "inherit", shell: true });
if (deploy.status !== 0) {
  process.exit(deploy.status ?? 1);
}

const generate = spawnSync("pnpm", ["db:generate"], { stdio: "inherit", shell: true });
process.exit(generate.status ?? 0);
