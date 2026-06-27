"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { user } from "@/lib/db/schema";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export type ProfileActionState = {
  error?: string;
  savedAt?: number;
};

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid name." };
  }

  const { db, session } = await requireDashboardContext();
  await db
    .update(user)
    .set({ name: parsed.data.name, updatedAt: new Date().toISOString() })
    .where(eq(user.id, session.user.id));

  revalidatePath("/dashboard/settings");
  return { savedAt: Date.now() };
}
