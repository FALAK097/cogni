import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents: `export { parseWidgetPreviewEvidence } from "./public/widget/preview-evidence.js";`,
    resolveDir: process.cwd(),
    sourcefile: "widget-preview-evidence-test.js",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const previewEvidence = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function encode(value) {
  return encodeURIComponent(JSON.stringify(value));
}

test("preview evidence returns only bounded source titles", () => {
  const result = previewEvidence.parseWidgetPreviewEvidence(
    encode({
      outcome: "answer",
      grounded: true,
      sources: [
        { title: "  Returns policy  " },
        { title: "Shipping guide" },
        { title: "Warranty" },
        { title: "Support" },
        { title: "Ignored fifth source" },
        { title: "<script>alert(1)</script>" },
      ],
    }),
  );

  assert.deepEqual(result, {
    outcome: "answer",
    grounded: true,
    sources: [
      { title: "Returns policy" },
      { title: "Shipping guide" },
      { title: "Warranty" },
      { title: "Support" },
    ],
  });
});

test("preview evidence rejects malformed or inconsistent payloads", () => {
  assert.equal(previewEvidence.parseWidgetPreviewEvidence("%"), null);
  assert.equal(
    previewEvidence.parseWidgetPreviewEvidence(
      encode({ outcome: "answer", grounded: true, sources: [] }),
    ),
    null,
  );
  assert.equal(
    previewEvidence.parseWidgetPreviewEvidence(
      encode({ outcome: "handoff", grounded: false, sources: [{ title: "Private source" }] }),
    ),
    null,
  );
  assert.equal(
    previewEvidence.parseWidgetPreviewEvidence(
      encode({ outcome: "answer", grounded: false, sources: [{ title: "Policy" }] }),
    ),
    null,
  );
});

test("preview evidence ignores oversized headers and invalid titles", () => {
  assert.equal(previewEvidence.parseWidgetPreviewEvidence("x".repeat(8_001)), null);
  assert.equal(
    previewEvidence.parseWidgetPreviewEvidence(
      encode({ outcome: "answer", grounded: false, sources: [{ title: "  " }, null, 3] }),
    )?.sources.length,
    0,
  );
});

test("preview evidence keeps only a bounded prompt for matching a saved preview test", () => {
  assert.deepEqual(
    previewEvidence.parseWidgetPreviewEvidence(
      encode({ outcome: "answer", grounded: false, sources: [], prompt: "  no evidence?  " }),
    ),
    { outcome: "answer", grounded: false, sources: [], prompt: "  no evidence?  " },
  );
  assert.equal(
    previewEvidence.parseWidgetPreviewEvidence(
      encode({ outcome: "answer", grounded: false, sources: [], prompt: "x".repeat(1_001) }),
    )?.prompt,
    undefined,
  );
});

test("preview source IDs survive transport for expected-source evaluation without extra provider data", () => {
  const result = previewEvidence.parseWidgetPreviewEvidence(
    encode({
      outcome: "answer",
      grounded: true,
      sources: [
        { title: "Policy", documentId: "policy-id", content: "private chunk" },
        { title: "Legacy" },
        { title: "Oversized", documentId: "x".repeat(129) },
      ],
    }),
  );
  assert.deepEqual(result.sources, [
    { title: "Policy", documentId: "policy-id" },
    { title: "Legacy" },
    { title: "Oversized" },
  ]);
});
