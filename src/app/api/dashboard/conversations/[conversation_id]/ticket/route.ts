import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { conversation, ticket, workspaceMember } from "@/lib/db/schema";

const inputSchema = z
  .object({
    title: z.string().trim().min(1).max(240).optional(),
  })
  .strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ conversation_id: string }> },
) {
  const { db, workspace, membership } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;
  if (!z.uuid().safeParse(conversationId).success) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ticket details are invalid." }, { status: 400 });
  }

  const parent = await db.query.conversation.findFirst({
    where: and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspace.id)),
    columns: { id: true, subject: true, contactId: true, assignedMemberId: true },
  });
  if (!parent) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const assignedMemberId = parent.assignedMemberId
    ? ((
        await db.query.workspaceMember.findFirst({
          where: and(
            eq(workspaceMember.id, parent.assignedMemberId),
            eq(workspaceMember.workspaceId, workspace.id),
          ),
          columns: { id: true },
        })
      )?.id ?? null)
    : null;

  const [created] = await db
    .insert(ticket)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      conversationId: parent.id,
      contactId: parent.contactId,
      title: parsed.data.title ?? (parent.subject.trim().slice(0, 240) || "Customer request"),
      status: "OPEN",
      priority: "NORMAL",
      assignedMemberId,
      createdByMembershipId: membership.id,
    })
    .onConflictDoNothing({ target: [ticket.workspaceId, ticket.conversationId] })
    .returning();

  const result =
    created ??
    (await db.query.ticket.findFirst({
      where: and(eq(ticket.workspaceId, workspace.id), eq(ticket.conversationId, parent.id)),
    }));
  if (!result) throw new Error("Ticket could not be created or retrieved.");
  return NextResponse.json({ ticket: result }, { status: created ? 201 : 200 });
}
