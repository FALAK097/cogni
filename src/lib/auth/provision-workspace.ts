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

  const baseSlug = workspaceSlug(user.name, user.id);
  const now = new Date().toISOString();
  let createdWorkspace: typeof workspace.$inferSelect | undefined;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    const [inserted] = await db
      .insert(workspace)
      .values({
        id: crypto.randomUUID(),
        name: `${user.name}'s workspace`,
        slug,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      createdWorkspace = inserted;
      break;
    }

    const membershipAfterRace = await db.query.workspaceMember.findFirst({
      where: (member, { eq }) => eq(member.userId, user.id),
      with: { workspace: true },
    });
    if (membershipAfterRace) {
      return membershipAfterRace.workspace;
    }
  }

  if (!createdWorkspace) {
    throw new Error("Could not provision default workspace.");
  }

  await db
    .insert(workspaceMember)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      workspaceId: createdWorkspace.id,
      role: "OWNER",
      updatedAt: now,
    })
    .onConflictDoNothing();

  return createdWorkspace;
}
