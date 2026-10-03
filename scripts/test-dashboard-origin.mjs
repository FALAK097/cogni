import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/lib/security/dashboard-origin.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { getDashboardMutationOriginError } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function makeRequest(path, method, headers = {}) {
  return new Request(`https://app.example.com${path}`, { method, headers });
}

test("dashboard mutations require an exact same-origin Origin header", () => {
  assert.equal(
    getDashboardMutationOriginError(
      makeRequest("/api/dashboard/conversations", "PATCH", {
        origin: "https://app.example.com",
      }),
    ),
    null,
  );
  assert.equal(
    getDashboardMutationOriginError(
      makeRequest("/api/dashboard/conversations", "POST", {
        origin: "https://app.example.com/",
        "sec-fetch-site": "same-origin",
        "content-type": "text/plain",
      }),
    ),
    "invalid-origin",
  );
});

test("same-site sibling origins and cross-site fetches are rejected", () => {
  assert.equal(
    getDashboardMutationOriginError(
      makeRequest("/api/dashboard/conversations/123", "PATCH", {
        origin: "https://malicious.example.com",
        "sec-fetch-site": "same-site",
      }),
    ),
    "invalid-origin",
  );
  assert.equal(
    getDashboardMutationOriginError(
      makeRequest("/api/dashboard/conversations/123", "DELETE", {
        origin: "https://app.example.com",
        "sec-fetch-site": "cross-site",
      }),
    ),
    "invalid-fetch-site",
  );
});

test("missing and opaque origins fail closed for dashboard mutations", () => {
  assert.equal(
    getDashboardMutationOriginError(makeRequest("/api/dashboard/widget", "PUT")),
    "missing-origin",
  );
  assert.equal(
    getDashboardMutationOriginError(
      makeRequest("/api/dashboard/widget", "PUT", { origin: "null" }),
    ),
    "invalid-origin",
  );
});

test("read-only dashboard requests and public widget APIs are unaffected", () => {
  assert.equal(getDashboardMutationOriginError(makeRequest("/api/dashboard/me", "GET")), null);
  assert.equal(
    getDashboardMutationOriginError(makeRequest("/api/widget/public-key/chat", "POST")),
    null,
  );
  assert.equal(
    getDashboardMutationOriginError(makeRequest("/api/channels/slack/id/webhook", "POST")),
    null,
  );
});
