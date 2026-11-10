import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { deleteInboxSavedView } from "@/features/conversations/server/saved-views";

export async function DELETE(_request: Request, context: { params: Promise<{ view_id: string }> }) {
  const { workspace, membership } = await requireDashboardContext();
  const { view_id: viewId } = await context.params;
  if (!z.string().uuid().safeParse(viewId).success) {
    return NextResponse.json({ error: "Saved view not found." }, { status: 404 });
  }

  const deleted = await deleteInboxSavedView(
    workspace.id,
    viewId,
    membership.id,
    membership.role === "OWNER",
  );
  if (!deleted) {
    return NextResponse.json({ error: "Saved view not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
