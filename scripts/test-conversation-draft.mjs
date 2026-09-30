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
const { clearSubmittedDraft } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("successful send clears the unchanged submitted draft", () => {
  assert.equal(clearSubmittedDraft("Thanks for reaching out.", "Thanks for reaching out."), "");
});

test("successful send preserves text added while the request is pending", () => {
  assert.equal(
    clearSubmittedDraft(
      "Thanks for reaching out. I can help with that.",
      "Thanks for reaching out.",
    ),
    "Thanks for reaching out. I can help with that.",
  );
});

test("successful send preserves a replacement draft", () => {
  assert.equal(clearSubmittedDraft("A new reply", "The submitted reply"), "A new reply");
});

test("unchanged drafts with surrounding whitespace are still cleared", () => {
  assert.equal(clearSubmittedDraft("  A reply  ", "  A reply  "), "");
});
