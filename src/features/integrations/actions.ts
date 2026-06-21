"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const providerSchema = z.enum(["GMAIL", "GOOGLE_CALENDAR", "SLACK"]);

async function updateIntegrationStatus(providerValue: FormDataEntryValue | null, status: string) {
  const parsed = providerSchema.safeParse(providerValue);

  if (!parsed.success) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  await db.integration.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider: parsed.data,
      },
    },
    create: {
      workspaceId: workspace.id,
      provider: parsed.data,
      status,
    },
    update: {
      status,
    },
  });

  revalidatePath("/integrations");
}

export async function connectIntegrationAction(formData: FormData) {
  await updateIntegrationStatus(formData.get("provider"), "CONNECTED");
}

export async function disconnectIntegrationAction(formData: FormData) {
  await updateIntegrationStatus(formData.get("provider"), "DISCONNECTED");
}
