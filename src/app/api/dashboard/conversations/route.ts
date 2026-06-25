import { NextResponse } from "next/server";

import {
  getInboxSummary,
  mapConversationToListItem,
} from "@/features/conversations/server/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET(request: Request) {
  const { workspace, membership } = await requireDashboardContext();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("search") ?? undefined;
  const filter = searchParams.get("filter") ?? "all";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  const summary = await getInboxSummary(
    workspace.id,
    query,
    filter === "all" ? undefined : filter,
    membership.id,
  );
  const start = (page - 1) * limit;
  const slice = summary.conversations.slice(start, start + limit);

  return NextResponse.json({
    conversations: slice.map(mapConversationToListItem),
    counts: summary.counts,
    currentMembershipId: membership.id,
    pagination: {
      page,
      limit,
      total: summary.conversations.length,
      pages: Math.max(1, Math.ceil(summary.conversations.length / limit)),
    },
  });
}
