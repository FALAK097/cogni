import "server-only";

import { getDb } from "@/lib/db/client";

export async function getWorkspaceMembers(workspaceId: string) {
  return getDb().query.workspaceMember.findMany({
    where: (member, { eq }) => eq(member.workspaceId, workspaceId),
    orderBy: (member, { asc }) => [asc(member.createdAt)],
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}
