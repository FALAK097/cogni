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

const { formatBotMessage, getAssistantAnnouncement, getSafeDocumentHref, renderTeamMessageHeader } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
const documentsCompiled = await build({
  entryPoints: ["public/widget/documents.js"],
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
const { normalizeWidgetDocument, renderDocumentCard } = await import(
  `data:text/javascript;base64,${Buffer.from(documentsCompiled.outputFiles[0].text).toString("base64")}`
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
const { createFeedbackButtons, createFeedbackReasonMarkup } = await import(
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

test("document URLs allow only credential-free HTTP and HTTPS destinations", () => {
  assert.equal(
    getSafeDocumentHref("https://docs.example.com/guide"),
    "https://docs.example.com/guide",
  );
  assert.equal(
    getSafeDocumentHref("http://docs.example.com/guide"),
    "http://docs.example.com/guide",
  );
  assert.equal(getSafeDocumentHref("javascript:alert(1)"), null);
  assert.equal(getSafeDocumentHref("data:text/html,hello"), null);
  assert.equal(getSafeDocumentHref("https://user:pass@docs.example.com/guide"), null);
  assert.equal(getSafeDocumentHref(undefined), null);
});

test("document search results use their title and open safe links accessibly", () => {
  const document = {
    title: "Getting started.pdf",
    url: "https://docs.example.com/guide.pdf",
  };
  const normalized = normalizeWidgetDocument(document);
  const markup = renderDocumentCard(document);

  assert.deepEqual(normalized, {
    fileName: "Getting started.pdf",
    description: "",
    fileUrl: "https://docs.example.com/guide.pdf",
  });
  assert.ok(markup.includes("Getting started.pdf"));
  assert.ok(markup.includes('href="https://docs.example.com/guide.pdf"'));
  assert.ok(markup.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(markup.includes('aria-label="Open Getting started.pdf in a new tab"'));
  assert.doesNotMatch(markup, />Document</);
});

test("unsafe document URLs render a filename without a clickable link", () => {
  const markup = renderDocumentCard({
    title: '<img src=x onerror="alert(1)">',
    url: "javascript:alert(1)",
  });

  assert.ok(markup.includes("&lt;img src=x onerror="));
  assert.doesNotMatch(markup, /href=/i);
  assert.doesNotMatch(markup, /<img\b/i);
});

test("feedback controls expose names, toggle state, and an announcement region", () => {
  const initial = createFeedbackButtons("message-id");
  const submitted = createFeedbackButtons("message-id", "positive");

  assert.ok(initial.includes('role="group" aria-label="Rate this response"'));
  assert.ok(initial.includes('aria-label="Mark response as helpful" aria-pressed="false"'));
  assert.ok(initial.includes('aria-label="Mark response as not helpful" aria-pressed="false"'));
  assert.ok(initial.includes('role="status" aria-live="polite"'));
  assert.ok(
    submitted.includes(
      'oc-feedback-positive active" aria-label="Mark response as helpful" aria-pressed="true"',
    ),
  );
});

test("negative feedback reasons expose keyboard and screen-reader semantics", () => {
  const markup = createFeedbackReasonMarkup();

  assert.ok(markup.includes('role="group" aria-label="Tell us how this response could improve"'));
  assert.ok(markup.includes('<button type="button" class="oc-feedback-option"'));
  assert.ok(markup.includes('aria-pressed="false"'));
  assert.ok(markup.includes("Anything else? <span>(optional)</span>"));
  assert.ok(markup.includes('aria-label="Additional feedback details"'));
  assert.ok(markup.includes(">Skip details</button>"));
  assert.ok(markup.includes(">Submit feedback</button>"));
});

test("assistant live announcements summarize typing, completion, and interruption", () => {
  assert.equal(getAssistantAnnouncement("Cogni", "typing"), "Cogni is typing.");
  assert.equal(getAssistantAnnouncement("Cogni"), "Cogni has replied.");
  assert.equal(
    getAssistantAnnouncement("Cogni", "interrupted"),
    "Cogni's response was interrupted.",
  );
  assert.equal(
    getAssistantAnnouncement(" ", "error"),
    "Assistant couldn't respond. Please try again.",
  );
});

test("teammate history uses a distinct, safely escaped support identity", () => {
  const header = renderTeamMessageHeader('<img src=x onerror="alert(1)">');
  assert.ok(header.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
  assert.ok(header.includes('class="oc-team-avatar" aria-hidden="true">'));
  assert.ok(header.includes("&lt;"));
  assert.ok(header.includes('class="oc-team-label">Support</span>'));
  assert.doesNotMatch(header, /<img\b/i);
  assert.ok(renderTeamMessageHeader(" ").includes(">Support team</span>"));
});
