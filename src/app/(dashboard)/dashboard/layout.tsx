import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, workspace } = await requireDashboardContext();

  return (
    <SidebarProvider>
      <AppSidebar workspace={{ name: workspace.name }} />
      <SidebarInset>
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          userEmail={session.user.email}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
