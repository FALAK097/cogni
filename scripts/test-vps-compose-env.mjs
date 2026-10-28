import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const [compose, dockerfile, composeEnv] = await Promise.all([
  readFile(new URL("../docker-compose.yml", import.meta.url), "utf8"),
  readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
  readFile(new URL("../.env.compose.example", import.meta.url), "utf8"),
]);
const worker = compose.match(/  ingestion-worker:\n([\s\S]*?)(?=\n  [\w-]+:|\nvolumes:)/)?.[1];

test("ingestion sidecar receives only the cron secret", () => {
  assert.ok(worker, "ingestion-worker service must exist");
  assert.doesNotMatch(worker, /env_file:\s*\.env(?:\s|$)/);

  const environmentBlock = worker.match(/\n    environment:\n((?:      [^\n]+\n?)+)/)?.[1];
  assert.ok(environmentBlock, "worker must declare an explicit environment block");
  assert.deepEqual(
    environmentBlock
      .trim()
      .split("\n")
      .map((line) => line.trim()),
    ["CRON_SECRET: ${CRON_SECRET:?Set CRON_SECRET in .env}"],
  );
});

test("unprivileged production image starts Next directly without a runtime package install", () => {
  assert.match(dockerfile, /USER cogni/);
  assert.match(dockerfile, /CMD \["node", "node_modules\/next\/dist\/bin\/next", "start"\]/);
  assert.doesNotMatch(dockerfile, /CMD \["pnpm", "start"\]/);
});

test("VPS environment template uses the Compose database service and names required secrets", () => {
  assert.match(composeEnv, /^DATABASE_URL=postgresql:\/\/cogni:[^\n]+@db:5432\/cogni$/m);
  assert.match(composeEnv, /^BETTER_AUTH_SECRET=/m);
  assert.match(composeEnv, /^GOOGLE_CLIENT_ID=/m);
  assert.match(composeEnv, /^GOOGLE_CLIENT_SECRET=/m);
  assert.match(composeEnv, /^CRON_SECRET=/m);
  assert.match(composeEnv, /^CLOUDFLARE_AI_SEARCH_TOKEN=/m);
  assert.match(composeEnv, /^OPENAI_API_KEY=/m);
});
