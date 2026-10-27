import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const compiled = await build({
  entryPoints: [resolve("src/lib/db/document-lock-config.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const lockConfig = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("document advisory locks use the direct Neon connection when configured", () => {
  assert.equal(
    lockConfig.resolveDocumentLockDatabaseUrl(
      "postgres://app:secret@ep-example-pooler.us-east-1.aws.neon.tech/app",
      "postgres://app:secret@ep-example.us-east-1.aws.neon.tech/app",
    ),
    "postgres://app:secret@ep-example.us-east-1.aws.neon.tech/app",
  );
});

test("document advisory locks reject Neon pooling without a direct connection", () => {
  assert.throws(
    () =>
      lockConfig.resolveDocumentLockDatabaseUrl(
        "postgres://app:secret@ep-example-pooler.us-east-1.aws.neon.tech/app",
        undefined,
      ),
    /DATABASE_URL_UNPOOLED is required.*Neon pooling/,
  );
});

test("document advisory locks use DATABASE_URL for local and VPS PostgreSQL", () => {
  const databaseUrl = "postgres://app:secret@db.internal:5432/app";
  assert.equal(lockConfig.resolveDocumentLockDatabaseUrl(databaseUrl, undefined), databaseUrl);
});
