"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const noteSchema = z.object({
  contactId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

const tagsSchema = z.object({
  contactId: z.string().min(1),
  tags: z.string().trim().max(500),
});

export async function addContactNoteAction(formData: FormData) {
  const parsed = noteSchema.safeParse({
    contactId: formData.get("contactId"),
    body: formData.get("body"),
  });

  if (!parsed.success) return;

  const { db, session, workspace } = await requireDashboardContext();
  const contact = await db.contact.findFirst({
    where: { id: parsed.data.contactId, workspaceId: workspace.id },
    select: { id: true },
  });

  if (!contact) return;

  await db.contactNote.create({
    data: {
      contactId: contact.id,
      authorUserId: session.user.id,
      body: parsed.data.body,
    },
  });

  revalidatePath(`/dashboard/contacts/${contact.id}`);
}

export async function updateContactTagsAction(formData: FormData) {
  const parsed = tagsSchema.safeParse({
    contactId: formData.get("contactId"),
    tags: formData.get("tags"),
  });

  if (!parsed.success) return;

  const { db, workspace } = await requireDashboardContext();
  const tags = parsed.data.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);

  await db.contact.updateMany({
    where: { id: parsed.data.contactId, workspaceId: workspace.id },
    data: { tags: JSON.stringify(tags) },
  });

  revalidatePath(`/dashboard/contacts/${parsed.data.contactId}`);
}
