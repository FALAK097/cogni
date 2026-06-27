import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ensureDefaultWorkspace } from "@/lib/auth/provision-workspace";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";

export async function listUserWorkspaces(userId: string) {
  return getDb().query.workspaceMember.findMany({
    where: (member, { eq }) => eq(member.userId, userId),
    orderBy: (member, { asc }) => [asc(member.role), asc(member.createdAt)],
    with: {
      workspace: true,
    },
  });
}

export const requireDashboardContext = cache(async function requireDashboardContext() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const db = getDb();
  await ensureDefaultWorkspace(db, session.user);
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value;
  const memberships = await listUserWorkspaces(session.user.id);
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onOnboardingRoute =
    pathname.startsWith("/dashboard/onboarding") || pathname.startsWith("/onboarding");

  if (onOnboardingRoute) {
    redirect("/dashboard");
  }

  const membership =
    memberships.find((entry) => entry.workspaceId === activeWorkspaceId) ?? memberships[0];

  if (!membership) {
    redirect("/");
  }

  return {
    db,
    membership,
    session,
    workspace: membership.workspace,
  };
});
