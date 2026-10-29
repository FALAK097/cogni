import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  calls: [],
  claimToken: 101,
  failOwnsAttempt: true,
  extractionError: null,
  indexError: null,
  indexResult: {
    status: "created",
    revisionId: "revision-1",
    revisionNumber: 1,
    contentSha256: "hash",
  },
  indexArgs: null,
  completions: [],
  failures: [],
  readyEvents: [],
};
globalThis.__processDocumentAttemptFenceTest = state;

const stubs = {
  "@/features/knowledge/server/extract": `
    export async function extractDocumentText(input) {
      const s = globalThis.__processDocumentAttemptFenceTest;
      s.calls.push("extract");
      if (s.extractionError) throw s.extractionError;
      s.extractionInput = input;
      return "document text";
    }
    export async function indexDocumentContent(...args) {
      const s = globalThis.__processDocumentAttemptFenceTest;
      s.calls.push("index");
      s.indexArgs = args;
      if (s.indexError) throw s.indexError;
      return s.indexResult;
    }
  `,
  "@/features/knowledge/server/source-revisions": `
    export async function claimKnowledgeSourceProcessingAttempt() {
      const s = globalThis.__processDocumentAttemptFenceTest;
      s.calls.push("claim");
      return s.claimToken;
    }
    export async function failKnowledgeSourceProcessingAttempt(_db, input) {
      const s = globalThis.__processDocumentAttemptFenceTest;
      s.calls.push("fail-source");
      s.failureInput = input;
      return s.failOwnsAttempt;
    }
  `,
  "@/lib/logging/logger": `export const logError = () => {};`,
  "@/lib/events/domain-events": `
    export async function emitDomainEvent(input) {
      globalThis.__processDocumentAttemptFenceTest.readyEvents.push(input);
    }
  `,
  "@/lib/workflows/runner": `
    export async function startWorkflowRun() { return { id: "run-1" }; }
    export async function completeWorkflowRun(input) {
      globalThis.__processDocumentAttemptFenceTest.completions.push(input);
    }
    export async function failWorkflowRun(input) {
      globalThis.__processDocumentAttemptFenceTest.failures.push(input);
    }
  `,
};

const compiled = await build({
  entryPoints: ["src/features/knowledge/server/process-document.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "process-document-attempt-fence-test",
      setup(context) {
        context.onResolve({ filter: /^@\/.*$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "process-document-attempt-fence-test" }
            : undefined,
        );
        context.onLoad(
          { filter: /.*/, namespace: "process-document-attempt-fence-test" },
          (args) => ({
            contents: stubs[args.path],
            loader: "js",
          }),
        );
      },
    },
  ],
});
const { processDocument } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function reset(overrides = {}) {
  Object.assign(state, {
    calls: [],
    claimToken: 101,
    failOwnsAttempt: true,
    extractionError: null,
    indexError: null,
    indexResult: {
      status: "created",
      revisionId: "revision-1",
      revisionNumber: 1,
      contentSha256: "hash",
    },
    indexArgs: null,
    failureInput: null,
    completions: [],
    failures: [],
    readyEvents: [],
    ...overrides,
  });
}

function makeInput() {
  return {
    db: {
      query: {
        document: {
          findFirst: async () => ({
            id: "document-1",
            sourceType: "URL",
            sourceUrl: "https://example.test",
            storageKey: null,
            mimeType: null,
          }),
        },
      },
    },
    workspaceId: "workspace-1",
    documentId: "document-1",
    idempotencyKey: "document:process:1",
  };
}

test("the PROCESSING token is claimed before extraction and passed to indexing", async () => {
  reset();
  await processDocument(makeInput());

  assert.ok(state.calls.indexOf("claim") < state.calls.indexOf("extract"));
  assert.equal(state.indexArgs[4], state.claimToken);
  assert.equal(state.readyEvents.length, 1);
});

test("a stale extraction failure completes as stale without failing the newer attempt", async () => {
  reset({ extractionError: new Error("old extraction failed"), failOwnsAttempt: false });

  await assert.doesNotReject(processDocument(makeInput()));
  assert.deepEqual(state.calls, ["claim", "extract", "fail-source"]);
  assert.equal(state.failureInput.processingToken, state.claimToken);
  assert.equal(state.failures.length, 0);
  assert.deepEqual(state.completions[0].output, { documentId: "document-1", status: "stale" });
  assert.equal(state.readyEvents.length, 0);
});

test("an owned extraction failure marks its workflow failed", async () => {
  const failure = new Error("current extraction failed");
  reset({ extractionError: failure, failOwnsAttempt: true });

  await assert.rejects(processDocument(makeInput()), failure);
  assert.equal(state.failureInput.processingToken, state.claimToken);
  assert.equal(state.failures.length, 1);
  assert.equal(state.completions.length, 0);
  assert.equal(state.readyEvents.length, 0);
});

test("stale indexing completes as a no-op and never emits document.ready", async () => {
  reset({ indexResult: { status: "stale" } });

  await processDocument(makeInput());
  assert.deepEqual(state.completions[0].output, { documentId: "document-1", status: "stale" });
  assert.equal(state.readyEvents.length, 0);
});
