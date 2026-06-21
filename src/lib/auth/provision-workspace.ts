import type { PrismaClient } from "@/generated/prisma/client";

function workspaceSlug(name: string, userId: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

  return `${base || "workspace"}-${userId.slice(0, 8)}`;
}

export async function ensureDefaultWorkspace(db: PrismaClient, user: { id: string; name: string }) {
  const existingMembership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  });

  if (existingMembership) {
    return existingMembership.workspace;
  }

  const slug = workspaceSlug(user.name, user.id);
  const workspace = await db.workspace.upsert({
    where: { slug },
    update: {},
    create: {
      name: `${user.name}'s workspace`,
      slug,
    },
  });

  await db.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "OWNER",
    },
  });

  return workspace;
}
