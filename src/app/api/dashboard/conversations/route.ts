import { NextResponse } from "next/server";

import { getInboxSummary, type ParsedConversation } from "@/features/conversations/server/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const { workspace } = await requireDashboardContext();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  const summary = await getInboxSummary(workspace.id, query, status);
  const start = (page - 1) * limit;
  const slice = summary.conversations.slice(start, start + limit);

  return NextResponse.json({
    conversations: slice.map((conversation: ParsedConversation) => ({
      id: conversation.id,
      channel: conversation.channel === "WIDGET" ? "widget" : "widget",
      contactName: conversation.contact?.name ?? "Unknown",
      contactEmail: conversation.contact?.email ?? null,
      status: conversation.status,
      subject: conversation.subject,
      summary: conversation.messages[0]?.body ?? conversation.subject,
      lastMessageAt: conversation.lastMessageAt,
      assignee: conversation.assignedMember?.user.name ?? null,
    })),
    counts: summary.counts,
    pagination: {
      page,
      limit,
      total: summary.conversations.length,
      totalPages: Math.max(1, Math.ceil(summary.conversations.length / limit)),
    },
  });
}
