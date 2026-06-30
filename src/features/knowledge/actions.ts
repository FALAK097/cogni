"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { document as documentTable } from "@/lib/db/schema";
import { processDocument } from "@/features/knowledge/server/process-document";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";
import { deleteObject, isAllowedKnowledgeUpload, saveObject } from "@/lib/storage/index";

export type KnowledgeActionState = {
  error?: string;
  savedAt?: number;
};

const urlSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceUrl: z.url(),
});

const sitemapSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceUrl: z.url(),
});

const manualTextSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(100_000),
});

export async function addUrlSourceAction(
  _previousState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  await requireAuth();
  const { db, workspace } = await requireDashboardContext();

  const parsed = urlSchema.safeParse({
    title: formData.get("title"),
    sourceUrl: formData.get("sourceUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the URL details." };
  }

  const [document] = await db
    .insert(documentTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title: parsed.data.title,
      sourceType: "URL",
      sourceUrl: parsed.data.sourceUrl,
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
    return { error: "Could not process that URL." };
  }

  revalidatePath("/knowledge-base");
  return { savedAt: Date.now() };
}

export async function uploadDocumentAction(formData: FormData) {
  await requireAuth();
  const { db, workspace } = await requireDashboardContext();

  const title = formData.get("title");
  const file = formData.get("file");

  if (typeof title !== "string" || !title.trim() || !(file instanceof File)) {
    return;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  if (!isAllowedKnowledgeUpload(mimeType, bytes.length)) {
    return;
  }
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

  const [document] = await db
    .insert(documentTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title: title.trim(),
      sourceType,
      storageKey: saved.storageKey,
      mimeType,
      status: "PROCESSING",
      updatedAt: new Date().toISOString(),
    })
    .returning();

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

export async function addManualTextSourceAction(
  _previousState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  await requireAuth();
  const { db, workspace } = await requireDashboardContext();

  const parsed = manualTextSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the text details." };
  }

  const contentBytes = Buffer.from(parsed.data.content, "utf8");
  const saved = await saveObject({
    workspaceId: workspace.id,
    filename: `${parsed.data.title}.txt`,
    mimeType: "text/plain",
    bytes: contentBytes,
  });

  const [document] = await db
    .insert(documentTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title: parsed.data.title,
      sourceType: "TXT",
      storageKey: saved.storageKey,
      mimeType: "text/plain",
      status: "PROCESSING",
      updatedAt: new Date().toISOString(),
    })
    .returning();

  try {
    await processDocument({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:manual:${document.id}`,
    });
    await emitDomainEvent({
      db,
      workspaceId: workspace.id,
      type: "document.ready",
      entityId: document.id,
    });
  } catch {
    return { error: "Could not process that text." };
  }

  revalidatePath("/knowledge-base");
  return { savedAt: Date.now() };
}

export async function importSitemapSourceAction(
  _previousState: KnowledgeActionState,
  formData: FormData,
): Promise<KnowledgeActionState> {
  await requireAuth();
  const { db, workspace } = await requireDashboardContext();

  const parsed = sitemapSchema.safeParse({
    title: formData.get("title"),
    sourceUrl: formData.get("sourceUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the sitemap details." };
  }

  const [document] = await db
    .insert(documentTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title: parsed.data.title,
      sourceType: "SITEMAP",
      sourceUrl: parsed.data.sourceUrl,
      status: "PROCESSING",
      updatedAt: new Date().toISOString(),
    })
    .returning();

  try {
    await processDocument({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:sitemap:${document.id}`,
    });
    await emitDomainEvent({
      db,
      workspaceId: workspace.id,
      type: "document.ready",
      entityId: document.id,
    });
  } catch {
    return { error: "Could not process that sitemap." };
  }

  revalidatePath("/knowledge-base");
  return { savedAt: Date.now() };
}

export async function deleteDocumentAction(formData: FormData) {
  await requireAuth();
  const { db, workspace } = await requireDashboardContext();

  const documentId = formData.get("documentId");
  if (typeof documentId !== "string") return;

  const document = await db.query.document.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, documentId), eq(fields.workspaceId, workspace.id)),
    columns: { storageKey: true },
  });
  if (!document) return;

  if (document.storageKey) {
    await deleteObject(document.storageKey);
  }
  await db
    .delete(documentTable)
    .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspace.id)));
  revalidatePath("/knowledge-base");
}
