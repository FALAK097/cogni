import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { enqueueDocumentProcessing } from "@/lib/jobs/ingestion";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { document as documentTable } from "@/lib/db/schema";
import { z } from "zod";
import { canManageWorkspace } from "@/lib/auth/permissions";

const websiteSourcesSchema = z.object({
  url: z.union([z.url(), z.array(z.url()).min(1).max(20)]),
});

export async function POST(request: Request) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can add knowledge sources." },
      { status: 403 },
    );
  }
  const parsed = websiteSourcesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide between one and twenty valid URLs." },
      { status: 400 },
    );
  }
  const urls = Array.isArray(parsed.data.url) ? parsed.data.url : [parsed.data.url];

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

    await enqueueDocumentProcessing({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:url:${document.id}`,
    });

    created.push(document.id);
  }

  return NextResponse.json(
    { addedSources: created.length, sourceIds: created, status: "queued" },
    { status: 202 },
  );
}
