import { NextResponse } from "next/server";
import { eq, and, inArray, like } from "drizzle-orm";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { document as documentTable, workflowRun } from "@/lib/db/schema";
import { enqueueDocumentProcessing } from "@/lib/jobs/ingestion";
import { deleteObject } from "@/lib/storage";
import { z } from "zod";
import { canManageWorkspace } from "@/lib/auth/permissions";

type RouteContext = { params: Promise<{ source_id: string }> };

const supportedSourceTypes = new Set(["URL", "SITEMAP", "TXT", "TEXT", "PDF", "DOCX"]);

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

  if (!supportedSourceTypes.has(source.sourceType)) {
    return NextResponse.json(
      { error: "This knowledge source type cannot be processed." },
      { status: 400 },
    );
  }

  const expectedStatus = parsed.data.action === "sync" ? "READY" : "FAILED";
  let claimed = false;
  if (typeof db.transaction === "function") {
    const { runDbWriteOperation } = await import("@/lib/db/client");
    const { lockWorkspaceSourceBasisInTransaction } =
      await import("@/features/knowledge/server/source-revisions");
    claimed = await runDbWriteOperation(db, async (transaction) => {
      await lockWorkspaceSourceBasisInTransaction(transaction, workspace.id);
      const [lockedSource] = await transaction
        .select({ id: documentTable.id, status: documentTable.status })
        .from(documentTable)
        .where(and(eq(documentTable.id, sourceId), eq(documentTable.workspaceId, workspace.id)))
        .for("update");
      if (lockedSource?.status !== expectedStatus) return false;

      const updated = await transaction
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
      return updated.length === 1;
    });
  } else {
    const [updated] = await db
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
    claimed = Boolean(updated);
  }

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

  const { runDbWriteOperation } = await import("@/lib/db/client");
  const { drainSearchItemCleanup, markDocumentRevisionsDeleted } =
    await import("@/features/knowledge/server/source-revisions");

  await runDbWriteOperation(db, async (transaction) => {
    await markDocumentRevisionsDeleted(transaction, workspace.id, sourceId);
    await transaction
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

    await transaction
      .delete(documentTable)
      .where(and(eq(documentTable.id, sourceId), eq(documentTable.workspaceId, workspace.id)));
  });
  await drainSearchItemCleanup(db, 20, workspace.id);

  return NextResponse.json({ ok: true });
}
