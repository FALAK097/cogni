"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export type ContactActionState = {
  error?: string;
  savedAt?: number;
};

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter a contact name.").max(80),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  externalId: z.string().trim().max(200).optional(),
});

function parseContactForm(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("contactEmail") ?? formData.get("email"),
    externalId: formData.get("externalId") || undefined,
  });
}

export async function createContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = parseContactForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the contact details." };
  }

  const { db, workspace } = await requireDashboardContext();
  const email = parsed.data.email || null;
  const externalId = parsed.data.externalId || null;

  if (email) {
    const existing = await db.contact.findUnique({
      where: {
        workspaceId_email: {
          workspaceId: workspace.id,
          email,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return { error: "A contact with this email already exists." };
    }
  }

  if (externalId) {
    const existing = await db.contact.findUnique({
      where: {
        workspaceId_externalId: {
          workspaceId: workspace.id,
          externalId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return { error: "A contact with this external ID already exists." };
    }
  }

  const contact = await db.contact.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      email,
      externalId,
    },
  });

  revalidatePath("/dashboard/contacts");
  redirect(`/dashboard/contacts/${contact.id}`);
}

export async function updateContactAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || !contactId) {
    return { error: "Contact not found." };
  }

  const parsed = parseContactForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the contact details." };
  }

  const { db, workspace } = await requireDashboardContext();
  const contact = await db.contact.findFirst({
    where: { id: contactId, workspaceId: workspace.id },
    select: { id: true },
  });

  if (!contact) {
    return { error: "Contact not found." };
  }

  const email = parsed.data.email || null;
  const externalId = parsed.data.externalId || null;

  if (email) {
    const existing = await db.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        email,
        NOT: { id: contact.id },
      },
      select: { id: true },
    });

    if (existing) {
      return { error: "Another contact already uses this email." };
    }
  }

  if (externalId) {
    const existing = await db.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        externalId,
        NOT: { id: contact.id },
      },
      select: { id: true },
    });

    if (existing) {
      return { error: "Another contact already uses this external ID." };
    }
  }

  await db.contact.update({
    where: { id: contact.id },
    data: {
      name: parsed.data.name,
      email,
      externalId,
    },
  });

  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${contact.id}`);
  revalidatePath("/dashboard/inbox");

  return { savedAt: Date.now() };
}

export async function deleteContactAction(formData: FormData) {
  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || !contactId) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  const contact = await db.contact.findFirst({
    where: { id: contactId, workspaceId: workspace.id },
    include: {
      _count: { select: { conversations: true } },
    },
  });

  if (!contact) {
    return;
  }

  if (contact._count.conversations > 0) {
    return;
  }

  await db.contact.delete({ where: { id: contact.id } });
  revalidatePath("/dashboard/contacts");
  redirect("/dashboard/contacts");
}
