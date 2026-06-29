import "server-only";

import type { Db } from "@/lib/db/client";
import { workspaceInvite } from "@/lib/db/schema";

const INVITE_EXPIRY_DAYS = 7;

export function generateInviteToken() {
  return crypto.randomUUID();
}

export function inviteExpiresAt(from = new Date()) {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}

export async function upsertWorkspaceInvite(
  db: Db,
  input: {
    workspaceId: string;
    email: string;
    role: "OWNER" | "MEMBER";
  },
) {
  const email = input.email.trim().toLowerCase();
  const token = generateInviteToken();
  const expiresAtStr = inviteExpiresAt().toISOString();

  const results = await db
    .insert(workspaceInvite)
    .values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      token,
      expiresAt: expiresAtStr,
    })
    .onConflictDoUpdate({
      target: [workspaceInvite.workspaceId, workspaceInvite.email],
      set: {
        token,
        role: input.role,
        expiresAt: expiresAtStr,
        acceptedAt: null,
      },
    })
    .returning();

  return results[0];
}

export async function getWorkspaceInviteByToken(db: Db, token: string) {
  return db.query.workspaceInvite.findFirst({
    where: (invite, { eq }) => eq(invite.token, token),
    with: {
      workspace: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function listWorkspaceInvites(db: Db, workspaceId: string) {
  return db.query.workspaceInvite.findMany({
    where: (invite, { eq, and, isNull }) =>
      and(eq(invite.workspaceId, workspaceId), isNull(invite.acceptedAt)),
    orderBy: (invite, { desc }) => [desc(invite.createdAt)],
  });
}
