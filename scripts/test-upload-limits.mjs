import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/widget/upload-limits.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const limits = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("rejects known multipart bodies above the file limit plus bounded form overhead", () => {
  assert.equal(limits.isOversizedUploadRequest(String(limits.MAX_UPLOAD_REQUEST_BYTES + 1)), true);
  assert.equal(limits.isOversizedUploadRequest(String(limits.MAX_UPLOAD_REQUEST_BYTES)), false);
});

test("does not treat absent lengths as oversized and rejects malformed or unbounded values", () => {
  assert.equal(limits.isOversizedUploadRequest(null), false);
  assert.equal(limits.isOversizedUploadRequest("unknown"), true);
  assert.equal(limits.isOversizedUploadRequest("9".repeat(400)), true);
});
