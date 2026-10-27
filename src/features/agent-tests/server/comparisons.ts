import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import {
  agentTestComparison,
  agentTestImprovement,
  document as documentTable,
  documentRevision,
  widget as widgetTable,
} from "@/lib/db/schema";
import { resolveAgentTestModelIdentity } from "../evaluation-context";
import { matchesAgentTestOutcome } from "../input";
import { verifyAgentTestPreviewEvidence } from "../signed-preview-evidence";

export class AgentTestComparisonUnavailableError extends Error {
  constructor() {
    super("This failed check has no verified baseline available for comparison.");
    this.name = "AgentTestComparisonUnavailableError";
  }
}

export class AgentTestComparisonOriginError extends Error {
  constructor() {
    super(
      "Replay is unavailable on this host because its authentication origin is not configured here.",
    );
    this.name = "AgentTestComparisonOriginError";
  }
}

function readSseText(body: string) {
  const chunks: string[] = [];
  for (const frame of body.split("\n\n")) {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[ERROR]") throw new Error("Preview generation failed.");
      if (data !== "[DONE]") chunks.push(data);
    }
  }
  return chunks.join("");
}

function readPreviewEvidence(response: Response) {
  const encoded = response.headers.get("x-widget-preview-evidence");
  if (!encoded) return null;
  try {
    const value = JSON.parse(decodeURIComponent(encoded)) as { signedEvidence?: unknown };
    return typeof value.signedEvidence === "string"
      ? verifyAgentTestPreviewEvidence(value.signedEvidence, env.BETTER_AUTH_SECRET)
      : null;
  } catch {
    return null;
  }
}

export async function replayAgentTestComparison(
  input: {
    workspaceId: string;
    membershipId: string;
    improvementId: string;
    idempotencyKey: string;
    origin: string;
    cookie: string | null;
  },
  db: Db = getDb(),
) {
  const existing = await db.query.agentTestComparison.findFirst({
    where: and(
      eq(agentTestComparison.workspaceId, input.workspaceId),
      eq(agentTestComparison.idempotencyKey, input.idempotencyKey),
      eq(agentTestComparison.improvementId, input.improvementId),
    ),
  });
  if (existing) return { comparison: existing, answerText: null, replayed: true };

  const improvement = await db.query.agentTestImprovement.findFirst({
    where: and(
      eq(agentTestImprovement.id, input.improvementId),
      eq(agentTestImprovement.workspaceId, input.workspaceId),
    ),
    columns: {
      id: true,
      caseId: true,
      caseSnapshot: true,
      evaluationReferences: true,
    },
  });
  if (!improvement) return null;

  const configuredOrigin = new URL(env.BETTER_AUTH_URL).origin;
  if (new URL(input.origin).origin !== configuredOrigin) {
    throw new AgentTestComparisonOriginError();
  }

  const baselineSources = improvement.evaluationReferences.sources;
  const baselineDocumentIds = [...new Set(baselineSources.map((source) => source.documentId))];
  const baselineRevisionIds = baselineSources.flatMap((source) =>
    source.revisionId ? [source.revisionId] : [],
  );
  const [baselineDocuments, baselineRevisions] = await Promise.all([
    baselineDocumentIds.length
      ? db.query.document.findMany({
          where: and(
            eq(documentTable.workspaceId, input.workspaceId),
            inArray(documentTable.id, baselineDocumentIds),
          ),
          columns: { id: true },
        })
      : Promise.resolve([]),
    baselineRevisionIds.length
      ? db.query.documentRevision.findMany({
          where: and(
            eq(documentRevision.workspaceId, input.workspaceId),
            inArray(documentRevision.id, baselineRevisionIds),
          ),
          columns: { id: true, documentId: true, revisionNumber: true },
        })
      : Promise.resolve([]),
  ]);
  const baselineDocumentsById = new Set(baselineDocuments.map((source) => source.id));
  const baselineRevisionsById = new Map(
    baselineRevisions.map((revision) => [revision.id, revision]),
  );
  const baselineIsAvailable = baselineSources.every((source) => {
    if (!baselineDocumentsById.has(source.documentId)) return false;
    if (!source.revisionId) return source.revisionNumber === null;
    const revision = baselineRevisionsById.get(source.revisionId);
    return (
      revision?.documentId === source.documentId &&
      revision.revisionNumber === source.revisionNumber
    );
  });
  if (!baselineIsAvailable) throw new AgentTestComparisonUnavailableError();

  const widget = await db.query.widget.findFirst({
    where: eq(widgetTable.workspaceId, input.workspaceId),
    columns: {
      id: true,
      publicKey: true,
      updatedAt: true,
      modelProvider: true,
      modelName: true,
    },
  });
  if (!widget) throw new AgentTestComparisonUnavailableError();

  const comparisonId = randomUUID();
  const [reservation] = await db
    .insert(agentTestComparison)
    .values({
      id: comparisonId,
      workspaceId: input.workspaceId,
      improvementId: improvement.id,
      idempotencyKey: input.idempotencyKey,
      caseSnapshot: improvement.caseSnapshot,
      baselineReferences: improvement.evaluationReferences,
      baselineOutcome: "mismatch",
      createdByMembershipId: input.membershipId,
    })
    .onConflictDoNothing()
    .returning({ id: agentTestComparison.id });
  if (!reservation) {
    const duplicate = await db.query.agentTestComparison.findFirst({
      where: and(
        eq(agentTestComparison.workspaceId, input.workspaceId),
        eq(agentTestComparison.idempotencyKey, input.idempotencyKey),
        eq(agentTestComparison.improvementId, input.improvementId),
      ),
    });
    return duplicate ? { comparison: duplicate, answerText: null, replayed: true } : null;
  }

  try {
    const url = new URL(
      `/api/widget/${encodeURIComponent(widget.publicKey)}/chat`,
      configuredOrigin,
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(input.cookie ? { cookie: input.cookie } : {}),
      },
      body: JSON.stringify({
        sessionId: randomUUID(),
        interactionId: randomUUID(),
        visitorId: null,
        message: improvement.caseSnapshot.prompt,
        history: [{ role: "user", content: improvement.caseSnapshot.prompt }],
        leadInfo: null,
        preview: true,
        previewRunId: comparisonId,
        previewCaseId: improvement.caseId,
      }),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new Error("Preview request failed.");
    const evidence = readPreviewEvidence(response);
    if (
      !evidence ||
      evidence.workspaceId !== input.workspaceId ||
      evidence.runId !== comparisonId ||
      evidence.caseId !== improvement.caseId ||
      evidence.prompt !== improvement.caseSnapshot.prompt
    ) {
      throw new Error("Preview evidence could not be verified.");
    }

    if (widget.modelProvider !== "OPENAI" && widget.modelProvider !== "GOOGLE") {
      throw new Error("The current model configuration is unavailable.");
    }
    const currentIdentity = resolveAgentTestModelIdentity(
      {
        id: widget.id,
        updatedAt: widget.updatedAt,
        modelProvider: widget.modelProvider,
        modelName: widget.modelName,
      },
      { provider: env.WIDGET_MODEL_PROVIDER, modelName: env.WIDGET_MODEL_NAME },
    );
    if (
      evidence.configFingerprint !== currentIdentity.configFingerprint ||
      evidence.modelProvider !== currentIdentity.modelProvider ||
      evidence.modelName !== currentIdentity.modelName
    ) {
      throw new Error("Preview used a different draft configuration.");
    }

    const revisions = evidence.sources.flatMap((source) =>
      source.revisionId ? [{ ...source, revisionId: source.revisionId }] : [],
    );
    const revisionIds = [...new Set(revisions.map((source) => source.revisionId))];
    const storedRevisions = revisionIds.length
      ? await db.query.documentRevision.findMany({
          where: and(
            eq(documentRevision.workspaceId, input.workspaceId),
            inArray(documentRevision.id, revisionIds),
          ),
          columns: { id: true, documentId: true, revisionNumber: true },
        })
      : [];
    const storedById = new Map(storedRevisions.map((revision) => [revision.id, revision]));
    if (
      !revisions.every((source) => {
        const saved = storedById.get(source.revisionId);
        return (
          saved?.documentId === source.documentId && saved.revisionNumber === source.revisionNumber
        );
      })
    ) {
      throw new Error("A retrieved source revision is no longer available.");
    }

    const replayStatus = matchesAgentTestOutcome(
      improvement.caseSnapshot.expectedOutcome,
      evidence,
      improvement.caseSnapshot.expectedSourceIds,
    )
      ? "passed"
      : "mismatch";
    const streamText = readSseText(await response.text());
    const answerText = evidence.outcome === "answer" ? streamText : null;
    const completion = new Date().toISOString();
    const [comparison] = await db
      .update(agentTestComparison)
      .set({
        replayReferences: {
          configFingerprint: evidence.configFingerprint,
          modelProvider: evidence.modelProvider,
          modelName: evidence.modelName,
          sources: evidence.sources,
        },
        replayOutcome: evidence.outcome,
        replayStatus,
        status: "COMPLETE",
        completedAt: completion,
      })
      .where(
        and(
          eq(agentTestComparison.id, comparisonId),
          eq(agentTestComparison.workspaceId, input.workspaceId),
          eq(agentTestComparison.status, "PENDING"),
        ),
      )
      .returning();
    if (!comparison) throw new Error("Comparison reservation could not be completed.");
    return { comparison, answerText, replayed: false };
  } catch {
    await db
      .update(agentTestComparison)
      .set({ status: "ERROR", errorCode: "replay_failed", completedAt: new Date().toISOString() })
      .where(
        and(
          eq(agentTestComparison.id, comparisonId),
          eq(agentTestComparison.workspaceId, input.workspaceId),
          eq(agentTestComparison.status, "PENDING"),
        ),
      );
    throw new Error(
      "The single-case replay could not be verified. You can start a new comparison.",
    );
  }
}
