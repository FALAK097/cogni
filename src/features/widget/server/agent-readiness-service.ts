import "../../../lib/cloudflare/server-only";

import { createHash } from "node:crypto";
import * as orm from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

const { and, asc, desc, eq, gte, inArray, isNotNull, like, or } = orm;
const {
  agentTestCase,
  agentTestPublishCheck,
  conversation: conversationTable,
  document: documentTable,
  visitorSession,
  widgetPublication,
} = schema;
import * as agentTestsInput from "@/features/agent-tests/input";
import {
  getCurrentSourceBasisDigest,
  resolveAgentTestPublishDraftIdentity,
  AgentTestPublishCheckError,
} from "@/features/agent-tests/server/publish-checks";

const { getAgentTestSuiteVersion } = agentTestsInput;
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

function matchAllowedDomain(hostname: string, allowedHostname: string) {
  const normalizedHost = hostname.trim().toLowerCase();
  const normalizedAllowed = allowedHostname.trim().toLowerCase();
  if (normalizedAllowed.startsWith("*.")) {
    const root = normalizedAllowed.slice(2);
    return normalizedHost !== root && normalizedHost.endsWith(`.${root}`);
  }
  return normalizedHost === normalizedAllowed;
}

function toIsoTimestamp(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

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

  const checkMatchesPublishedVersion = Boolean(
    latestCheck &&
    (latestCheck.basePublishedVersion === saved.publishedVersion ||
      (!publication.hasUnpublishedChanges &&
        saved.publishedVersion > 0 &&
        latestCheck.basePublishedVersion === saved.publishedVersion - 1)),
  );

  let testState: ReadinessEvidenceState = "unknown";
  if (testCasesCount === 0 || !latestCheck) {
    testState = "unknown";
  } else if (
    latestCheck.candidateFingerprint !== candidateFingerprint ||
    latestCheck.sourceBasisDigest !== sourceBasisDigest ||
    latestCheck.suiteDigest !== testSuiteDigest ||
    !checkMatchesPublishedVersion
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

  // Directly query widget-session conversations (including those since current publication)
  // and human-replied conversations so non-widget or middle-of-history conversations cannot hide evidence.
  const hasLike = typeof like === "function" && typeof or === "function";
  const hasIsNotNull = typeof isNotNull === "function";
  const hasGte = typeof gte === "function";

  const widgetSessionPredicates = [
    eq(conversationTable.workspaceId, workspaceId),
    ...(hasIsNotNull ? [isNotNull(conversationTable.visitorSessionId)] : []),
  ];

  const currentPubSessionPredicates = [
    ...widgetSessionPredicates,
    ...(currentPublicationPublishedAt && hasGte
      ? [gte(conversationTable.createdAt, currentPublicationPublishedAt)]
      : []),
  ];

  const humanReplyPredicates = [
    eq(conversationTable.workspaceId, workspaceId),
    ...(hasLike
      ? [
          or(
            like(conversationTable.messages, '%"TEAM"%'),
            like(conversationTable.messages, '%"agent"%'),
            like(conversationTable.messages, '%"human"%'),
          ),
        ]
      : []),
  ];

  const [
    earliestSessionConversations,
    recentSessionConversations,
    currentPubSessionConversations,
    earliestReplyConversations,
  ] = await Promise.all([
    db
      .select({
        id: conversationTable.id,
        createdAt: conversationTable.createdAt,
        messages: conversationTable.messages,
        visitorSessionId: conversationTable.visitorSessionId,
        channel: conversationTable.channel,
      })
      .from(conversationTable)
      .where(and(...widgetSessionPredicates))
      .orderBy(asc(conversationTable.createdAt))
      .limit(100),
    db
      .select({
        id: conversationTable.id,
        createdAt: conversationTable.createdAt,
        messages: conversationTable.messages,
        visitorSessionId: conversationTable.visitorSessionId,
        channel: conversationTable.channel,
      })
      .from(conversationTable)
      .where(and(...widgetSessionPredicates))
      .orderBy(desc(conversationTable.createdAt))
      .limit(100),
    currentPublicationPublishedAt
      ? db
          .select({
            id: conversationTable.id,
            createdAt: conversationTable.createdAt,
            messages: conversationTable.messages,
            visitorSessionId: conversationTable.visitorSessionId,
            channel: conversationTable.channel,
          })
          .from(conversationTable)
          .where(and(...currentPubSessionPredicates))
          .orderBy(asc(conversationTable.createdAt))
          .limit(100)
      : Promise.resolve([]),
    db
      .select({
        id: conversationTable.id,
        createdAt: conversationTable.createdAt,
        messages: conversationTable.messages,
        visitorSessionId: conversationTable.visitorSessionId,
        channel: conversationTable.channel,
      })
      .from(conversationTable)
      .where(and(...humanReplyPredicates))
      .orderBy(asc(conversationTable.createdAt))
      .limit(50),
  ]);

  const conversationById = new Map<string, (typeof earliestSessionConversations)[number]>();
  for (const conv of [
    ...earliestSessionConversations,
    ...recentSessionConversations,
    ...currentPubSessionConversations,
    ...earliestReplyConversations,
  ]) {
    if (!conversationById.has(conv.id)) {
      conversationById.set(conv.id, conv);
    }
  }
  const conversations = [...conversationById.values()].sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  );

  const sessionIds = [
    ...new Set(
      conversations.map((c) => c.visitorSessionId).filter((id): id is string => Boolean(id)),
    ),
  ].slice(0, 300);

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

  const milestones: ActivationMilestones = {
    firstLiveQuestion: { achieved: false, timestamp: null, detail: null },
    firstHumanReply: { achieved: false, timestamp: null, detail: null },
  };

  let hasQualifyingSessionOnCurrentPublication = false;
  let hasAnyHistoricalSession = false;
  const currentPubEpoch = currentPublicationPublishedAt
    ? Date.parse(currentPublicationPublishedAt)
    : Number.NaN;

  for (const conv of conversations) {
    let parsedMessages: Array<{
      authorType?: string;
      body?: string;
      isInternal?: boolean;
      role?: string;
      content?: string;
      createdAt?: string;
    }> = [];
    try {
      const raw = JSON.parse(conv.messages || "[]");
      parsedMessages = Array.isArray(raw) ? raw : [];
    } catch {
      parsedMessages = [];
    }

    const hasVisitorQuestion = parsedMessages.some((m) => {
      const text = (typeof m.body === "string" ? m.body : m.content) ?? "";
      if (text.trim().length === 0) return false;
      return m.authorType === "VISITOR" || m.role === "user" || m.role === "visitor";
    });

    const humanReply = parsedMessages.find((m) => {
      if (m.isInternal) return false;
      const text = (typeof m.body === "string" ? m.body : m.content) ?? "";
      if (text.trim().length === 0) return false;
      return m.authorType === "TEAM" || m.role === "agent" || m.role === "human";
    });

    if (humanReply && !milestones.firstHumanReply.achieved) {
      milestones.firstHumanReply = {
        achieved: true,
        timestamp: toIsoTimestamp(humanReply.createdAt) ?? toIsoTimestamp(conv.createdAt),
        detail: `Conversation ${conv.id}`,
      };
    }

    if (conv.visitorSessionId) {
      const sess = sessionById.get(conv.visitorSessionId);
      if (sess) {
        hasAnyHistoricalSession = true;
        const domainMatches = settings.authorizedDomains.some((allowed) =>
          matchAllowedDomain(sess.hostname, allowed),
        );
        const sessionEpoch = sess.createdAt ? Date.parse(sess.createdAt) : Number.NaN;
        const isCurrentPub =
          !Number.isNaN(currentPubEpoch) &&
          !Number.isNaN(sessionEpoch) &&
          sessionEpoch >= currentPubEpoch;

        if (domainMatches && isCurrentPub && hasVisitorQuestion) {
          hasQualifyingSessionOnCurrentPublication = true;
          if (!milestones.firstLiveQuestion.achieved) {
            milestones.firstLiveQuestion = {
              achieved: true,
              timestamp: toIsoTimestamp(sess.createdAt),
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
