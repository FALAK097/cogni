import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import {
  agentTestCase,
  agentTestPublishCheck,
  document as documentTable,
  documentRevision,
  widget,
  widgetPublication,
} from "@/lib/db/schema";
import { getAgentTestSuiteVersion, matchesAgentTestOutcome } from "../input";
import {
  resolveAgentTestPublishCandidateIdentity,
  resolvePublishedAgentTestModelIdentity,
} from "../evaluation-context";
import { verifyAgentTestPreviewEvidence } from "../signed-preview-evidence";
import {
  mergeWidgetPublication,
  parseWidgetPublicationSnapshot,
} from "@/features/widget/publication";
import { isSupportedKnowledgeSourceType } from "@/features/knowledge/server/source-revisions";
import { toWidgetPublishedConfig } from "@/features/widget/server/widget-service";

export class AgentTestPublishCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentTestPublishCheckError";
  }
}

const publishCheckFields = {
  id: true,
  workspaceId: true,
  widgetId: true,
  createdByMembershipId: true,
  suiteDigest: true,
  sourceBasisDigest: true,
  basePublishedVersion: true,
  candidateFingerprint: true,
  baselineRequestDigest: true,
  candidateRequestDigest: true,
  baselineReferences: true,
  candidateReferences: true,
  status: true,
} as const;

function digestSuite(suiteVersion: string) {
  return createHash("sha256").update(suiteVersion).digest("hex");
}

async function getCurrentSourceBasisDigest(workspaceId: string, db: Db) {
  const documents = await db
    .select({
      documentId: documentTable.id,
      sourceType: documentTable.sourceType,
      status: documentTable.status,
    })
    .from(documentTable)
    .where(eq(documentTable.workspaceId, workspaceId))
    .orderBy(documentTable.id)
    .for("share");
  const revisions = await db
    .select({
      documentId: documentRevision.documentId,
      revisionId: documentRevision.id,
      revisionNumber: documentRevision.revisionNumber,
      contentSha256: documentRevision.contentSha256,
    })
    .from(documentRevision)
    .where(
      and(eq(documentRevision.workspaceId, workspaceId), eq(documentRevision.status, "CURRENT")),
    )
    .orderBy(documentRevision.documentId, documentRevision.revisionNumber)
    .for("share");
  const currentDocumentIds = new Set(revisions.map((revision) => revision.documentId));
  if (documents.some((source) => source.status === "PROCESSING")) {
    throw new AgentTestPublishCheckError(
      "Knowledge sources are still processing. Wait for them to finish before comparing or publishing.",
    );
  }
  if (
    documents.some(
      (source) =>
        source.status === "READY" &&
        isSupportedKnowledgeSourceType(source.sourceType) &&
        !currentDocumentIds.has(source.documentId),
    )
  ) {
    throw new AgentTestPublishCheckError(
      "A ready knowledge source has no current revision. Reindex it in place before comparing or publishing.",
    );
  }
  return createHash("sha256")
    .update(JSON.stringify({ workspaceId, documents, revisions }))
    .digest("hex");
}

function digestResultRequest(variant: "baseline" | "draft", results: SuiteResult[]) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        variant,
        results: [...results]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map(({ id, status, signedEvidence }) => [id, status, signedEvidence ?? null]),
      }),
    )
    .digest("hex");
}

async function findCurrentCases(workspaceId: string, db: Db) {
  const savedCases = await db.query.agentTestCase.findMany({
    where: eq(agentTestCase.workspaceId, workspaceId),
    columns: {
      id: true,
      updatedAt: true,
      prompt: true,
      expectedOutcome: true,
      expectedSourceIds: true,
    },
  });
  if (savedCases.length === 0)
    throw new AgentTestPublishCheckError("Add at least one saved test before comparing.");
  const suiteVersion = getAgentTestSuiteVersion(savedCases);
  return { savedCases, suiteVersion, suiteDigest: digestSuite(suiteVersion) };
}

async function lockWorkspaceWidget(db: Db, workspaceId: string) {
  const [saved] = await db
    .select({ id: widget.id })
    .from(widget)
    .where(eq(widget.workspaceId, workspaceId))
    .limit(1)
    .for("update");
  if (!saved) throw new AgentTestPublishCheckError("Agent configuration was not found.");
}

export function getAgentTestPublishDraftConfig(
  saved: Parameters<typeof toWidgetPublishedConfig>[0],
) {
  try {
    return toWidgetPublishedConfig(saved);
  } catch {
    throw new AgentTestPublishCheckError("Check the current agent settings before comparing.");
  }
}

export function resolveAgentTestPublishDraftIdentity(
  saved: Parameters<typeof toWidgetPublishedConfig>[0],
  config = getAgentTestPublishDraftConfig(saved),
) {
  if (saved.modelProvider !== "OPENAI" && saved.modelProvider !== "GOOGLE") {
    throw new AgentTestPublishCheckError("The current model configuration is unavailable.");
  }
  return resolveAgentTestPublishCandidateIdentity(
    { widgetId: saved.id, config },
    { provider: env.WIDGET_MODEL_PROVIDER, modelName: env.WIDGET_MODEL_NAME },
  );
}

export async function startAgentTestPublishCheck(
  workspaceId: string,
  membershipId: string,
  db: Db = getDb(),
) {
  return db.transaction(async (transaction) => {
    const tx = transaction as unknown as Db;
    await lockWorkspaceWidget(tx, workspaceId);
    const saved = await tx.query.widget.findFirst({ where: eq(widget.workspaceId, workspaceId) });
    if (!saved) throw new AgentTestPublishCheckError("Agent configuration was not found.");
    const { suiteDigest } = await findCurrentCases(workspaceId, tx);
    const sourceBasisDigest = await getCurrentSourceBasisDigest(workspaceId, tx);
    const candidateIdentity = resolveAgentTestPublishDraftIdentity(saved);
    const status = saved.publishedVersion > 0 ? "PENDING_BASELINE" : "PENDING_DRAFT";
    const [check] = await tx
      .insert(agentTestPublishCheck)
      .values({
        id: randomUUID(),
        workspaceId,
        widgetId: saved.id,
        createdByMembershipId: membershipId,
        suiteDigest,
        sourceBasisDigest,
        basePublishedVersion: saved.publishedVersion,
        candidateFingerprint: candidateIdentity.configFingerprint,
        status,
      })
      .returning({ id: agentTestPublishCheck.id });
    return {
      id: check!.id,
      suiteDigest,
      basePublishedVersion: saved.publishedVersion,
      baselineRequired: saved.publishedVersion > 0,
    };
  });
}

export async function getAgentTestPublishPreview(
  input: { workspaceId: string; membershipId: string; checkId: string; caseId: string },
  db: Db = getDb(),
) {
  const check = await db.query.agentTestPublishCheck.findFirst({
    where: and(
      eq(agentTestPublishCheck.id, input.checkId),
      eq(agentTestPublishCheck.workspaceId, input.workspaceId),
      eq(agentTestPublishCheck.createdByMembershipId, input.membershipId),
    ),
    columns: publishCheckFields,
  });
  if (!check || check.status === "COMPLETE" || check.status === "ERROR") return null;
  try {
    if ((await getCurrentSourceBasisDigest(input.workspaceId, db)) !== check.sourceBasisDigest)
      return null;
  } catch (error) {
    if (error instanceof AgentTestPublishCheckError) return null;
    throw error;
  }
  const { savedCases, suiteDigest } = await findCurrentCases(input.workspaceId, db);
  if (suiteDigest !== check.suiteDigest || !savedCases.some((item) => item.id === input.caseId)) {
    return null;
  }
  const saved = await db.query.widget.findFirst({
    where: and(eq(widget.id, check.widgetId), eq(widget.workspaceId, input.workspaceId)),
  });
  if (!saved || saved.publishedVersion !== check.basePublishedVersion) return null;
  if (check.status === "PENDING_BASELINE") {
    const [publication] = await db
      .select({
        version: widgetPublication.version,
        publishedAt: widgetPublication.publishedAt,
        config: widgetPublication.config,
      })
      .from(widgetPublication)
      .where(
        and(
          eq(widgetPublication.widgetId, saved.id),
          eq(widgetPublication.version, saved.publishedVersion),
        ),
      )
      .limit(1);
    const snapshot = parseWidgetPublicationSnapshot(publication?.config);
    if (!publication || !snapshot) return null;
    const settings = {
      ...snapshot.config,
      workspaceId: saved.workspaceId,
      publicKey: saved.publicKey,
      isEnabled: saved.isEnabled,
      authorizedDomains: JSON.parse(saved.authorizedDomains) as string[],
    };
    return {
      variant: "baseline" as const,
      settings,
      identity: resolvePublishedAgentTestModelIdentity(
        {
          widgetId: saved.id,
          version: publication.version,
          publishedAt: publication.publishedAt,
          modelProvider: snapshot.config.modelProvider,
          modelName: snapshot.config.modelName,
        },
        { provider: env.WIDGET_MODEL_PROVIDER, modelName: env.WIDGET_MODEL_NAME },
      ),
      checkId: check.id,
    };
  }
  let identity;
  let config;
  try {
    config = getAgentTestPublishDraftConfig(saved);
    identity = resolveAgentTestPublishDraftIdentity(saved, config);
  } catch (error) {
    if (error instanceof AgentTestPublishCheckError) return null;
    throw error;
  }
  if (identity.configFingerprint !== check.candidateFingerprint) return null;
  const settings = mergeWidgetPublication(config, {
    workspaceId: saved.workspaceId,
    publicKey: saved.publicKey,
    isEnabled: saved.isEnabled,
    authorizedDomains: JSON.parse(saved.authorizedDomains) as string[],
  });
  return { variant: "draft" as const, settings, identity, checkId: check.id };
}

type SuiteResult = {
  id: string;
  status: "passed" | "mismatch" | "error" | "not_run";
  signedEvidence?: string;
};

export async function recordAgentTestPublishCheckResults(
  input: {
    workspaceId: string;
    membershipId: string;
    checkId: string;
    variant: "baseline" | "draft";
    results: SuiteResult[];
  },
  db: Db = getDb(),
) {
  return db.transaction(async (tx) => {
    await lockWorkspaceWidget(tx as unknown as Db, input.workspaceId);
    const [check] = await tx
      .select()
      .from(agentTestPublishCheck)
      .where(
        and(
          eq(agentTestPublishCheck.id, input.checkId),
          eq(agentTestPublishCheck.workspaceId, input.workspaceId),
          eq(agentTestPublishCheck.createdByMembershipId, input.membershipId),
        ),
      )
      .limit(1)
      .for("update");
    if (!check)
      throw new AgentTestPublishCheckError("This suite comparison is unavailable. Start it again.");
    const requestDigest = digestResultRequest(input.variant, input.results);
    const previousReferences =
      input.variant === "baseline" ? check.baselineReferences : check.candidateReferences;
    const previousDigest =
      input.variant === "baseline" ? check.baselineRequestDigest : check.candidateRequestDigest;
    const alreadyRecorded =
      previousDigest === requestDigest &&
      previousReferences !== null &&
      previousReferences !== undefined &&
      (input.variant === "baseline"
        ? check.status === "PENDING_DRAFT" || check.status === "COMPLETE"
        : check.status === "COMPLETE");
    if (alreadyRecorded) {
      return {
        status: check.status,
        passedCount: previousReferences.results.filter((result) => result.status === "passed")
          .length,
        mismatchCount: previousReferences.results.filter((result) => result.status === "mismatch")
          .length,
      };
    }
    if (
      (await getCurrentSourceBasisDigest(input.workspaceId, tx as unknown as Db)) !==
      check.sourceBasisDigest
    )
      throw new AgentTestPublishCheckError("Knowledge changed during the comparison. Start again.");
    const expectedStatus = input.variant === "baseline" ? "PENDING_BASELINE" : "PENDING_DRAFT";
    if (check.status !== expectedStatus)
      throw new AgentTestPublishCheckError("The suite comparison is out of date. Start it again.");
    const saved = await tx.query.widget.findFirst({
      where: and(eq(widget.id, check.widgetId), eq(widget.workspaceId, input.workspaceId)),
    });
    if (!saved || saved.publishedVersion !== check.basePublishedVersion)
      throw new AgentTestPublishCheckError(
        "The published agent changed during the comparison. Start again.",
      );
    const { savedCases, suiteDigest } = await findCurrentCases(
      input.workspaceId,
      tx as unknown as Db,
    );
    if (suiteDigest !== check.suiteDigest)
      throw new AgentTestPublishCheckError(
        "Saved tests changed during the comparison. Start again.",
      );
    if (
      input.results.length !== savedCases.length ||
      new Set(input.results.map((result) => result.id)).size !== savedCases.length ||
      savedCases.some((testCase) => !input.results.some((result) => result.id === testCase.id))
    ) {
      throw new AgentTestPublishCheckError(
        "The full saved suite must finish before it can be compared.",
      );
    }

    const preview = await getAgentTestPublishPreview(
      {
        workspaceId: input.workspaceId,
        membershipId: input.membershipId,
        checkId: input.checkId,
        caseId: savedCases[0]!.id,
      },
      tx as unknown as Db,
    );
    if (!preview || preview.variant !== input.variant)
      throw new AgentTestPublishCheckError(
        "The agent configuration changed during the comparison. Start again.",
      );
    const caseById = new Map(savedCases.map((testCase) => [testCase.id, testCase]));
    const canonical = input.results.map((result) => {
      const testCase = caseById.get(result.id);
      const evidence = result.signedEvidence
        ? verifyAgentTestPreviewEvidence(result.signedEvidence, env.BETTER_AUTH_SECRET)
        : null;
      if (
        !testCase ||
        !evidence ||
        evidence.runId !== check.id ||
        evidence.caseId !== result.id ||
        evidence.workspaceId !== input.workspaceId ||
        evidence.prompt !== testCase.prompt ||
        evidence.configFingerprint !== preview.identity.configFingerprint ||
        evidence.modelProvider !== preview.identity.modelProvider ||
        evidence.modelName !== preview.identity.modelName
      ) {
        throw new AgentTestPublishCheckError(
          "The preview evidence could not be verified. Run the suite again.",
        );
      }
      const sources = evidence.sources.flatMap((source) =>
        source.revisionId && source.revisionNumber !== null
          ? [
              {
                documentId: source.documentId,
                revisionId: source.revisionId,
                revisionNumber: source.revisionNumber,
              },
            ]
          : [],
      );
      if (sources.length !== evidence.sources.length)
        throw new AgentTestPublishCheckError(
          "A retrieved source has no verifiable revision. Update knowledge and run the suite again.",
        );
      return {
        caseId: result.id,
        status: matchesAgentTestOutcome(
          testCase.expectedOutcome,
          evidence,
          testCase.expectedSourceIds ?? [],
        )
          ? ("passed" as const)
          : ("mismatch" as const),
        sources,
      };
    });
    const sourceRefs = canonical.flatMap((result) => result.sources);
    const revisionIds = [...new Set(sourceRefs.map((source) => source.revisionId))];
    if (revisionIds.length) {
      const revisions = await tx
        .select({
          id: documentRevision.id,
          documentId: documentRevision.documentId,
          revisionNumber: documentRevision.revisionNumber,
          status: documentRevision.status,
        })
        .from(documentRevision)
        .where(
          and(
            eq(documentRevision.workspaceId, input.workspaceId),
            inArray(documentRevision.id, revisionIds),
          ),
        )
        .for("share");
      const byId = new Map(revisions.map((revision) => [revision.id, revision]));
      if (
        sourceRefs.some((source) => {
          const revision = byId.get(source.revisionId);
          return (
            revision?.documentId !== source.documentId ||
            revision.revisionNumber !== source.revisionNumber ||
            revision.status !== "CURRENT"
          );
        })
      )
        throw new AgentTestPublishCheckError(
          "Knowledge changed during the comparison. Run the suite again.",
        );
    }
    const references = {
      configFingerprint: preview.identity.configFingerprint,
      modelProvider: preview.identity.modelProvider,
      modelName: preview.identity.modelName,
      results: canonical,
    };
    if (input.variant === "baseline") {
      await tx
        .update(agentTestPublishCheck)
        .set({
          baselineReferences: references,
          baselineRequestDigest: requestDigest,
          status: "PENDING_DRAFT",
        })
        .where(
          and(
            eq(agentTestPublishCheck.id, check.id),
            eq(agentTestPublishCheck.workspaceId, input.workspaceId),
          ),
        );
      return {
        status: "PENDING_DRAFT" as const,
        passedCount: canonical.filter((result) => result.status === "passed").length,
        mismatchCount: canonical.filter((result) => result.status === "mismatch").length,
      };
    }
    await tx
      .update(agentTestPublishCheck)
      .set({
        candidateReferences: references,
        candidateRequestDigest: requestDigest,
        status: "COMPLETE",
        completedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(agentTestPublishCheck.id, check.id),
          eq(agentTestPublishCheck.workspaceId, input.workspaceId),
        ),
      );
    return {
      status: "COMPLETE" as const,
      passedCount: canonical.filter((result) => result.status === "passed").length,
      mismatchCount: canonical.filter((result) => result.status === "mismatch").length,
    };
  });
}

export async function assertAgentTestPublishCheckCurrent(
  input: {
    workspaceId: string;
    widgetId: string;
    checkId: string | undefined;
    publishedVersion: number;
    candidateFingerprint: string;
  },
  db: Db,
) {
  if (!input.checkId)
    throw new AgentTestPublishCheckError(
      "Run the full saved suite against the published agent and draft before publishing.",
    );
  const check = await db.query.agentTestPublishCheck.findFirst({
    where: and(
      eq(agentTestPublishCheck.id, input.checkId),
      eq(agentTestPublishCheck.workspaceId, input.workspaceId),
      eq(agentTestPublishCheck.widgetId, input.widgetId),
    ),
  });
  if (
    !check ||
    check.status !== "COMPLETE" ||
    check.basePublishedVersion !== input.publishedVersion ||
    !check.candidateReferences ||
    check.candidateReferences.results.some((result) => result.status !== "passed")
  )
    throw new AgentTestPublishCheckError(
      "The full saved suite must pass against this draft before publishing.",
    );
  const { suiteDigest, savedCases } = await findCurrentCases(input.workspaceId, db);
  if (suiteDigest !== check.suiteDigest)
    throw new AgentTestPublishCheckError(
      "Saved tests changed after comparison. Run the suite again before publishing.",
    );
  const currentCaseIds = new Set(savedCases.map((testCase) => testCase.id));
  if (
    check.candidateReferences.results.length !== currentCaseIds.size ||
    check.candidateReferences.results.some((result) => !currentCaseIds.has(result.caseId)) ||
    (check.basePublishedVersion > 0 &&
      (!check.baselineReferences ||
        check.baselineReferences.results.length !== currentCaseIds.size ||
        check.baselineReferences.results.some((result) => !currentCaseIds.has(result.caseId))))
  ) {
    throw new AgentTestPublishCheckError(
      "This comparison does not cover the current saved suite. Run it again before publishing.",
    );
  }
  if (
    input.candidateFingerprint !== check.candidateFingerprint ||
    check.candidateReferences.configFingerprint !== input.candidateFingerprint
  )
    throw new AgentTestPublishCheckError(
      "Draft settings changed after comparison. Run the suite again before publishing.",
    );
  if ((await getCurrentSourceBasisDigest(input.workspaceId, db)) !== check.sourceBasisDigest)
    throw new AgentTestPublishCheckError(
      "Knowledge sources changed after comparison. Run the suite again before publishing.",
    );
  const sourceRefs = [
    ...(check.baselineReferences?.results.flatMap((result) => result.sources) ?? []),
    ...check.candidateReferences.results.flatMap((result) => result.sources),
  ];
  const revisionIds = [...new Set(sourceRefs.map((source) => source.revisionId))];
  if (revisionIds.length) {
    const revisions = await db
      .select({
        id: documentRevision.id,
        documentId: documentRevision.documentId,
        revisionNumber: documentRevision.revisionNumber,
        status: documentRevision.status,
      })
      .from(documentRevision)
      .where(
        and(
          eq(documentRevision.workspaceId, input.workspaceId),
          inArray(documentRevision.id, revisionIds),
        ),
      )
      .for("share");
    const byId = new Map(revisions.map((revision) => [revision.id, revision]));
    if (
      sourceRefs.some((source) => {
        const revision = byId.get(source.revisionId);
        return (
          revision?.documentId !== source.documentId ||
          revision.revisionNumber !== source.revisionNumber ||
          revision.status !== "CURRENT"
        );
      })
    )
      throw new AgentTestPublishCheckError(
        "Knowledge changed after comparison. Run the suite again before publishing.",
      );
  }
}
