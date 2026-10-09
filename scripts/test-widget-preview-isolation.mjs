import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents: `
      import { state } from "./public/widget/state.js";
      export { state };
      export {
        saveMessage,
        submitFeedback,
        fetchSessionHistory,
        fetchRecentSessions,
        fetchSessionForResume,
        detectLeadCaptureAPI,
        submitLeadCaptureAPI,
      } from "./public/widget/api.js";
    `,
    resolveDir: process.cwd(),
    sourcefile: "widget-preview-isolation-test.js",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "unused-widget-markdown-dependency",
      setup(builder) {
        builder.onResolve({ filter: /^remend$/ }, () => ({ path: "remend", namespace: "test" }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: "export default (text) => text;",
          loader: "js",
        }));
      },
    },
  ],
});
const widget = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("dashboard preview never reads or writes visitor conversations or lead data", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json({});
  };
  Object.assign(widget.state, {
    preview: true,
    publicKey: "widget-key",
    sessionId: "browser-session",
    sessionDbId: "stale-db-session",
    visitorId: "visitor-id",
  });

  try {
    assert.equal(await widget.saveMessage("user", "test"), null);
    assert.equal(await widget.submitFeedback("message-id", "up"), false);
    assert.deepEqual(await widget.fetchSessionHistory("session-id"), {
      sessionId: "session-id",
      browserSessionId: "browser-session",
      token: null,
      messages: [],
    });
    assert.deepEqual(await widget.fetchSessionForResume("session-id"), {
      sessionId: "session-id",
      browserSessionId: "browser-session",
      token: null,
      messages: [],
    });
    assert.deepEqual(await widget.fetchRecentSessions(), { sessions: [] });
    assert.deepEqual(await widget.detectLeadCaptureAPI("test", 1, 1), { triggered: false });
    assert.equal(await widget.submitLeadCaptureAPI({ name: "Test" }), false);
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = originalFetch;
    widget.state.preview = false;
  }
});
