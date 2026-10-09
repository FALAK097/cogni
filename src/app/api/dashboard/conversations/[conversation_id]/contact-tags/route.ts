import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { conversation } from "@/lib/db/schema";
import { changeContactTag } from "@/features/contacts/server/contact-tags";

const contactTagChangeSchema = z.object({
  action: z.enum(["add", "remove"]),
  tag: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ conversation_id: string }> },
) {
  const { db, workspace } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;
  const rawBody: unknown = await request.json().catch(() => null);
  const parsedBody = contactTagChangeSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Enter a tag with letters, numbers, spaces, periods, underscores or hyphens." },
      { status: 400 },
    );
  }

  const conversationRow = await db.query.conversation.findFirst({
    where: and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspace.id)),
    columns: { contactId: true },
  });
  if (!conversationRow) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const result = await changeContactTag({
    db,
    workspaceId: workspace.id,
    contactId: conversationRow.contactId,
    action: parsedBody.data.action,
    tag: parsedBody.data.tag,
  });

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
  if (result.kind === "limit") {
    return NextResponse.json({ error: "A contact can have up to 50 tags." }, { status: 409 });
  }
  return NextResponse.json({ tags: result.tags });
}
