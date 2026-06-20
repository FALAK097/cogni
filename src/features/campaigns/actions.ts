"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createCampaign, updateCampaign } from "@/features/campaigns/server/campaign-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const createSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required."),
  description: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
});

const updateSchema = createSchema.extend({
  campaignId: z.string().min(1),
});

export async function createCampaignAction(formData: FormData) {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    instructions: formData.get("instructions") ?? undefined,
  });

  if (!parsed.success) {
    redirect("/campaigns/new?error=invalid");
  }

  const { db, workspace } = await requireDashboardContext();
  const campaign = await createCampaign(db, workspace.id, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    instructions: parsed.data.instructions ?? null,
  });

  revalidatePath("/campaigns");
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaignAction(formData: FormData) {
  const parsed = updateSchema.safeParse({
    campaignId: formData.get("campaignId"),
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    instructions: formData.get("instructions") ?? undefined,
  });

  if (!parsed.success) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  await updateCampaign(db, workspace.id, parsed.data.campaignId, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    instructions: parsed.data.instructions ?? null,
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${parsed.data.campaignId}`);
}
