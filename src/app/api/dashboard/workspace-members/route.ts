import { NextResponse } from "next/server";

import { getWorkspaceMembers } from "@/features/workspaces/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function GET() {
  const { workspace } = await requireDashboardContext();
  const members = await getWorkspaceMembers(workspace.id);

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      name: member.user.name || "Teammate",
    })),
  });
}
