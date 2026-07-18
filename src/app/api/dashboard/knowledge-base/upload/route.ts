import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { enqueueDocumentProcessing } from "@/lib/jobs/ingestion";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import {
  inferKnowledgeMimeType,
  knowledgeSourceTypeFromMime,
} from "@/features/knowledge/server/mime";
import { isAllowedKnowledgeUpload, saveObject } from "@/lib/storage/index";
import { document as documentTable } from "@/lib/db/schema";

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const formData = await request.formData();
  const rawTitle = formData.get("title");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  const title =
    typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : file.name.trim() || null;

  if (!title) {
    return NextResponse.json({ error: "A file name is required." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = inferKnowledgeMimeType(file.name, file.type || "application/octet-stream");
  if (!isAllowedKnowledgeUpload(mimeType, bytes.length)) {
    return NextResponse.json(
      { error: "Upload a PDF, DOCX, or text file up to 10 MB." },
      { status: 400 },
    );
  }
  const sourceType = knowledgeSourceTypeFromMime(mimeType);

  const saved = await saveObject({
    workspaceId: workspace.id,
    filename: file.name,
    mimeType,
    bytes,
  });

  const [document] = await db
    .insert(documentTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title,
      sourceType,
      storageKey: saved.storageKey,
      mimeType,
      status: "PROCESSING",
      updatedAt: new Date().toISOString(),
    })
    .returning();

  const job = await enqueueDocumentProcessing({
    db,
    workspaceId: workspace.id,
    documentId: document.id,
    idempotencyKey: `document:upload:${document.id}`,
  });

  return NextResponse.json({ documentId: document.id, job }, { status: 202 });
}
