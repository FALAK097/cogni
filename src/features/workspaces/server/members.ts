import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

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
  db: PrismaClient,
  input: {
    workspaceId: string;
    email: string;
    role: "OWNER" | "MEMBER";
  },
) {
  const email = input.email.trim().toLowerCase();
  const token = generateInviteToken();

  return db.workspaceInvite.upsert({
    where: {
      workspaceId_email: {
        workspaceId: input.workspaceId,
        email,
      },
    },
    update: {
      token,
      role: input.role,
      expiresAt: inviteExpiresAt(),
      acceptedAt: null,
    },
    create: {
      workspaceId: input.workspaceId,
      email,
      role: input.role,
      token,
      expiresAt: inviteExpiresAt(),
    },
  });
}

export async function getWorkspaceInviteByToken(db: PrismaClient, token: string) {
  return db.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function listWorkspaceInvites(db: PrismaClient, workspaceId: string) {
  return db.workspaceInvite.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
