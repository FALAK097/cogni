"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createWorkspaceForUser } from "@/lib/auth/create-workspace";
import { requireAuth } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name.").max(80),
});

export type CreateWorkspaceState = {
  error?: string;
};

export async function createWorkspaceAction(
  _previous: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const session = await requireAuth();
  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a workspace name." };
  }

  const db = getDb();
  const created = await createWorkspaceForUser(db, session.user, parsed.data.name);

  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", created.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  cookieStore.delete("active_widget_id");

  redirect("/onboarding");
}
