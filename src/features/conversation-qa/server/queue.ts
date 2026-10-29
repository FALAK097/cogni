import "server-only";

import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { runDbWriteOperation } from "@/lib/db/client";
import {
  conversation,
  conversationQaEvaluation,
  conversationQaState,
  workspace,
  workflowRun,
} from "@/lib/db/schema";
import {
  CONVERSATION_QA_MAX_ATTEMPTS,
  CONVERSATION_QA_WORKFLOW_NAME,
  isConversationQaEligible,
  latestPublicMessageAt,
  buildQaWorkflowIdempotencyKey,
  buildQaWorkflowInput,
  nextConversationQaVersion,
  parsePublicQaMessages,
} from "@/features/conversation-qa/scoring";

export {
  CONVERSATION_QA_MAX_ATTEMPTS,
  CONVERSATION_QA_WORKFLOW_INPUT_SCHEMA_VERSION,
  CONVERSATION_QA_WORKFLOW_NAME,
} from "@/features/conversation-qa/scoring";

type ConversationQaWorkflowCandidate = Pick<
  typeof workflowRun.$inferSelect,
  "id" | "workspaceId" | "status" | "startedAt" | "attempts" | "maxAttempts" | "input"
>;

function safeLatestPublicAt(messagesJson: string) {
  try {
    return latestPublicMessageAt(parsePublicQaMessages(messagesJson));
  } catch {
    return null;
  }
}

async function getOrCreateState(db: Db, workspaceId: string, conversationId: string) {
  const [existing] = await db
    .select()
    .from(conversationQaState)
    .where(
      and(
        eq(conversationQaState.workspaceId, workspaceId),
        eq(conversationQaState.conversationId, conversationId),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(conversationQaState)
    .values({ workspaceId, conversationId, version: 1 })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [raced] = await db
    .select()
    .from(conversationQaState)
    .where(
      and(
        eq(conversationQaState.workspaceId, workspaceId),
        eq(conversationQaState.conversationId, conversationId),
      ),
    )
    .limit(1);
  if (!raced) throw new Error("QA state could not be initialized.");
  return raced;
}

async function recordInactivityObservation({
  db,
  workspaceId,
  conversationId,
  lastMessageAt,
  nextEligibleAt,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  lastMessageAt: string;
  nextEligibleAt: string | null;
}) {
  await getOrCreateState(db, workspaceId, conversationId);
  await db
    .update(conversationQaState)
    .set({
      lastObservedMessageAt: lastMessageAt,
      nextEligibleAt,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(conversationQaState.workspaceId, workspaceId),
        eq(conversationQaState.conversationId, conversationId),
      ),
    );
}

async function createEvaluation({
  db,
  workspaceId,
  conversationId,
  version,
  trigger,
  publicMessageAt,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  version: number;
  trigger: "CLOSED" | "INACTIVE";
  publicMessageAt: string;
}) {
  const [inserted] = await db
    .insert(conversationQaEvaluation)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      conversationId,
      version,
      trigger,
      publicMessageAt,
      status: "QUEUED",
    })
    .onConflictDoNothing({
      target: [
        conversationQaEvaluation.workspaceId,
        conversationQaEvaluation.conversationId,
        conversationQaEvaluation.version,
      ],
    })
    .returning();

  const [evaluation] = inserted
    ? [inserted]
    : await db
        .select()
        .from(conversationQaEvaluation)
        .where(
          and(
            eq(conversationQaEvaluation.workspaceId, workspaceId),
            eq(conversationQaEvaluation.conversationId, conversationId),
            eq(conversationQaEvaluation.version, version),
          ),
        )
        .limit(1);
  if (!evaluation) throw new Error("QA evaluation could not be created.");

  const idempotencyKey = buildQaWorkflowIdempotencyKey(conversationId, version);
  await db
    .insert(workflowRun)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      conversationId,
      name: CONVERSATION_QA_WORKFLOW_NAME,
      status: "QUEUED",
      idempotencyKey,
      input: JSON.stringify(buildQaWorkflowInput(evaluation.id, version)),
      maxAttempts: CONVERSATION_QA_MAX_ATTEMPTS,
    })
    .onConflictDoNothing();

  return evaluation;
}

/** Called in the close transaction. Only opaque IDs, version and trigger enter the durable queue. */
export async function enqueueClosedConversationQa({
  db,
  workspaceId,
  conversationId,
  messages,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  messages: string;
}) {
  const publicMessageAt = safeLatestPublicAt(messages);
  if (!publicMessageAt) return null;

  const state = await getOrCreateState(db, workspaceId, conversationId);
  const [latest] = await db
    .select()
    .from(conversationQaEvaluation)
    .where(
      and(
        eq(conversationQaEvaluation.workspaceId, workspaceId),
        eq(conversationQaEvaluation.conversationId, conversationId),
      ),
    )
    .orderBy(desc(conversationQaEvaluation.version))
    .limit(1);

  if (
    latest &&
    Date.parse(latest.publicMessageAt) === Date.parse(publicMessageAt) &&
    latest.version >= state.version
  ) {
    return latest;
  }

  const version = nextConversationQaVersion({
    currentVersion: state.version,
    latestVersion: latest?.version ?? null,
    latestPublicAt: latest?.publicMessageAt ?? null,
    currentPublicAt: publicMessageAt,
  });
  if (version !== state.version) {
    await db
      .update(conversationQaState)
      .set({ version, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(conversationQaState.workspaceId, workspaceId),
          eq(conversationQaState.conversationId, conversationId),
          eq(conversationQaState.version, state.version),
        ),
      );
  }

  return createEvaluation({
    db,
    workspaceId,
    conversationId,
    version,
    trigger: "CLOSED",
    publicMessageAt,
  });
}

/** Starts a fresh evaluation generation only for an actual closed -> open transition. */
export async function startConversationQaVersionAfterReopen(
  db: Db,
  workspaceId: string,
  conversationId: string,
) {
  await db
    .insert(conversationQaState)
    .values({ workspaceId, conversationId, version: 2 })
    .onConflictDoUpdate({
      target: [conversationQaState.workspaceId, conversationQaState.conversationId],
      set: {
        version: sql`${conversationQaState.version} + 1`,
        lastObservedMessageAt: null,
        nextEligibleAt: null,
        updatedAt: new Date().toISOString(),
      },
    });
}

/** Rechecks status and public-message time under a scoped row lock before inactive enqueue. */
async function enqueueInactiveConversationQa({
  db,
  workspaceId,
  conversationId,
  now,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  now: number;
}) {
  return runDbWriteOperation(db, async (transaction) => {
    const [current] = await transaction
      .select({
        status: conversation.status,
        messages: conversation.messages,
        lastMessageAt: conversation.lastMessageAt,
      })
      .from(conversation)
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
      .for("update")
      .limit(1);
    if (!current || current.status === "CLOSED") return false;

    let messages;
    try {
      messages = parsePublicQaMessages(current.messages);
    } catch {
      await recordInactivityObservation({
        db: transaction,
        workspaceId,
        conversationId,
        lastMessageAt: current.lastMessageAt,
        nextEligibleAt: null,
      });
      return false;
    }
    const publicMessageAt = latestPublicMessageAt(messages);
    if (!publicMessageAt) {
      await recordInactivityObservation({
        db: transaction,
        workspaceId,
        conversationId,
        lastMessageAt: current.lastMessageAt,
        nextEligibleAt: null,
      });
      return false;
    }
    if (
      !isConversationQaEligible({ status: current.status, latestPublicAt: publicMessageAt, now })
    ) {
      await recordInactivityObservation({
        db: transaction,
        workspaceId,
        conversationId,
        lastMessageAt: current.lastMessageAt,
        nextEligibleAt: new Date(Date.parse(publicMessageAt) + 24 * 60 * 60 * 1000).toISOString(),
      });
      return false;
    }

    const state = await getOrCreateState(transaction, workspaceId, conversationId);
    const [latest] = await transaction
      .select()
      .from(conversationQaEvaluation)
      .where(
        and(
          eq(conversationQaEvaluation.workspaceId, workspaceId),
          eq(conversationQaEvaluation.conversationId, conversationId),
        ),
      )
      .orderBy(desc(conversationQaEvaluation.version))
      .limit(1);

    let version = state.version;
    if (
      latest &&
      Date.parse(latest.publicMessageAt) === Date.parse(publicMessageAt) &&
      latest.version >= state.version
    ) {
      await recordInactivityObservation({
        db: transaction,
        workspaceId,
        conversationId,
        lastMessageAt: current.lastMessageAt,
        nextEligibleAt: null,
      });
      return false;
    }
    if (latest && state.version <= latest.version) {
      if (!["COMPLETED", "SKIPPED", "STALE"].includes(latest.status)) {
        await recordInactivityObservation({
          db: transaction,
          workspaceId,
          conversationId,
          lastMessageAt: current.lastMessageAt,
          nextEligibleAt: new Date(now + 60 * 60 * 1000).toISOString(),
        });
        return false;
      }
      const [updatedState] = await transaction
        .update(conversationQaState)
        .set({
          version: sql`${conversationQaState.version} + 1`,
          updatedAt: new Date(now).toISOString(),
        })
        .where(
          and(
            eq(conversationQaState.workspaceId, workspaceId),
            eq(conversationQaState.conversationId, conversationId),
            eq(conversationQaState.version, state.version),
          ),
        )
        .returning({ version: conversationQaState.version });
      if (!updatedState) return false;
      version = updatedState.version;
    }

    await createEvaluation({
      db: transaction,
      workspaceId,
      conversationId,
      version,
      trigger: "INACTIVE",
      publicMessageAt,
    });
    await recordInactivityObservation({
      db: transaction,
      workspaceId,
      conversationId,
      lastMessageAt: current.lastMessageAt,
      nextEligibleAt: null,
    });
    return true;
  });
}

async function claimWorkflowRun(db: Db, candidate: ConversationQaWorkflowCandidate, now: Date) {
  const staleBefore = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  const claimableStatus =
    candidate.status === "RUNNING"
      ? and(eq(workflowRun.status, "RUNNING"), lt(workflowRun.startedAt, staleBefore))
      : inArray(workflowRun.status, ["QUEUED", "FAILED"]);
  const [claimed] = await db
    .update(workflowRun)
    .set({
      status: "RUNNING",
      attempts: sql`${workflowRun.attempts} + 1`,
      startedAt: now.toISOString(),
      finishedAt: null,
      errorMessage: null,
    })
    .where(
      and(
        eq(workflowRun.id, candidate.id),
        eq(workflowRun.workspaceId, candidate.workspaceId),
        eq(workflowRun.name, CONVERSATION_QA_WORKFLOW_NAME),
        claimableStatus,
        sql`${workflowRun.attempts} < LEAST(${workflowRun.maxAttempts}, ${CONVERSATION_QA_MAX_ATTEMPTS})`,
      ),
    )
    .returning();
  return claimed ?? null;
}

async function expireExhaustedStaleRun(
  db: Db,
  candidate: ConversationQaWorkflowCandidate,
  now: Date,
) {
  if (
    candidate.status !== "RUNNING" ||
    candidate.attempts < Math.min(candidate.maxAttempts, CONVERSATION_QA_MAX_ATTEMPTS)
  ) {
    return false;
  }
  const staleBefore = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  if (Date.parse(candidate.startedAt) >= Date.parse(staleBefore)) return false;

  let evaluationId: string | null = null;
  try {
    const input: unknown = JSON.parse(candidate.input || "{}");
    if (
      typeof input === "object" &&
      input !== null &&
      "evaluationId" in input &&
      typeof input.evaluationId === "string"
    ) {
      evaluationId = input.evaluationId;
    }
  } catch {
    evaluationId = null;
  }
  if (evaluationId) {
    await db
      .update(conversationQaEvaluation)
      .set({ status: "FAILED", errorCode: "EVALUATION_FAILED", completedAt: now.toISOString() })
      .where(
        and(
          eq(conversationQaEvaluation.id, evaluationId),
          eq(conversationQaEvaluation.workspaceId, candidate.workspaceId),
        ),
      );
  }
  const [dead] = await db
    .update(workflowRun)
    .set({ status: "DEAD", errorMessage: "EVALUATION_FAILED", finishedAt: now.toISOString() })
    .where(
      and(
        eq(workflowRun.id, candidate.id),
        eq(workflowRun.workspaceId, candidate.workspaceId),
        eq(workflowRun.name, CONVERSATION_QA_WORKFLOW_NAME),
        eq(workflowRun.status, "RUNNING"),
        lt(workflowRun.startedAt, staleBefore),
      ),
    )
    .returning({ id: workflowRun.id });
  return Boolean(dead);
}

/** Scans a bounded inactive set, then claims and processes a bounded number of durable runs. */
export async function drainConversationQaQueue(db: Db, limit = 4, now = new Date()) {
  const boundedLimit = Math.max(1, Math.min(limit, 4));
  // Workspace IDs are the scheduler's only cross-tenant discovery query. All
  // conversation and workflow reads below are explicitly tenant-scoped.
  const workspaceIds = await db
    .select({ id: workspace.id })
    .from(workspace)
    .orderBy(asc(workspace.id))
    .limit(1_000);
  const workspaceScope = workspaceIds.map((tenant) => tenant.id);
  const inactiveCandidates = await db
    .select({ id: conversation.id, workspaceId: conversation.workspaceId })
    .from(conversation)
    .leftJoin(
      conversationQaState,
      and(
        eq(conversationQaState.workspaceId, conversation.workspaceId),
        eq(conversationQaState.conversationId, conversation.id),
      ),
    )
    .where(
      and(
        inArray(conversation.workspaceId, workspaceScope),
        inArray(conversation.status, ["OPEN", "ASSIGNED", "ESCALATED"]),
        or(
          isNull(conversationQaState.conversationId),
          isNull(conversationQaState.lastObservedMessageAt),
          gt(conversation.lastMessageAt, conversationQaState.lastObservedMessageAt),
          and(
            isNotNull(conversationQaState.nextEligibleAt),
            lte(conversationQaState.nextEligibleAt, now.toISOString()),
          ),
        ),
      ),
    )
    .orderBy(asc(conversation.lastMessageAt))
    .limit(100);

  let inactivityQueued = 0;
  for (const candidate of inactiveCandidates) {
    if (
      await enqueueInactiveConversationQa({
        db,
        workspaceId: candidate.workspaceId,
        conversationId: candidate.id,
        now: now.getTime(),
      })
    ) {
      inactivityQueued += 1;
    }
  }

  const candidates: ConversationQaWorkflowCandidate[] = await db
    .select({
      id: workflowRun.id,
      workspaceId: workflowRun.workspaceId,
      status: workflowRun.status,
      startedAt: workflowRun.startedAt,
      attempts: workflowRun.attempts,
      maxAttempts: workflowRun.maxAttempts,
      input: workflowRun.input,
    })
    .from(workflowRun)
    .where(
      and(
        inArray(workflowRun.workspaceId, workspaceScope),
        eq(workflowRun.name, CONVERSATION_QA_WORKFLOW_NAME),
        or(
          inArray(workflowRun.status, ["QUEUED", "FAILED"]),
          and(
            eq(workflowRun.status, "RUNNING"),
            lt(workflowRun.startedAt, new Date(now.getTime() - 20 * 60 * 1000).toISOString()),
          ),
        ),
      ),
    )
    .orderBy(asc(workflowRun.startedAt))
    .limit(boundedLimit);

  let processed = 0;
  for (const candidate of candidates) {
    if (await expireExhaustedStaleRun(db, candidate, now)) continue;
    const claimed = await claimWorkflowRun(db, candidate, now);
    if (!claimed) continue;
    processed += 1;
    const { processConversationQaWorkflow } =
      await import("@/features/conversation-qa/server/scorer");
    await processConversationQaWorkflow({ db, run: claimed, now });
  }

  return { inactivityQueued, processed };
}
