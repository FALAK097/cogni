import type { Db } from "@/lib/db/client";
import { workspace, workspaceMember } from "@/lib/db/schema";

function workspaceSlug(name: string, userId: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  return `${base || "workspace"}-${userId.slice(0, 8)}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function createWorkspaceForUser(
  db: Db,
  user: { id: string; name: string },
  workspaceName: string,
) {
  const slug = workspaceSlug(workspaceName, user.id);
  const now = new Date().toISOString();

  const [createdWorkspace] = await db
    .insert(workspace)
    .values({
      id: crypto.randomUUID(),
      name: workspaceName.trim(),
      slug,
      updatedAt: now,
    })
    .returning();

  await db.insert(workspaceMember).values({
    id: crypto.randomUUID(),
    userId: user.id,
    workspaceId: createdWorkspace.id,
    role: "OWNER",
    updatedAt: now,
  });

  return createdWorkspace;
}
