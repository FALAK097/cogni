import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/auth/return-path.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const returnPath = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("preserves a same-origin invite return path, query, and hash", () => {
  assert.equal(
    returnPath.safeReturnPath("/invite/secure-token?source=email#accept"),
    "/invite/secure-token?source=email#accept",
  );
});

test("rejects absolute, protocol-relative, and malformed return paths", () => {
  for (const value of [
    "https://attacker.example/path",
    "//attacker.example/path",
    "///attacker.example/path",
    "\\\\attacker.example/path",
    "dashboard",
  ]) {
    assert.equal(returnPath.safeReturnPath(value), "/insights");
  }
});

test("uses the supplied safe fallback for empty values", () => {
  assert.equal(returnPath.safeReturnPath(undefined, "/inbox"), "/inbox");
});
