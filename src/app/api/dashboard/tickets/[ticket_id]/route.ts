import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { ticket, workspaceMember } from "@/lib/db/schema";

const inputSchema = z
  .object({
    title: z.string().trim().min(1).max(240).optional(),
    status: z.enum(["OPEN", "PENDING", "RESOLVED"]).optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    assignedMemberId: z.uuid().nullable().optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: { params: Promise<{ ticket_id: string }> }) {
  const { db, workspace } = await requireDashboardContext();
  const { ticket_id: ticketId } = await context.params;
  if (!z.uuid().safeParse(ticketId).success) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ticket details are invalid." }, { status: 400 });
  }

  const { assignedMemberId, ...fields } = parsed.data;
  if (assignedMemberId) {
    const member = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.id, assignedMemberId),
        eq(workspaceMember.workspaceId, workspace.id),
      ),
      columns: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Assignee not found." }, { status: 404 });
  }

  const [updated] = await db
    .update(ticket)
    .set({
      ...fields,
      ...(assignedMemberId !== undefined ? { assignedMemberId } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(ticket.id, ticketId), eq(ticket.workspaceId, workspace.id)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  return NextResponse.json({ ticket: updated });
}
