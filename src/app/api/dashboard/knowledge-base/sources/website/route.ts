import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { processDocument } from "@/features/knowledge/server/process-document";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { document as documentTable } from "@/lib/db/schema";

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const body = (await request.json()) as { url?: string | string[] };

  const urls = Array.isArray(body.url) ? body.url : body.url ? [body.url] : [];
  if (urls.length === 0) {
    return NextResponse.json({ error: "At least one URL is required." }, { status: 400 });
  }

  const created = [];

  for (const sourceUrl of urls) {
    const [document] = await db
      .insert(documentTable)
      .values({
        id: randomUUID(),
        workspaceId: workspace.id,
        title: sourceUrl,
        sourceType: "URL",
        sourceUrl,
        status: "PROCESSING",
        updatedAt: new Date().toISOString(),
      })
      .returning();

    try {
      await processDocument({
        db,
        workspaceId: workspace.id,
        documentId: document.id,
        idempotencyKey: `document:url:${document.id}`,
      });
      await emitDomainEvent({
        db,
        workspaceId: workspace.id,
        type: "document.ready",
        entityId: document.id,
      });
    } catch {
      // processDocument updates status on failure
    }

    created.push(document.id);
  }

  return NextResponse.json({ addedSources: created.length, sourceIds: created });
}
