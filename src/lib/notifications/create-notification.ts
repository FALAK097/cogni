import type { Db } from "@/lib/db/client";
import { notification } from "@/lib/db/schema";

export async function notifyWorkspaceMembers({
  db,
  workspaceId,
  type,
  title,
  body,
  excludeUserId,
}: {
  db: Db;
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  excludeUserId?: string;
}) {
  const members = await db.query.workspaceMember.findMany({
    where: (member, { eq, and, ne }) => {
      const conds = [eq(member.workspaceId, workspaceId)];
      if (excludeUserId) {
        conds.push(ne(member.userId, excludeUserId));
      }
      return and(...conds);
    },
    columns: {
      userId: true,
    },
  });

  if (members.length === 0) return;

  await db.insert(notification).values(
    members.map((member) => ({
      id: crypto.randomUUID(),
      workspaceId,
      userId: member.userId,
      type,
      title,
      body,
    })),
  );
}
