import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { deleteObject } from "@/lib/storage/index";

type RouteContext = { params: Promise<{ source_id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { source_id: sourceId } = await context.params;

  const document = await db.document.findFirst({
    where: { id: sourceId, workspaceId: workspace.id },
    select: { id: true, storageKey: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  await db.document.delete({ where: { id: document.id } });
  if (document.storageKey) {
    await deleteObject(document.storageKey);
  }

  return NextResponse.json({ ok: true });
}
