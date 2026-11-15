import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { parseToolInput } from "@/features/integrations/server/tool-registry";
import { type Db, runDbWriteOperation } from "@/lib/db/client";
import { approvalRequest, workflowRun, workflowStep } from "@/lib/db/schema";
import { env } from "@/lib/env/server";

const approvalLifetimeMs = 30 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signApprovalToken(approvalId: string, expiresAt: string) {
  const payload = `${approvalId}.${new Date(expiresAt).getTime()}`;
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function getApprovalToken(approval: { id: string; expiresAt: string }) {
  return signApprovalToken(approval.id, approval.expiresAt);
}

function tokensMatch(left: string, rightHash: string) {
  const leftBuffer = Buffer.from(hashToken(left), "hex");
  const rightBuffer = Buffer.from(rightHash, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function expireApprovalRequest({
  db,
  workspaceId,
  approval,
}: {
  db: Db;
  workspaceId: string;
  approval: {
    id: string;
    status: string;
    workflowRunId: string | null;
    workflowStepId: string | null;
  };
}) {
  if (approval.status !== "PENDING") return false;
  const now = new Date().toISOString();
  return runDbWriteOperation(db, async (tx) => {
    const [expired] = await tx
      .update(approvalRequest)
      .set({ status: "EXPIRED", decidedAt: now })
      .where(
        and(
          eq(approvalRequest.id, approval.id),
          eq(approvalRequest.workspaceId, workspaceId),
          eq(approvalRequest.status, "PENDING"),
        ),
      )
      .returning({ id: approvalRequest.id });
    if (!expired) return false;

    if (approval.workflowStepId) {
      await tx
        .update(workflowStep)
        .set({
          status: "CANCELLED",
          errorMessage: "Approval request expired.",
          finishedAt: now,
        })
        .where(
          and(
            eq(workflowStep.id, approval.workflowStepId),
            eq(workflowStep.workspaceId, workspaceId),
            eq(workflowStep.status, "WAITING_APPROVAL"),
          ),
        );
    }
    if (approval.workflowRunId) {
      const run = await tx.query.workflowRun.findFirst({
        where: (fields, { and, eq }) =>
          and(eq(fields.id, approval.workflowRunId!), eq(fields.workspaceId, workspaceId)),
        columns: { name: true },
      });
      await tx
        .update(workflowRun)
        .set({
          status: "CANCELLED",
          errorMessage: "Approval request expired.",
          finishedAt: now,
          ...(run?.name === "appointment.booking" ? { idempotencyKey: null } : {}),
        })
        .where(
          and(
            eq(workflowRun.id, approval.workflowRunId),
            eq(workflowRun.workspaceId, workspaceId),
            eq(workflowRun.status, "WAITING_APPROVAL"),
          ),
        );
    }
    return true;
  });
}

export async function createApprovalRequest({
  db,
  workspaceId,
  actionType,
  input,
  summary,
  conversationId,
  workflowRunId,
  workflowStepId,
  agentRunId,
}: {
  db: Db;
  workspaceId: string;
  actionType: string;
  input: unknown;
  summary: string;
  conversationId?: string;
  workflowRunId?: string;
  workflowStepId?: string;
  agentRunId?: string;
}) {
  const parsed = parseToolInput(actionType, input);
  const approvalId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + approvalLifetimeMs).toISOString();
  const token = signApprovalToken(approvalId, expiresAt);
  const [approval] = await db
    .insert(approvalRequest)
    .values({
      id: approvalId,
      workspaceId,
      actionType: parsed.tool.actionType,
      riskLevel: parsed.tool.riskLevel,
      summary,
      payload: JSON.stringify(parsed.input),
      tokenHash: hashToken(token),
      expiresAt,
      conversationId,
      workflowRunId,
      workflowStepId,
      requestedByAgentRunId: agentRunId,
    })
    .onConflictDoNothing()
    .returning();

  if (!approval && workflowStepId) {
    const existing = await db.query.approvalRequest.findFirst({
      where: (fields, { and, eq }) =>
        and(eq(fields.workspaceId, workspaceId), eq(fields.workflowStepId, workflowStepId)),
    });
    if (existing) return { approval: existing, token: getApprovalToken(existing), created: false };
  }
  if (!approval) throw new Error("Approval request could not be created.");

  return { approval, token, created: true };
}

export async function decideApprovalRequest({
  db,
  workspaceId,
  approvalId,
  token,
  decision,
  userId,
}: {
  db: Db;
  workspaceId: string;
  approvalId: string;
  token: string;
  decision: "APPROVED" | "REJECTED";
  userId: string;
}) {
  const approval = await db.query.approvalRequest.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, approvalId), eq(fields.workspaceId, workspaceId)),
  });
  if (!approval) throw new Error("Approval request not found.");
  if (new Date(approval.expiresAt).getTime() <= Date.now()) {
    await expireApprovalRequest({ db, workspaceId, approval });
    throw new Error("Approval request expired.");
  }
  if (!tokensMatch(token, approval.tokenHash)) throw new Error("Invalid approval token.");
  if (approval.status !== "PENDING") return approval;

  const [updated] = await db
    .update(approvalRequest)
    .set({ status: decision, decidedAt: new Date().toISOString(), decidedByUserId: userId })
    .where(
      and(
        eq(approvalRequest.id, approvalId),
        eq(approvalRequest.workspaceId, workspaceId),
        eq(approvalRequest.status, "PENDING"),
      ),
    )
    .returning();
  if (updated) return updated;
  const current = await db.query.approvalRequest.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, approvalId), eq(fields.workspaceId, workspaceId)),
  });
  if (!current) throw new Error("Approval request not found.");
  return current;
}
