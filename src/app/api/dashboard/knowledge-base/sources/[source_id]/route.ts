import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { document as documentTable } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ source_id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { source_id: sourceId } = await context.params;

  const deleted = await db
    .delete(documentTable)
    .where(and(eq(documentTable.id, sourceId), eq(documentTable.workspaceId, workspace.id)))
    .returning({ id: documentTable.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
