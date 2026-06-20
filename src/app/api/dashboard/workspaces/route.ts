import { NextResponse } from "next/server";

import { listUserWorkspaces, requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const { session } = await requireDashboardContext();
  const workspaces = await listUserWorkspaces(session.user.id);

  return NextResponse.json({
    workspaces: workspaces.map((entry) => ({
      id: entry.workspaceId,
      name: entry.workspace.name,
      role: entry.role,
      ownerUserId: entry.role === "OWNER" ? session.user.id : null,
      isPrimary: entry.role === "OWNER",
    })),
  });
}
