import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ensureDefaultWorkspace } from "@/lib/auth/provision-workspace";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const workspace = await ensureDefaultWorkspace(getDb(), session.user);

  return (
    <div className="min-h-svh bg-muted/25">
      <Sidebar
        workspaceName={workspace.name}
        className="fixed inset-y-0 left-0 hidden w-64 border-r lg:flex"
      />
      <div className="lg:pl-64">
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          workspaceName={workspace.name}
        />
        {children}
      </div>
    </div>
  );
}
