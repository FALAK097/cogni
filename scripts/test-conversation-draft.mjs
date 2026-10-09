import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/draft-state.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const drafts = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("conversation drafts stay isolated by workspace and retain reply and note text", () => {
  const existing = {
    "workspace-a:conversation-1": { reply: "Saved reply", note: "Private note" },
    "workspace-b:conversation-1": { reply: "Other workspace", note: "" },
  };
  const updated = drafts.updateConversationComposerDrafts(
    existing,
    "workspace-a:conversation-1",
    (current) => ({ ...current, reply: "Edited reply" }),
  );

  assert.deepEqual(updated["workspace-a:conversation-1"], {
    reply: "Edited reply",
    note: "Private note",
  });
  assert.deepEqual(updated["workspace-b:conversation-1"], {
    reply: "Other workspace",
    note: "",
  });
  assert.equal(existing["workspace-a:conversation-1"]?.reply, "Saved reply");
});

test("new drafts start empty and clear only the submitted text", () => {
  const newDraft = drafts.EMPTY_CONVERSATION_COMPOSER_DRAFT;
  assert.deepEqual(newDraft, { reply: "", note: "" });
  assert.equal(drafts.clearSubmittedDraft("sent text", "sent text"), "");
  assert.equal(drafts.clearSubmittedDraft("newer text", "sent text"), "newer text");
});

test("successful send preserves text added while the request is pending", () => {
  assert.equal(
    drafts.clearSubmittedDraft(
      "Thanks for reaching out. I can help with that.",
      "Thanks for reaching out.",
    ),
    "Thanks for reaching out. I can help with that.",
  );
});

test("successful send preserves a replacement draft", () => {
  assert.equal(drafts.clearSubmittedDraft("A new reply", "The submitted reply"), "A new reply");
});

test("unchanged drafts with surrounding whitespace are still cleared", () => {
  assert.equal(drafts.clearSubmittedDraft("  A reply  ", "  A reply  "), "");
});
