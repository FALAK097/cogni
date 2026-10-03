"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { document as documentTable } from "@/lib/db/schema";
import { enqueueDocumentProcessing } from "@/lib/jobs/ingestion";
import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { deleteObject, isAllowedKnowledgeUpload, saveObject } from "@/lib/storage/index";
import {
  inferKnowledgeMimeType,
  knowledgeSourceTypeFromMime,
} from "@/features/knowledge/server/mime";

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
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return { error: "Only workspace owners can change knowledge sources." };
  }

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
    await enqueueDocumentProcessing({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:url:${document.id}`,
    });
  } catch {
    return { error: "Could not process that URL." };
  }

  revalidatePath("/knowledge-base");
  return { savedAt: Date.now() };
}

export async function uploadDocumentAction(formData: FormData) {
  await requireAuth();
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return { error: "Only workspace owners can change knowledge sources." };
  }

  const rawTitle = formData.get("title");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const title =
    typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : file.name.trim() || null;

  if (!title) {
    return;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = inferKnowledgeMimeType(file.name, file.type || "application/octet-stream");
  if (!isAllowedKnowledgeUpload(mimeType, bytes.length)) {
    return;
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

  try {
    await enqueueDocumentProcessing({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:upload:${document.id}`,
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
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return { error: "Only workspace owners can change knowledge sources." };
  }

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
    await enqueueDocumentProcessing({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:manual:${document.id}`,
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
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return { error: "Only workspace owners can change knowledge sources." };
  }

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
    await enqueueDocumentProcessing({
      db,
      workspaceId: workspace.id,
      documentId: document.id,
      idempotencyKey: `document:sitemap:${document.id}`,
    });
  } catch {
    return { error: "Could not process that sitemap." };
  }

  revalidatePath("/knowledge-base");
  return { savedAt: Date.now() };
}

export async function deleteDocumentAction(formData: FormData) {
  await requireAuth();
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return { error: "Only workspace owners can change knowledge sources." };
  }

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
