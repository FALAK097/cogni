import { NextResponse } from "next/server";
import { eq, and, inArray, like } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { document as documentTable, workflowRun } from "@/lib/db/schema";
import { enqueueDocumentProcessing } from "@/lib/jobs/ingestion";
import { deleteObject } from "@/lib/storage";
import { z } from "zod";
import { canManageWorkspace } from "@/lib/auth/permissions";

type RouteContext = { params: Promise<{ source_id: string }> };

const updateSourceSchema = z
  .object({
    action: z.enum(["retry", "sync"]),
  })
  .strict();

export async function PATCH(request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can retry or sync knowledge sources." },
      { status: 403 },
    );
  }
  const { source_id: sourceId } = await context.params;
  const parsed = updateSourceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported source action." }, { status: 400 });
  }

  const source = await db.query.document.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, sourceId), eq(fields.workspaceId, workspace.id)),
    columns: { id: true, sourceType: true, status: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }

  if (
    parsed.data.action === "sync" &&
    source.sourceType !== "URL" &&
    source.sourceType !== "SITEMAP"
  ) {
    return NextResponse.json(
      { error: "Only website and sitemap sources can be synced." },
      { status: 400 },
    );
  }

  const expectedStatus = parsed.data.action === "sync" ? "READY" : "FAILED";
  const [claimed] = await db
    .update(documentTable)
    .set({ status: "PROCESSING", errorMessage: null, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(documentTable.id, sourceId),
        eq(documentTable.workspaceId, workspace.id),
        eq(documentTable.status, expectedStatus),
      ),
    )
    .returning({ id: documentTable.id });

  if (!claimed) {
    return NextResponse.json(
      { error: "This source changed before the action started. Refresh the list and try again." },
      { status: 409 },
    );
  }

  await enqueueDocumentProcessing({
    db,
    workspaceId: workspace.id,
    documentId: sourceId,
    idempotencyKey: `document:${parsed.data.action}:${sourceId}:${crypto.randomUUID()}`,
  });

  return NextResponse.json({ ok: true, status: "processing" }, { status: 202 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can delete knowledge sources." },
      { status: 403 },
    );
  }
  const { source_id: sourceId } = await context.params;

  const source = await db.query.document.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.id, sourceId), eq(fields.workspaceId, workspace.id)),
    columns: { id: true, storageKey: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Source not found." }, { status: 404 });
  }
  if (source.storageKey) await deleteObject(source.storageKey);

  await db
    .update(workflowRun)
    .set({
      status: "CANCELLED",
      errorMessage: "Knowledge source was deleted.",
      finishedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(workflowRun.workspaceId, workspace.id),
        eq(workflowRun.name, "document.process"),
        like(workflowRun.idempotencyKey, `%${sourceId}%`),
        inArray(workflowRun.status, ["QUEUED", "FAILED"]),
      ),
    );

  await db
    .delete(documentTable)
    .where(and(eq(documentTable.id, sourceId), eq(documentTable.workspaceId, workspace.id)));

  return NextResponse.json({ ok: true });
}
