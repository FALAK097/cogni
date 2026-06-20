import { NextResponse } from "next/server";

import { processDocument } from "@/features/knowledge/server/process-document";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { saveObject } from "@/lib/storage/index";

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const formData = await request.formData();
  const title = formData.get("title");
  const file = formData.get("file");

  if (typeof title !== "string" || !title.trim() || !(file instanceof File)) {
    return NextResponse.json({ error: "Title and file are required." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const sourceType =
    mimeType === "application/pdf"
      ? "PDF"
      : mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ? "DOCX"
        : "TXT";

  const saved = await saveObject({
    workspaceId: workspace.id,
    filename: file.name,
    mimeType,
    bytes,
  });

  const document = await db.document.create({
    data: {
      workspaceId: workspace.id,
      title: title.trim(),
      sourceType,
      storageKey: saved.storageKey,
      mimeType,
      status: "PROCESSING",
    },
  });

  try {
    await processDocument({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:upload:${document.id}`,
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

  return NextResponse.json({ documentId: document.id });
}
