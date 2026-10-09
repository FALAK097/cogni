import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents: `
      export { readBoundedJson } from "@/lib/http/read-bounded-json";
      export { dashboardSessionPatchSchema, DASHBOARD_SESSION_MESSAGE_MAX_LENGTH } from "@/features/conversations/dashboard-session-patch";
    `,
    resolveDir: process.cwd(),
    sourcefile: "dashboard-session-patch-test-entry.ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": `${process.cwd()}/src` },
});
const { readBoundedJson, dashboardSessionPatchSchema, DASHBOARD_SESSION_MESSAGE_MAX_LENGTH } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );

const requestWithBody = (body) =>
  new Request("http://localhost/api/dashboard/widget/sessions/test", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  });

test("reply and note actions trim bounded text and reject empty, oversized, or extra fields", () => {
  assert.deepEqual(dashboardSessionPatchSchema.parse({ action: "assign" }), { action: "assign" });
  assert.deepEqual(dashboardSessionPatchSchema.parse({ action: "reply", message: "  hello  " }), {
    action: "reply",
    message: "hello",
  });
  assert.equal(
    dashboardSessionPatchSchema.safeParse({
      action: "note",
      message: "x".repeat(DASHBOARD_SESSION_MESSAGE_MAX_LENGTH + 1),
    }).success,
    false,
  );
  assert.equal(
    dashboardSessionPatchSchema.safeParse({ action: "reply", message: "   " }).success,
    false,
  );
  assert.equal(dashboardSessionPatchSchema.safeParse({ action: "delete" }).success, false);
  assert.equal(
    dashboardSessionPatchSchema.safeParse({ action: "assign", workspaceId: "foreign" }).success,
    false,
  );
});

test("bounded JSON reader parses valid bodies and rejects malformed JSON", async () => {
  assert.deepEqual(await readBoundedJson(requestWithBody('{"action":"assign"}'), 100), {
    ok: true,
    value: { action: "assign" },
  });
  assert.deepEqual(await readBoundedJson(requestWithBody("{"), 100), {
    ok: false,
    reason: "invalid",
  });
});

test("bounded JSON reader rejects an oversized streamed body without buffering its remainder", async () => {
  const encoder = new TextEncoder();
  const chunks = [
    encoder.encode('{"message":"'),
    encoder.encode("x".repeat(100)),
    encoder.encode('"}'),
  ];
  const request = new Request("http://localhost/api/dashboard/widget/sessions/test", {
    method: "PATCH",
    body: new ReadableStream({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
    }),
    duplex: "half",
  });

  assert.deepEqual(await readBoundedJson(request, 32), { ok: false, reason: "too-large" });
});
