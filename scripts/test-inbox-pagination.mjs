import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/inbox-pagination.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const pagination = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { decodeInboxCursor, encodeInboxCursor, parseInboxListParams } = pagination;

test("cursor round-trips stable timestamp and conversation id", () => {
  const cursor = { lastMessageAt: "2026-09-30T08:15:00.000Z", id: "conversation-2" };
  assert.deepEqual(decodeInboxCursor(encodeInboxCursor(cursor)), cursor);
});

test("malformed and oversized cursors are rejected", () => {
  assert.equal(decodeInboxCursor("not-a-cursor"), null);
  assert.equal(decodeInboxCursor("a".repeat(513)), null);
  assert.equal(
    decodeInboxCursor(
      Buffer.from(JSON.stringify({ lastMessageAt: "yesterday", id: "x" })).toString("base64url"),
    ),
    null,
  );
});

test("list params use bounded defaults and normalize search", () => {
  const parsed = parseInboxListParams(new URLSearchParams("search=%20invoice%20"));
  assert.deepEqual(parsed, {
    ok: true,
    data: { search: "invoice", filter: "all", limit: 20, cursor: null },
  });
});

test("list params reject unsupported filters, oversized pages, and long searches", () => {
  assert.equal(parseInboxListParams(new URLSearchParams("filter=deleted")).ok, false);
  assert.equal(parseInboxListParams(new URLSearchParams("limit=101")).ok, false);
  assert.equal(parseInboxListParams(new URLSearchParams(`search=${"x".repeat(201)}`)).ok, false);
});

test("list params reject malformed continuation cursors", () => {
  assert.deepEqual(parseInboxListParams(new URLSearchParams("cursor=bad")), {
    ok: false,
    error: "Invalid conversation cursor.",
  });
});
