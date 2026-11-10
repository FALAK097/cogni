import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/inbox-state.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const inboxState = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { shouldShowInboxFirstRunState } = inboxState;

test("the workspace first-run state waits for the first conversation count", () => {
  assert.equal(
    shouldShowInboxFirstRunState({
      conversationsLoaded: false,
      conversationCount: 0,
      selectedConversationId: null,
    }),
    false,
  );
});

test("a truly empty workspace without a selected conversation gets the first-run state", () => {
  assert.equal(
    shouldShowInboxFirstRunState({
      conversationsLoaded: true,
      conversationCount: 0,
      selectedConversationId: null,
    }),
    true,
  );
});

test("a deep-linked conversation keeps its detail recovery state when the list is empty", () => {
  assert.equal(
    shouldShowInboxFirstRunState({
      conversationsLoaded: true,
      conversationCount: 0,
      selectedConversationId: "missing-conversation",
    }),
    false,
  );
});

test("a workspace with conversations does not show the first-run state", () => {
  assert.equal(
    shouldShowInboxFirstRunState({
      conversationsLoaded: true,
      conversationCount: 3,
      selectedConversationId: null,
    }),
    false,
  );
});
