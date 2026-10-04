import type { ReactNode } from "react";

import { DashboardShell } from "@/components/app-nav/dashboard-shell";
import { generateUserAvatarUrl, getStableBackgroundColor } from "@/lib/avatar-generator";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";

export const metadata = {
  title: SITE_NAME,
  description: "Manage customer conversations and your AI support agent.",
};

export const dynamic = "force-dynamic";

export default async function DashboardShellLayout({ children }: { children: ReactNode }) {
  const { session } = await requireDashboardContext();

  const avatarUrl =
    session.user.image ||
    generateUserAvatarUrl(session.user.email, {
      backgroundColor: getStableBackgroundColor(session.user.email),
    });

  const userData = {
    name: session.user.name || "User",
    email: session.user.email || "",
    avatar: avatarUrl,
  };

  return (
    <main className="flex w-full flex-1 flex-col overflow-hidden">
      <DashboardShell userData={userData}>{children}</DashboardShell>
    </main>
  );
}
