import { NextResponse } from "next/server";

import { listUserWorkspaces, requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const { session, workspace, membership } = await requireDashboardContext();
  const workspaces = await listUserWorkspaces(session.user.id);

  return NextResponse.json({
    session: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      activeWorkspaceId: membership.workspaceId,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
    },
    workspaces: workspaces.map((entry) => ({
      id: entry.workspaceId,
      name: entry.workspace.name,
      role: entry.role,
      ownerUserId: entry.role === "OWNER" ? session.user.id : null,
      isPrimary: entry.role === "OWNER",
    })),
  });
}
