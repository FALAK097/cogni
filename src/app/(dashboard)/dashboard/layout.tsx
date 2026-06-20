import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SessionGuard } from "@/components/dashboard/session-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { listUserWorkspaces, requireDashboardContext } from "@/lib/auth/dashboard-context";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, membership, workspace } = await requireDashboardContext();
  const workspaces = await listUserWorkspaces(session.user.id);

  return (
    <SidebarProvider>
      <AppSidebar
        workspace={{ name: workspace.name }}
        activeWorkspaceId={membership.workspaceId}
        workspaces={workspaces.map((entry) => ({
          workspaceId: entry.workspaceId,
          name: entry.workspace.name,
          role: entry.role,
        }))}
      />
      <SidebarInset>
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          userEmail={session.user.email}
        />
        <SessionGuard />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
