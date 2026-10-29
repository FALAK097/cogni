import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const state = {
  role: "OWNER",
  workspaceId: "workspace-1",
  membershipId: "membership-1",
  startCalls: [],
  resultCalls: [],
};
globalThis.__agentTestPublishCheckState = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => ({ db: { marker: true }, workspace: { id: globalThis.__agentTestPublishCheckState.workspaceId }, membership: { id: globalThis.__agentTestPublishCheckState.membershipId, role: globalThis.__agentTestPublishCheckState.role } });`,
  "@/lib/auth/permissions": `export const canManageWorkspace = (role) => role === "OWNER";`,
  "@/lib/http/read-bounded-json": `export async function readBoundedJson(request) { try { return { ok: true, value: await request.json() }; } catch { return { ok: false, reason: "invalid" }; } }`,
  "@/features/agent-tests/server/publish-checks": `export class AgentTestPublishCheckError extends Error {}; export async function startAgentTestPublishCheck(...args) { globalThis.__agentTestPublishCheckState.startCalls.push(args); return { id: "check-1", baselineRequired: true }; }; export async function recordAgentTestPublishCheckResults(...args) { globalThis.__agentTestPublishCheckState.resultCalls.push(args); return { status: "COMPLETE", passedCount: 1, mismatchCount: 0 }; }`,
};

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/agent-test-publish-checks/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "agent-test-publish-check-route-test",
      setup(context) {
        context.onResolve({ filter: /^(next\/server|@\/.*)$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "agent-test-publish-check-route-test" }
            : undefined,
        );
        context.onLoad(
          { filter: /.*/, namespace: "agent-test-publish-check-route-test" },
          (args) => ({
            contents: stubs[args.path],
            loader: "js",
          }),
        );
      },
    },
  ],
});
const route = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

const put = (body) =>
  new Request("https://cogni.test/api/dashboard/agent-test-publish-checks", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("only workspace owners can start or record a publish suite check", async () => {
  state.role = "MEMBER";
  state.startCalls = [];
  state.resultCalls = [];
  assert.equal((await route.POST()).status, 403);
  assert.equal(
    (await route.PUT(put({ checkId: randomUUID(), variant: "draft", results: [] }))).status,
    403,
  );
  assert.equal(state.startCalls.length, 0);
  assert.equal(state.resultCalls.length, 0);
});

test("publish-check start is workspace and membership scoped and private", async () => {
  state.role = "OWNER";
  state.workspaceId = "workspace-9";
  state.membershipId = "membership-9";
  state.startCalls = [];
  const response = await route.POST();
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(state.startCalls.length, 1);
  assert.equal(state.startCalls[0][0], "workspace-9");
  assert.equal(state.startCalls[0][1], "membership-9");
});

test("result input rejects incomplete or unknown client supplied fields", async () => {
  state.role = "OWNER";
  state.resultCalls = [];
  const checkId = randomUUID();
  assert.equal((await route.PUT(put({ checkId, variant: "draft", results: [] }))).status, 400);
  assert.equal(
    (
      await route.PUT(
        put({
          checkId,
          variant: "draft",
          answerText: "must not persist",
          results: [{ id: randomUUID(), status: "passed" }],
        }),
      )
    ).status,
    400,
  );
  assert.equal(state.resultCalls.length, 0);
});

test("valid result submission passes only signed outcomes and workspace identity to the verifier", async () => {
  state.role = "OWNER";
  state.workspaceId = "workspace-3";
  state.membershipId = "membership-3";
  state.resultCalls = [];
  const checkId = randomUUID();
  const caseId = randomUUID();
  const response = await route.PUT(
    put({
      checkId,
      variant: "baseline",
      results: [{ id: caseId, status: "passed", signedEvidence: "signed" }],
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(state.resultCalls[0][0], {
    workspaceId: "workspace-3",
    membershipId: "membership-3",
    checkId,
    variant: "baseline",
    results: [{ id: caseId, status: "passed", signedEvidence: "signed" }],
  });
});

test("server receipt binds suite, published version, draft fingerprint, verified sources, and full suite", async () => {
  const [
    service,
    sourceRevisions,
    extraction,
    processDocument,
    ingestion,
    sourceActions,
    retryRoute,
  ] = await Promise.all([
    readFile("src/features/agent-tests/server/publish-checks.ts", "utf8"),
    readFile("src/features/knowledge/server/source-revisions.ts", "utf8"),
    readFile("src/features/knowledge/server/extract.ts", "utf8"),
    readFile("src/features/knowledge/server/process-document.ts", "utf8"),
    readFile("src/lib/jobs/ingestion.ts", "utf8"),
    readFile("src/features/knowledge/actions.ts", "utf8"),
    readFile("src/app/api/dashboard/knowledge-base/sources/[source_id]/route.ts", "utf8"),
  ]);
  assert.match(service, /saved\.publishedVersion !== check\.basePublishedVersion/);
  assert.match(service, /suiteDigest !== check\.suiteDigest/);
  assert.match(service, /sourceBasisDigest/);
  assert.match(service, /getCurrentSourceBasisDigest\(input\.workspaceId, tx as unknown as Db\)/);
  assert.match(service, /candidateFingerprint/);
  assert.match(service, /input\.results\.length !== savedCases\.length/);
  assert.match(service, /verifyAgentTestPreviewEvidence/);
  assert.match(service, /revision\.status !== "CURRENT"/);
  assert.match(service, /\.for\("update"\)/);
  assert.match(service, /documentId: documentTable\.id/);
  assert.match(service, /status: documentTable\.status/);
  assert.match(service, /source\.status === "PROCESSING"/);
  assert.match(service, /source\.status === "READY"/);
  assert.match(service, /isSupportedKnowledgeSourceType\(source\.sourceType\)/);
  assert.match(service, /JSON\.stringify\(\{ workspaceId, documents, revisions \}\)/);
  const sourceBasisDigest = service.slice(
    service.indexOf("async function getCurrentSourceBasisDigest"),
    service.indexOf("function digestResultRequest"),
  );
  assert.doesNotMatch(sourceBasisDigest, /documentTable\.(?:title|sourceUrl)/);

  const revisionWriter = sourceRevisions.slice(
    sourceRevisions.indexOf("export async function recordDocumentRevisionInTransaction"),
    sourceRevisions.indexOf("export async function recordDocumentRevision("),
  );
  const revisionDeletion = sourceRevisions.slice(
    sourceRevisions.indexOf("export async function markDocumentRevisionsDeleted"),
    sourceRevisions.indexOf("export async function enqueueSearchItemCleanupInTransaction"),
  );
  const workspaceLock = sourceRevisions.slice(
    sourceRevisions.indexOf("export async function lockWorkspaceSourceBasisInTransaction"),
    sourceRevisions.indexOf("export async function updateKnowledgeSourceStatus"),
  );
  assert.ok(workspaceLock.indexOf(".from(widget)") < workspaceLock.indexOf('.for("update")'));
  for (const writer of [revisionWriter, revisionDeletion]) {
    const widgetLock = writer.indexOf("lockWorkspaceSourceBasisInTransaction");
    const documentLock = writer.indexOf(".from(documentTable)");
    const revisionWrite = writer.search(
      /(?:insert\(documentRevision\)|update\(documentRevision\))/,
    );
    assert.ok(widgetLock >= 0 && documentLock > widgetLock && revisionWrite > documentLock);
  }

  const statusWriter = sourceRevisions.slice(
    sourceRevisions.indexOf("export async function updateKnowledgeSourceStatus"),
    sourceRevisions.indexOf("/**\n * Call inside the same transaction"),
  );
  assert.ok(
    statusWriter.indexOf("lockWorkspaceSourceBasisInTransaction") <
      statusWriter.indexOf(".from(documentTable)") &&
      statusWriter.indexOf(".from(documentTable)") < statusWriter.indexOf(".update(documentTable)"),
  );

  for (const source of [sourceActions]) {
    const inserts = [...source.matchAll(/\.insert\(documentTable\)/g)];
    assert.ok(inserts.length > 0);
    for (const insert of inserts) {
      const transactionStart = source.lastIndexOf("runDbWriteOperation(", insert.index);
      const widgetLock = source.indexOf("lockWorkspaceSourceBasisInTransaction", transactionStart);
      assert.ok(
        transactionStart >= 0 && widgetLock > transactionStart && widgetLock < insert.index,
      );
    }
  }
  for (const transactionStartText of [
    "const intent = await runDbWriteOperation",
    "const result = await runDbWriteOperation",
  ]) {
    const transactionStart = extraction.indexOf(transactionStartText);
    const transactionEnd = extraction.indexOf("});", transactionStart);
    const transactionBody = extraction.slice(transactionStart, transactionEnd);
    assert.ok(
      transactionBody.indexOf("lockWorkspaceSourceBasisInTransaction") <
        transactionBody.indexOf(".from(documentTable)"),
    );
    assert.doesNotMatch(transactionBody, /uploadCloudflareSearchDocument/);
  }
  const providerUpload = extraction.indexOf(
    "uploadedItemId = await uploadCloudflareSearchDocument(",
  );
  const finalWrite = extraction.indexOf("const result = await runDbWriteOperation");
  assert.ok(providerUpload >= 0 && providerUpload < finalWrite);
  assert.match(
    extraction,
    /source\.status !== "PROCESSING" \|\|\s*new Date\(source\.updatedAt\)\.getTime\(\) !== processingToken/,
  );
  assert.match(extraction, /return \{ status: "stale" as const \}/);
  assert.match(extraction, /itemId: uploadedItemId,[\s\S]*?itemKey: attemptedItemKey/);
  const preUploadIntent = extraction.slice(
    extraction.indexOf("const intent = await runDbWriteOperation"),
    extraction.indexOf("if (searchConfigured && intent.shouldUpload)"),
  );
  assert.match(preUploadIntent, /source\.status !== "PROCESSING"/);
  assert.match(preUploadIntent, /processingToken/);
  assert.ok(
    preUploadIntent.indexOf('source.status !== "PROCESSING"') <
      preUploadIntent.indexOf("if (searchConfigured)"),
  );
  assert.equal([...extraction.matchAll(/source\.status !== "PROCESSING"/g)].length, 2);
  assert.ok(extraction.indexOf("const intent = await runDbWriteOperation") < providerUpload);
  assert.match(extraction, /processingToken \+ 1/);
  for (const source of [
    "src/app/api/dashboard/knowledge-base/upload/route.ts",
    "src/app/api/dashboard/knowledge-base/sources/website/route.ts",
  ]) {
    const contents = await readFile(source, "utf8");
    const insert = contents.indexOf(".insert(documentTable)");
    const transactionStart = contents.lastIndexOf("runDbWriteOperation(", insert);
    const widgetLock = contents.indexOf("lockWorkspaceSourceBasisInTransaction", transactionStart);
    assert.ok(
      insert >= 0 && transactionStart >= 0 && widgetLock > transactionStart && widgetLock < insert,
    );
  }

  const processingStatusWriter = sourceRevisions.slice(
    sourceRevisions.indexOf("export async function updateKnowledgeSourceStatus"),
    sourceRevisions.indexOf("/**\n * Call inside the same transaction"),
  );
  assert.match(processDocument, /claimKnowledgeSourceProcessingAttempt\(db/);
  assert.match(processDocument, /failKnowledgeSourceProcessingAttempt\(db/);
  assert.match(ingestion, /updateKnowledgeSourceStatus\(db/);
  assert.ok(
    processDocument.indexOf("claimKnowledgeSourceProcessingAttempt(db") <
      processDocument.indexOf("extractDocumentText({"),
  );
  assert.match(
    processDocument,
    /indexDocumentContent\(db, document\.id, text, workspaceId, processingToken\)/,
  );
  assert.match(processDocument, /if \(!failed\)[\s\S]*?status: "stale"/);
  const staleResultGuard = processDocument.indexOf('if (!result || result.status === "stale")');
  const staleReturn = processDocument.indexOf("return;", staleResultGuard);
  const readyEvent = processDocument.indexOf('type: "document.ready"');
  assert.ok(staleResultGuard >= 0 && staleReturn > staleResultGuard && readyEvent > staleReturn);
  assert.match(processingStatusWriter, /\.for\("update"\)/);
  const retryClaim = retryRoute.slice(
    retryRoute.indexOf("const claimed = await runDbWriteOperation"),
    retryRoute.indexOf("if (!claimed)"),
  );
  assert.ok(
    retryClaim.indexOf("lockWorkspaceSourceBasisInTransaction") <
      retryClaim.indexOf(".from(documentTable)") &&
      retryClaim.indexOf(".from(documentTable)") < retryClaim.indexOf(".update(documentTable)"),
  );
});

test("result retries are idempotent only when the request digest matches the recorded variant", async () => {
  const service = await readFile("src/features/agent-tests/server/publish-checks.ts", "utf8");
  assert.match(
    service,
    /function digestResultRequest\(variant: "baseline" \| "draft", results: SuiteResult\[\]\)/,
  );
  assert.match(service, /variant,\s*results:/);
  assert.match(service, /\.sort\(\(left, right\) => left\.id\.localeCompare\(right\.id\)\)/);
  assert.match(service, /previousDigest === requestDigest/);
  assert.match(
    service,
    /input\.variant === "baseline" \? check\.baselineRequestDigest : check\.candidateRequestDigest/,
  );
  assert.match(
    service,
    /input\.variant === "baseline"\s*\? check\.baselineReferences\s*:\s*check\.candidateReferences/,
  );
  assert.match(service, /check\.status === "PENDING_DRAFT" \|\| check\.status === "COMPLETE"/);
  assert.match(service, /: check\.status === "COMPLETE"/);
  assert.match(service, /if \(alreadyRecorded\) \{[\s\S]*?return \{/);
  const recordResults = service.slice(
    service.indexOf("export async function recordAgentTestPublishCheckResults"),
    service.indexOf("export async function assertAgentTestPublishCheckCurrent"),
  );
  assert.ok(
    recordResults.indexOf("if (alreadyRecorded)") <
      recordResults.indexOf("getCurrentSourceBasisDigest"),
  );
});

test("published baseline selection is server derived and persisted data excludes generated answer text", async () => {
  const [service, chatRoute, schema] = await Promise.all([
    readFile("src/features/agent-tests/server/publish-checks.ts", "utf8"),
    readFile("src/app/api/widget/[publicKey]/chat/route.ts", "utf8"),
    readFile("src/lib/db/schema.ts", "utf8"),
  ]);
  assert.match(service, /check\.status === "PENDING_BASELINE"/);
  assert.match(service, /parseWidgetPublicationSnapshot/);
  assert.match(service, /mergeWidgetPublication\(config/);
  assert.match(service, /variant: "draft" as const, settings, identity/);
  assert.match(chatRoute, /getAgentTestPublishPreview/);
  assert.match(chatRoute, /allowActions:\s*!isPreview/);
  const table = schema.slice(schema.indexOf("export const agentTestPublishCheck ="));
  assert.match(table, /baselineReferences/);
  assert.match(table, /candidateReferences/);
  assert.doesNotMatch(table, /answerText|transcript|completionText/);
});

test("publish guard runs in the locked publication transaction and restores remain versioned", async () => {
  const publication = await readFile(
    "src/features/widget/server/widget-publication-service.ts",
    "utf8",
  );
  const lockIndex = publication.indexOf('.for("update")');
  const guardIndex = publication.indexOf("await assertAgentTestPublishCheckCurrent(");
  assert.ok(lockIndex >= 0 && guardIndex > lockIndex);
  assert.match(publication, /restoreVersion !== undefined/);
  assert.match(publication, /publishedVersion: version/);
});

test("receipt migration safely invalidates rows created between staged migrations", async () => {
  const migration = await readFile("drizzle/0025_agent_test_publish_receipt_bindings.sql", "utf8");
  assert.match(migration, /ADD COLUMN "sourceBasisDigest" text DEFAULT '[0]{64}' NOT NULL/);
  assert.match(migration, /ALTER COLUMN "sourceBasisDigest" DROP DEFAULT/);
});
