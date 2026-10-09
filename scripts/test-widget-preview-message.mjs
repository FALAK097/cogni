import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents: `export { createPreviewMessageSender } from "./public/widget/preview-message.js";`,
    resolveDir: process.cwd(),
    sourcefile: "widget-preview-message-test.js",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { createPreviewMessageSender } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function createFixture(sendMessage = async () => {}) {
  const calls = { sent: [], opened: 0 };
  const state = {
    preview: true,
    isInitialized: true,
    input: { value: "" },
    previewMessagePending: false,
    windowEl: { querySelector: () => ({ disabled: true }) },
  };
  const sendPreviewMessage = createPreviewMessageSender({
    state,
    show: () => calls.opened++,
    sendMessage: async () => {
      calls.sent.push(state.input.value);
      await sendMessage();
    },
  });
  return { calls, sendPreviewMessage, state };
}

test("preview test sends while the empty-input send button is disabled", async () => {
  const fixture = createFixture();
  assert.equal(await fixture.sendPreviewMessage("  What services do you offer?  "), true);
  assert.deepEqual(fixture.calls.sent, ["What services do you offer?"]);
  assert.equal(fixture.calls.opened, 1);
  assert.equal(fixture.state.previewMessagePending, false);
});

test("preview test rejects unavailable, empty, and oversized prompts", async () => {
  const fixture = createFixture();
  fixture.state.preview = false;
  assert.equal(await fixture.sendPreviewMessage("test"), false);
  fixture.state.preview = true;
  assert.equal(await fixture.sendPreviewMessage(" "), false);
  assert.equal(await fixture.sendPreviewMessage("x".repeat(1001)), false);
  assert.equal(fixture.calls.opened, 0);
  assert.deepEqual(fixture.calls.sent, []);
});

test("preview test does not submit overlapping prompts", async () => {
  let finishSend = () => {};
  const fixture = createFixture(() => new Promise((resolve) => (finishSend = resolve)));
  const firstSend = fixture.sendPreviewMessage("First question");
  await Promise.resolve();

  assert.equal(fixture.state.previewMessagePending, true);
  assert.equal(await fixture.sendPreviewMessage("Second question"), false);
  finishSend();
  assert.equal(await firstSend, true);
  assert.deepEqual(fixture.calls.sent, ["First question"]);
  assert.equal(fixture.state.previewMessagePending, false);
});
