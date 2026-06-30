"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { randomUUID } from "node:crypto";
import { integration as integrationTable } from "@/lib/db/schema";
import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";

const providerSchema = z.enum(["GMAIL", "GOOGLE_CALENDAR", "SLACK"]);

async function updateIntegrationStatus(providerValue: FormDataEntryValue | null, status: string) {
  await requireAuth();
  const parsed = providerSchema.safeParse(providerValue);

  if (!parsed.success) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  await db
    .insert(integrationTable)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      provider: parsed.data,
      status,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [integrationTable.workspaceId, integrationTable.provider],
      set: {
        status,
        updatedAt: new Date().toISOString(),
      },
    });

  revalidatePath("/integrations");
}

export async function connectIntegrationAction(formData: FormData) {
  await requireAuth();
  await updateIntegrationStatus(formData.get("provider"), "CONNECTED");
}

export async function disconnectIntegrationAction(formData: FormData) {
  await requireAuth();
  await updateIntegrationStatus(formData.get("provider"), "DISCONNECTED");
}
