"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { APP_ROUTES } from "@/features/navigation/app-routes";
import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";
import { workspace as workspaceTable } from "@/lib/db/schema";

export type WorkspaceActionState = {
  error?: string;
  savedAt?: number;
};

const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name.").max(80),
  timezone: z.string().trim().min(1, "Enter a timezone.").max(80),
  logo: z.union([z.literal(""), z.url()]),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color."),
});

export async function updateWorkspaceSettingsAction(
  _previousState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  await requireAuth();
  const { db, membership, workspace } = await requireDashboardContext();

  const parsed = workspaceSettingsSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    logo: formData.get("logo"),
    brandColor: formData.get("brandColor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the workspace settings." };
  }

  if (membership.role !== "OWNER") {
    return { error: "Only workspace owners can change these settings." };
  }

  await db
    .update(workspaceTable)
    .set({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      logo: parsed.data.logo || null,
      brandColor: parsed.data.brandColor,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(workspaceTable.id, workspace.id));

  revalidatePath(APP_ROUTES.insights);
  revalidatePath(APP_ROUTES.settings);

  return { savedAt: Date.now() };
}
