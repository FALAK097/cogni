import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import {
  createInboxSavedView,
  InboxSavedViewAssigneeError,
  InboxSavedViewNameConflictError,
  listInboxSavedViews,
} from "@/features/conversations/server/saved-views";
import { conversationLabelSchema } from "@/features/conversations/inbox-pagination";

const savedViewSchema = z.object({
  name: z.string().trim().min(1).max(40),
  filter: z.enum(["all", "unread", "unassigned", "mine", "open", "closed", "snoozed"]),
  channel: z.enum(["WIDGET", "DISCORD", "GCHAT", "SLACK", "TEAMS", "WHATSAPP"]).nullable(),
  assigneeFilter: z.string().min(1).max(128),
  labelFilter: conversationLabelSchema.nullable().optional(),
});

export async function GET() {
  const { workspace } = await requireDashboardContext();
  const views = await listInboxSavedViews(workspace.id);
  return NextResponse.json({ views });
}

export async function POST(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  const body: unknown = await request.json().catch(() => null);
  const parsed = savedViewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Saved view details are invalid." }, { status: 400 });
  }

  try {
    const view = await createInboxSavedView(workspace.id, membership.id, parsed.data);
    return NextResponse.json({ view }, { status: 201 });
  } catch (error) {
    if (
      error instanceof InboxSavedViewNameConflictError ||
      error instanceof InboxSavedViewAssigneeError
    ) {
      const status = error instanceof InboxSavedViewNameConflictError ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
