import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { parseToolInput } from "@/features/integrations/server/tool-registry";
import type { Db } from "@/lib/db/client";
import { approvalRequest } from "@/lib/db/schema";
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

function tokensMatch(left: string, rightHash: string) {
  const leftBuffer = Buffer.from(hashToken(left), "hex");
  const rightBuffer = Buffer.from(rightHash, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
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
    .returning();

  return { approval, token };
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
  if (approval.status !== "PENDING") return approval;
  if (new Date(approval.expiresAt).getTime() <= Date.now()) {
    await db
      .update(approvalRequest)
      .set({ status: "EXPIRED", decidedAt: new Date().toISOString() })
      .where(and(eq(approvalRequest.id, approvalId), eq(approvalRequest.workspaceId, workspaceId)));
    throw new Error("Approval request expired.");
  }
  if (!tokensMatch(token, approval.tokenHash)) throw new Error("Invalid approval token.");

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
  return updated ?? approval;
}
