import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/inbox-events.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { parseInboxConversationEventsResponse } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("accepts ordered opaque invalidation events with bigint-safe cursors", () => {
  assert.deepEqual(
    parseInboxConversationEventsResponse({
      events: [
        { cursor: "12", conversationId: "conversation-a" },
        { cursor: "15", conversationId: "conversation-b" },
      ],
      cursor: "15",
      reset: false,
    }),
    {
      events: [
        { cursor: "12", conversationId: "conversation-a" },
        { cursor: "15", conversationId: "conversation-b" },
      ],
      cursor: "15",
      reset: false,
    },
  );
});

test("rejects malformed, out-of-order, or out-of-range cursors", () => {
  for (const response of [
    { events: [], cursor: "01", reset: false },
    { events: [], cursor: "9223372036854775808", reset: false },
    {
      events: [
        { cursor: "2", conversationId: "c" },
        { cursor: "2", conversationId: "c" },
      ],
      cursor: "2",
      reset: false,
    },
    { events: [{ cursor: "3", conversationId: "c" }], cursor: "2", reset: false },
    { events: [{ cursor: "1", conversationId: "" }], cursor: "1", reset: false },
    { events: [{ cursor: "1", conversationId: "c" }], cursor: "1", reset: true },
  ]) {
    assert.equal(parseInboxConversationEventsResponse(response), null);
  }
});
