import "server-only";

import { getDb } from "@/lib/db/client";

export async function getWorkspaceMembers(workspaceId: string) {
  return getDb().membership.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}
