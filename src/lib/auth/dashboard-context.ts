import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ensureDefaultWorkspace } from "@/lib/auth/provision-workspace";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";

export const requireDashboardContext = cache(async function requireDashboardContext() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const db = getDb();
  const workspace = await ensureDefaultWorkspace(db, session.user);
  const membership = await db.membership.findUniqueOrThrow({
    where: {
      userId_workspaceId: {
        userId: session.user.id,
        workspaceId: workspace.id,
      },
    },
  });

  return {
    db,
    membership,
    session,
    workspace,
  };
});
