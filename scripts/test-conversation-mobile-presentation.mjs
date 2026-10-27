import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/conversations/mobile-inbox-presentation.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const presentation = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("visitor messages and outgoing replies have distinct transcript alignment", () => {
  assert.equal(presentation.getTranscriptMessageAlignment("user", false), "incoming");
  assert.equal(presentation.getTranscriptMessageAlignment("assistant", false), "outgoing");
});

test("outgoing transcript rows keep the avatar before the message and align both to the right", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "div",
      {
        className: presentation.getTranscriptMessageRowClassName("outgoing"),
        "data-message-alignment": "outgoing",
      },
      createElement("span", { "data-part": "avatar" }, "AI"),
      createElement("p", { "data-part": "message" }, "AI reply"),
    ),
  );

  assert.ok(markup.includes('class="flex w-full flex-row justify-end gap-3"'));
  assert.ok(markup.indexOf('data-part="avatar"') < markup.indexOf('data-part="message"'));
});

test("only workspace managers can create a test from a visitor message", () => {
  assert.equal(presentation.canCreateTestFromMessage("user", true), true);
  assert.equal(presentation.canCreateTestFromMessage("user", false), false);
  assert.equal(presentation.canCreateTestFromMessage("assistant", true), false);
});

test("internal notes stay visibly separate from public replies", () => {
  assert.equal(presentation.getTranscriptMessageAlignment("assistant", true), "internal");
});

test("reply context names the customer and delivery channel", () => {
  assert.equal(
    presentation.getReplyContextLabel("Maya Chen", "WhatsApp"),
    "To Maya Chen · WhatsApp",
  );
});
