import "server-only";

import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import {
  agentTestCase,
  agentTestPublishCheck,
  conversation as conversationTable,
  document as documentTable,
  visitorSession,
  widgetPublication,
} from "@/lib/db/schema";
import { getAgentTestSuiteVersion } from "@/features/agent-tests/input";
import {
  getCurrentSourceBasisDigest,
  resolveAgentTestPublishDraftIdentity,
  AgentTestPublishCheckError,
} from "@/features/agent-tests/server/publish-checks";
import {
  ensureWorkspaceWidget,
  getWidgetPublicationStatus,
  toWidgetSettings,
} from "@/features/widget/server/widget-service";
import {
  getAgentLaunchChecklist,
  getAgentPublicationReadiness,
  type ActivationMilestones,
  type EvidenceBoundReadiness,
  type ReadinessEvidenceState,
} from "@/features/widget/agent-readiness";

function digestSuite(suiteVersion: string) {
  return createHash("sha256").update(suiteVersion).digest("hex");
}

export async function getWorkspaceActivationReadiness(
  db: Db,
  workspaceId: string,
): Promise<EvidenceBoundReadiness> {
  const saved = await ensureWorkspaceWidget(db, workspaceId);
  const settings = toWidgetSettings(saved);
  const publication = await getWidgetPublicationStatus(db, saved);

  // 1. Current draft identity
  let candidateFingerprint = "";
  try {
    candidateFingerprint = resolveAgentTestPublishDraftIdentity(saved).configFingerprint;
  } catch {
    candidateFingerprint = "";
  }

  // 2. Knowledge basis
  const documents = await db
    .select({
      id: documentTable.id,
      sourceType: documentTable.sourceType,
      status: documentTable.status,
      errorMessage: documentTable.errorMessage,
    })
    .from(documentTable)
    .where(eq(documentTable.workspaceId, workspaceId));

  const readySourcesCount = documents.filter((d) => d.status === "READY").length;
  const processingSourcesCount = documents.filter((d) => d.status === "PROCESSING").length;
  const failedSourcesCount = documents.filter((d) => d.status === "FAILED").length;

  let sourceBasisDigest: string | null = null;
  try {
    sourceBasisDigest = await getCurrentSourceBasisDigest(workspaceId, db);
  } catch (error) {
    if (error instanceof AgentTestPublishCheckError) {
      sourceBasisDigest = null;
    } else {
      sourceBasisDigest = null;
    }
  }

  let knowledgeState: ReadinessEvidenceState = "unknown";
  if (failedSourcesCount > 0) {
    knowledgeState = "failed";
  } else if (processingSourcesCount > 0) {
    knowledgeState = "stale";
  } else if (readySourcesCount > 0) {
    knowledgeState = "verified";
  }

  // 3. Test suite basis
  const savedCases = await db
    .select({
      id: agentTestCase.id,
      updatedAt: agentTestCase.updatedAt,
      prompt: agentTestCase.prompt,
      expectedOutcome: agentTestCase.expectedOutcome,
      expectedSourceIds: agentTestCase.expectedSourceIds,
    })
    .from(agentTestCase)
    .where(eq(agentTestCase.workspaceId, workspaceId));

  const testCasesCount = savedCases.length;
  const suiteVersion = testCasesCount > 0 ? getAgentTestSuiteVersion(savedCases) : null;
  const testSuiteDigest = suiteVersion ? digestSuite(suiteVersion) : null;

  // 4. Latest publish check for this workspace and widget
  const [latestCheck] = await db
    .select()
    .from(agentTestPublishCheck)
    .where(
      and(
        eq(agentTestPublishCheck.workspaceId, workspaceId),
        eq(agentTestPublishCheck.widgetId, saved.id),
      ),
    )
    .orderBy(desc(agentTestPublishCheck.createdAt))
    .limit(1);

  let testState: ReadinessEvidenceState = "unknown";
  if (testCasesCount === 0 || !latestCheck) {
    testState = "unknown";
  } else if (
    latestCheck.candidateFingerprint !== candidateFingerprint ||
    latestCheck.sourceBasisDigest !== sourceBasisDigest ||
    latestCheck.suiteDigest !== testSuiteDigest ||
    latestCheck.basePublishedVersion !== saved.publishedVersion
  ) {
    testState = "stale";
  } else if (
    latestCheck.status === "ERROR" ||
    (latestCheck.candidateReferences &&
      latestCheck.candidateReferences.results.some((r) => r.status !== "passed"))
  ) {
    testState = "failed";
  } else if (
    latestCheck.status === "COMPLETE" &&
    latestCheck.candidateReferences &&
    latestCheck.candidateReferences.results.length === testCasesCount &&
    latestCheck.candidateReferences.results.every((r) => r.status === "passed")
  ) {
    testState = "verified";
  } else {
    testState = "unknown";
  }

  // 5. Publication state
  let publishState: ReadinessEvidenceState = "unknown";
  if (saved.publishedVersion === 0) {
    publishState = "unknown";
  } else if (!saved.isEnabled) {
    publishState = "failed";
  } else if (publication.hasUnpublishedChanges) {
    publishState = "stale";
  } else {
    publishState = "verified";
  }

  // 6. Installation & Milestones
  let currentPublicationPublishedAt: string | null = null;
  if (saved.publishedVersion > 0) {
    const [pub] = await db
      .select({ publishedAt: widgetPublication.publishedAt })
      .from(widgetPublication)
      .where(
        and(
          eq(widgetPublication.widgetId, saved.id),
          eq(widgetPublication.version, saved.publishedVersion),
        ),
      )
      .limit(1);
    currentPublicationPublishedAt = pub?.publishedAt ?? null;
  }

  // Find conversations strictly scoped to workspaceId
  const conversations = await db
    .select({
      id: conversationTable.id,
      createdAt: conversationTable.createdAt,
      messages: conversationTable.messages,
      visitorSessionId: conversationTable.visitorSessionId,
      channel: conversationTable.channel,
    })
    .from(conversationTable)
    .where(eq(conversationTable.workspaceId, workspaceId))
    .orderBy(asc(conversationTable.createdAt));

  const sessionIds = conversations
    .map((c) => c.visitorSessionId)
    .filter((id): id is string => Boolean(id));

  const sessions =
    sessionIds.length > 0
      ? await db
          .select({
            id: visitorSession.id,
            hostname: visitorSession.hostname,
            createdAt: visitorSession.createdAt,
          })
          .from(visitorSession)
          .where(and(eq(visitorSession.widgetId, saved.id), inArray(visitorSession.id, sessionIds)))
      : [];

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const allowedSet = new Set(settings.authorizedDomains.map((d) => d.toLowerCase()));

  const milestones: ActivationMilestones = {
    firstLiveQuestion: { achieved: false, timestamp: null, detail: null },
    firstHumanReply: { achieved: false, timestamp: null, detail: null },
  };

  let hasQualifyingSessionOnCurrentPublication = false;
  let hasAnyHistoricalSession = false;

  for (const conv of conversations) {
    let parsedMessages: Array<{ role?: string; content?: string; createdAt?: string }> = [];
    try {
      parsedMessages = JSON.parse(conv.messages || "[]");
    } catch {
      parsedMessages = [];
    }

    const hasVisitorQuestion = parsedMessages.some(
      (m) =>
        (m.role === "user" || m.role === "visitor") && m.content && m.content.trim().length > 0,
    );

    const humanReply = parsedMessages.find(
      (m) => (m.role === "agent" || m.role === "human") && m.content && m.content.trim().length > 0,
    );

    if (humanReply && !milestones.firstHumanReply.achieved) {
      milestones.firstHumanReply = {
        achieved: true,
        timestamp: conv.createdAt ? new Date(Number(conv.createdAt)).toISOString() : null,
        detail: `Conversation ${conv.id}`,
      };
    }

    if (conv.visitorSessionId) {
      const sess = sessionById.get(conv.visitorSessionId);
      if (sess) {
        hasAnyHistoricalSession = true;
        const domainMatches = allowedSet.has(sess.hostname.toLowerCase());
        const isCurrentPub =
          currentPublicationPublishedAt &&
          sess.createdAt &&
          new Date(Number(sess.createdAt)) >= new Date(currentPublicationPublishedAt);

        if (domainMatches && isCurrentPub && hasVisitorQuestion) {
          hasQualifyingSessionOnCurrentPublication = true;
          if (!milestones.firstLiveQuestion.achieved) {
            milestones.firstLiveQuestion = {
              achieved: true,
              timestamp: sess.createdAt ? new Date(Number(sess.createdAt)).toISOString() : null,
              detail: `From ${sess.hostname}`,
            };
          }
        }
      }
    }
  }

  let installState: ReadinessEvidenceState = "unknown";
  if (settings.authorizedDomains.length === 0) {
    installState = "unknown";
  } else if (!saved.isEnabled) {
    installState = "failed";
  } else if (hasQualifyingSessionOnCurrentPublication) {
    installState = "verified";
  } else if (hasAnyHistoricalSession) {
    installState = "stale";
  } else {
    installState = "unknown";
  }

  const checklist = getAgentLaunchChecklist({
    readySourcesCount,
    processingSourcesCount,
    testCasesCount,
    hasTestRun: testState === "verified",
    isEnabled: saved.isEnabled,
    hasPublishedVersion: saved.publishedVersion > 0,
    hasUnpublishedChanges: publication.hasUnpublishedChanges,
    authorizedDomainCount: settings.authorizedDomains.length,
    hasObservedSession: hasQualifyingSessionOnCurrentPublication,
    isSavingConfiguration: false,
    knowledgeState,
    testState,
    publishState,
    installState,
    milestones,
  });

  const publicationReadiness = getAgentPublicationReadiness({
    isEnabled: saved.isEnabled,
    hasPublishedVersion: saved.publishedVersion > 0,
    hasUnpublishedChanges: publication.hasUnpublishedChanges,
    authorizedDomainCount: settings.authorizedDomains.length,
    isSavingConfiguration: false,
  });

  return {
    workspaceId,
    widgetId: saved.id,
    configFingerprint: candidateFingerprint,
    sourceBasisDigest,
    testSuiteDigest,
    publishedVersion: saved.publishedVersion,
    authorizedDomains: settings.authorizedDomains,
    knowledgeState,
    testState,
    publishState,
    installState,
    milestones,
    checklist,
    publicationReadiness,
  };
}
