import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/transcript-scroll.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { resolveTranscriptScroll } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("initial transcript load starts at the latest message", () => {
  assert.deepEqual(
    resolveTranscriptScroll({ stickToBottom: true, previousMessageCount: null, messageCount: 8 }),
    { scrollToBottom: true, announceNewMessages: false },
  );
});

test("new messages do not move an agent who is reading older replies", () => {
  assert.deepEqual(
    resolveTranscriptScroll({
      stickToBottom: false,
      previousMessageCount: 8,
      messageCount: 9,
    }),
    { scrollToBottom: false, announceNewMessages: true },
  );
});

test("background refreshes preserve scroll without announcing duplicate messages", () => {
  assert.deepEqual(
    resolveTranscriptScroll({
      stickToBottom: false,
      previousMessageCount: 9,
      messageCount: 9,
    }),
    { scrollToBottom: false, announceNewMessages: false },
  );
});

test("agents at the bottom continue following the newest reply", () => {
  assert.deepEqual(
    resolveTranscriptScroll({
      stickToBottom: true,
      previousMessageCount: 9,
      messageCount: 10,
    }),
    { scrollToBottom: true, announceNewMessages: false },
  );
});
