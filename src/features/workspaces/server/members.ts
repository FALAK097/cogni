import "server-only";

import { and, eq } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { runDbWriteOperation } from "@/lib/db/client";
import { workspace as workspaceTable, workspaceInvite, workspaceMember } from "@/lib/db/schema";

const INVITE_EXPIRY_DAYS = 7;

export function generateInviteToken() {
  return crypto.randomUUID();
}

export function inviteExpiresAt(from = new Date()) {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}

export async function acceptWorkspaceInviteMembership(
  db: Db,
  input: {
    inviteId: string;
    workspaceId: string;
    userId: string;
    email: string;
    acceptedAt: string;
  },
) {
  return runDbWriteOperation(db, async (transaction) => {
    await transaction
      .select({ id: workspaceTable.id })
      .from(workspaceTable)
      .where(eq(workspaceTable.id, input.workspaceId))
      .for("update");

    const [invite] = await transaction
      .select({
        id: workspaceInvite.id,
        email: workspaceInvite.email,
        role: workspaceInvite.role,
        expiresAt: workspaceInvite.expiresAt,
        acceptedAt: workspaceInvite.acceptedAt,
      })
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.id, input.inviteId),
          eq(workspaceInvite.workspaceId, input.workspaceId),
        ),
      )
      .for("update");

    if (
      !invite ||
      invite.acceptedAt ||
      invite.email.toLowerCase() !== input.email.toLowerCase() ||
      new Date(invite.expiresAt).getTime() <= new Date(input.acceptedAt).getTime()
    ) {
      return false;
    }

    const [existingMembership] = await transaction
      .select({ id: workspaceMember.id })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.userId, input.userId),
          eq(workspaceMember.workspaceId, input.workspaceId),
        ),
      )
      .for("update");

    if (!existingMembership) {
      await transaction
        .insert(workspaceMember)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          workspaceId: input.workspaceId,
          role: invite.role,
          updatedAt: input.acceptedAt,
        })
        .onConflictDoNothing();
    }

    await transaction
      .update(workspaceInvite)
      .set({ acceptedAt: input.acceptedAt })
      .where(eq(workspaceInvite.id, invite.id));

    return true;
  });
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
