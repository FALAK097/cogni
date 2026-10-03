import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["public/widget/utils.js"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "identity-remend",
      setup(builder) {
        builder.onResolve({ filter: /^remend$/ }, () => ({
          path: "remend",
          namespace: "test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: "export default (text) => text;",
          loader: "js",
        }));
      },
    },
  ],
});

globalThis.document = {
  createElement() {
    let value = "";
    return {
      set textContent(next) {
        value = String(next);
      },
      get innerHTML() {
        return value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      },
    };
  },
};

const { formatBotMessage } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const feedbackCompiled = await build({
  entryPoints: ["public/widget/feedback.js"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "identity-remend",
      setup(builder) {
        builder.onResolve({ filter: /^remend$/ }, () => ({
          path: "remend",
          namespace: "test",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: "export default (text) => text;",
          loader: "js",
        }));
      },
    },
  ],
});
const { createFeedbackButtons } = await import(
  `data:text/javascript;base64,${Buffer.from(feedbackCompiled.outputFiles[0].text).toString("base64")}`
);

test("message formatter keeps unsafe markdown destinations inert", () => {
  const rendered = formatBotMessage(
    "[unsafe](javascript:alert(1)) [safe](https://support.example.com/help)",
  );

  assert.doesNotMatch(rendered, /href=["']javascript:/i);
  assert.match(rendered, /unsafe/);
  assert.ok(rendered.includes('href="https://support.example.com/help"'));
  assert.ok(rendered.includes('rel="noopener noreferrer"'));
});

test("message formatter preserves encoded text and disables credentialed links", () => {
  const rendered = formatBotMessage(
    '<img src=x onerror="alert(1)"> [credentialed](https://user:pass@example.com/)',
  );

  assert.ok(rendered.includes("&lt;img src=x onerror="));
  assert.doesNotMatch(rendered, /<img\b/i);
  assert.ok(!rendered.includes('href="https://user:pass@example.com'));
  assert.match(rendered, /credentialed/);
});

test("message formatter encodes quote characters before restoring anchor markup", () => {
  const rendered = formatBotMessage(
    '[injected](https://support.example.com/" onmouseover="alert(1))',
  );

  assert.doesNotMatch(rendered, /<a\s+[^>]*\sonmouseover=/i);
  assert.ok(rendered.includes('href="https://support.example.com/%22%20onmouseover=%22alert(1"'));
});

test("feedback controls expose names, toggle state, and an announcement region", () => {
  const initial = createFeedbackButtons("message-id");
  const submitted = createFeedbackButtons("message-id", "positive");

  assert.ok(initial.includes('aria-label="Mark response as helpful" aria-pressed="false"'));
  assert.ok(initial.includes('aria-label="Mark response as not helpful" aria-pressed="false"'));
  assert.ok(initial.includes('role="status" aria-live="polite"'));
  assert.ok(
    submitted.includes(
      'oc-feedback-positive active" aria-label="Mark response as helpful" aria-pressed="true"',
    ),
  );
});
