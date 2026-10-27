import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const compose = await readFile(new URL("../docker-compose.yml", import.meta.url), "utf8");
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
