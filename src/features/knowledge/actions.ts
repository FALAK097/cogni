"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { processDocument } from "@/features/knowledge/server/process-document";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { deleteObject, isAllowedKnowledgeUpload, saveObject } from "@/lib/storage/index";

export type KnowledgeActionState = {
  error?: string;
  savedAt?: number;
};

const urlSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceUrl: z.url(),
});

export async function addUrlSourceAction(
  _previousState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  const parsed = urlSchema.safeParse({
    title: formData.get("title"),
    sourceUrl: formData.get("sourceUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the URL details." };
  }

  const { db, workspace } = await requireDashboardContext();
  const document = await db.document.create({
    data: {
      workspaceId: workspace.id,
      title: parsed.data.title,
      sourceType: "URL",
      sourceUrl: parsed.data.sourceUrl,
      status: "PROCESSING",
    },
  });

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
    return { error: "Could not process that URL." };
  }

  revalidatePath("/knowledge-base");
  return { savedAt: Date.now() };
}

export async function uploadDocumentAction(formData: FormData) {
  const title = formData.get("title");
  const file = formData.get("file");

  if (typeof title !== "string" || !title.trim() || !(file instanceof File)) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  if (!isAllowedKnowledgeUpload(mimeType, bytes.length)) {
    return;
  }

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
      sourceType: "FILE",
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
    // Status updated inside processDocument.
  }

  revalidatePath("/knowledge-base");
}

export async function deleteDocumentAction(formData: FormData) {
  const documentId = formData.get("documentId");
  if (typeof documentId !== "string") return;

  const { db, workspace } = await requireDashboardContext();
  const document = await db.document.findFirst({
    where: { id: documentId, workspaceId: workspace.id },
    select: { storageKey: true },
  });
  if (!document) return;

  if (document.storageKey) {
    await deleteObject(document.storageKey);
  }
  await db.document.deleteMany({
    where: { id: documentId, workspaceId: workspace.id },
  });
  revalidatePath("/knowledge-base");
}
