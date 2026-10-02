import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test, { after } from "node:test";
import { build } from "esbuild";
import { randomBytes, randomUUID } from "node:crypto";

process.env.SKIP_ENV_VALIDATION ??= "true";
process.env.BETTER_AUTH_SECRET ??= randomBytes(32).toString("hex");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Rate-limit integration tests require a local DATABASE_URL.");
}

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-rate-limit-test");
const outputFile = join(outputDirectory, "shared.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export { checkRateLimits, pruneExpiredRateLimitBuckets } from "@/lib/rate-limit/shared";
      export { getDb } from "@/lib/db/client";
    `,
    resolveDir: process.cwd(),
    sourcefile: "rate-limit-test-entry.ts",
  },
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "server-only-test-stub",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "server-only-test-stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});

const { checkRateLimits, getDb, pruneExpiredRateLimitBuckets } = await import(
  `${pathToFileURL(outputFile).href}?build=${randomUUID()}`
);

after(async () => {
  await getDb().$client.end({ timeout: 5 });
});

test("parallel requests cannot exceed a shared limit", async () => {
  const prefix = randomUUID();
  const results = await Promise.all(
    Array.from({ length: 40 }, () =>
      checkRateLimits([{ key: `test:parallel:${prefix}`, limit: 7, windowMs: 60_000 }]),
    ),
  );

  assert.equal(results.filter((result) => result.allowed).length, 7);
  const denied = results.filter((result) => !result.allowed);
  assert.equal(denied.length, 33);
  assert.ok(denied.every((result) => "retryAfterMs" in result && result.retryAfterMs > 0));
});

test("workspace budgets are shared across visitor keys", async () => {
  const prefix = randomUUID();
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      checkRateLimits([
        { key: `test:workspace:${prefix}`, limit: 3, windowMs: 60_000 },
        { key: `test:visitor:${prefix}:${index}`, limit: 10, windowMs: 60_000 },
      ]),
    ),
  );

  assert.equal(results.filter((result) => result.allowed).length, 3);
});

test("expired fixed windows reset and old buckets are pruned", async () => {
  const key = `test:expiry:${randomUUID()}`;
  const first = await checkRateLimits([{ key, limit: 1, windowMs: 20 }]);
  assert.equal(first.allowed, true);

  await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 40));
  const second = await checkRateLimits([{ key, limit: 1, windowMs: 20 }]);
  assert.equal(second.allowed, true);

  await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 40));
  assert.ok((await pruneExpiredRateLimitBuckets(0)) >= 1);
});

test("database errors fail closed", () => {
  const script = `
    import assert from "node:assert/strict";
    import { checkRateLimits } from ${JSON.stringify(pathToFileURL(outputFile).href)};
    const result = await checkRateLimits([{ key: "test:database-outage", limit: 1, windowMs: 1000 }]);
    assert.deepEqual(result, { allowed: false, remaining: 0, unavailable: true });
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
    timeout: 30_000,
    env: {
      ...process.env,
      DATABASE_URL: "postgres://postgres@127.0.0.1:55433/cogni_test",
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
