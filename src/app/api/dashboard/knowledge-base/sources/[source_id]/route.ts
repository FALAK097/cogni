import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

type RouteContext = { params: Promise<{ source_id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { source_id: sourceId } = await context.params;

  const deleted = await db.document.deleteMany({
    where: { id: sourceId, workspaceId: workspace.id },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
