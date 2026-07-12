import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { document as documentTable } from "@/lib/db/schema";
import { enqueueDocumentProcessing } from "@/lib/jobs/ingestion";
import { z } from "zod";

type RouteContext = { params: Promise<{ source_id: string }> };

const updateSourceSchema = z.object({
  action: z.literal("retry"),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { source_id: sourceId } = await context.params;
  const parsed = updateSourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported source action." }, { status: 400 });
  }

  const source = await db.query.document.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, sourceId), eq(fields.workspaceId, workspace.id)),
    columns: { id: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  await db
    .update(documentTable)
    .set({ status: "PROCESSING", errorMessage: null, updatedAt: new Date().toISOString() })
    .where(and(eq(documentTable.id, sourceId), eq(documentTable.workspaceId, workspace.id)));

  await enqueueDocumentProcessing({
    db,
    workspaceId: workspace.id,
    documentId: sourceId,
    idempotencyKey: `document:retry:${sourceId}:${crypto.randomUUID()}`,
  });

  return NextResponse.json({ ok: true, status: "processing" });
}

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
