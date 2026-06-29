import type { Db } from "@/lib/db/client";
import { workspace, workspaceMember } from "@/lib/db/schema";

function workspaceSlug(name: string, userId: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  return `${base || "workspace"}-${userId.slice(0, 8)}`;
}

export async function ensureDefaultWorkspace(db: Db, user: { id: string; name: string }) {
  const existingMembership = await db.query.workspaceMember.findFirst({
    where: (member, { eq }) => eq(member.userId, user.id),
    with: { workspace: true },
  });

  if (existingMembership) {
    return existingMembership.workspace;
  }

  const slug = workspaceSlug(user.name, user.id);
  const now = new Date().toISOString();

  const workspaces = await db
    .insert(workspace)
    .values({
      id: crypto.randomUUID(),
      name: `${user.name}'s workspace`,
      slug,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workspace.slug,
      set: {
        name: `${user.name}'s workspace`,
        updatedAt: now,
      },
    })
    .returning();

  const createdWorkspace = workspaces[0];

  await db
    .insert(workspaceMember)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      workspaceId: createdWorkspace.id,
      role: "OWNER",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workspaceMember.userId, workspaceMember.workspaceId],
      set: {
        role: "OWNER",
        updatedAt: now,
      },
    });

  return createdWorkspace;
}
