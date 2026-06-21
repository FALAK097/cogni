import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

export async function createNotification({
  db,
  workspaceId,
  userId,
  type,
  title,
  body,
}: {
  db: PrismaClient;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
}) {
  return db.notification.create({
    data: {
      workspaceId,
      userId,
      type,
      title,
      body,
    },
  });
}

export async function notifyWorkspaceMembers({
  db,
  workspaceId,
  type,
  title,
  body,
  excludeUserId,
}: {
  db: PrismaClient;
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  excludeUserId?: string;
}) {
  const members = await db.workspaceMember.findMany({
    where: {
      workspaceId,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  if (members.length === 0) return;

  await db.notification.createMany({
    data: members.map((member) => ({
      workspaceId,
      userId: member.userId,
      type,
      title,
      body,
    })),
  });
}
