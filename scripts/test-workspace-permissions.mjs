import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/auth/permissions.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const permissions = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("workspace settings and approvals are restricted to owners", () => {
  assert.equal(permissions.canManageWorkspace("OWNER"), true);
  assert.equal(permissions.canManageWorkspace("MEMBER"), false);
  assert.equal(permissions.canManageWorkspace("VIEWER"), false);
  assert.equal(permissions.canManageWorkspace(""), false);
});
