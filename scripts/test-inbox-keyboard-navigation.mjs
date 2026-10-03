import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/list-keyboard-navigation.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const navigation = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { getConversationTargetIndex } = navigation;

test("arrow keys move within the list and stop at its boundaries", () => {
  assert.equal(getConversationTargetIndex("ArrowDown", 0, 3), 1);
  assert.equal(getConversationTargetIndex("ArrowUp", 2, 3), 1);
  assert.equal(getConversationTargetIndex("ArrowUp", 0, 3), 0);
  assert.equal(getConversationTargetIndex("ArrowDown", 2, 3), 2);
});

test("Home and End move to the first and last conversation", () => {
  assert.equal(getConversationTargetIndex("Home", 1, 3), 0);
  assert.equal(getConversationTargetIndex("End", 1, 3), 2);
});

test("unrelated keys and empty lists do not move selection", () => {
  assert.equal(getConversationTargetIndex("Enter", 1, 3), null);
  assert.equal(getConversationTargetIndex("ArrowDown", 0, 0), null);
});

test("arrow navigation recovers safely from a stale focused index", () => {
  assert.equal(getConversationTargetIndex("ArrowDown", -1, 3), 1);
  assert.equal(getConversationTargetIndex("ArrowUp", 5, 3), 1);
});
