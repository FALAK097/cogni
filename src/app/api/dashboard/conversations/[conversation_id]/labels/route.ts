import { NextResponse } from "next/server";
import { z } from "zod";

import { changeConversationLabel } from "@/features/conversations/server/labels";
import { conversationLabelSchema } from "@/features/conversations/inbox-pagination";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const changeLabelSchema = z.object({
  action: z.enum(["add", "remove"]),
  label: conversationLabelSchema,
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ conversation_id: string }> },
) {
  const { db, workspace } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;
  const rawBody: unknown = await request.json().catch(() => null);
  const parsedBody = changeLabelSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Enter a label with letters, numbers, spaces, periods, underscores or hyphens." },
      { status: 400 },
    );
  }

  const result = await changeConversationLabel({
    db,
    workspaceId: workspace.id,
    conversationId,
    action: parsedBody.data.action,
    label: parsedBody.data.label,
  });

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  if (result.kind === "limit") {
    return NextResponse.json(
      { error: "A conversation can have up to 50 labels." },
      { status: 409 },
    );
  }
  return NextResponse.json({ labels: result.labels });
}
