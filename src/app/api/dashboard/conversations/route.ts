import { NextResponse } from "next/server";

import { getInboxPage, mapConversationToListItem } from "@/features/conversations/server/queries";
import { parseInboxListParams } from "@/features/conversations/inbox-pagination";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  const { searchParams } = new URL(request.url);
  const parsed = parseInboxListParams(searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await getInboxPage(workspace.id, {
    query: parsed.data.search,
    filter: parsed.data.filter === "all" ? undefined : parsed.data.filter,
    membershipId: membership.id,
    channel: parsed.data.channel,
    assignee: parsed.data.assignee,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  });

  return NextResponse.json({
    conversations: result.conversations.map(mapConversationToListItem),
    counts: result.counts,
    currentMembershipId: membership.id,
    pagination: result.pagination,
  });
}
