import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import AdminPanelLayout from "@/components/app-nav/admin-panel-layout";
import { generateUserAvatarUrl, getStableBackgroundColor } from "@/lib/avatar-generator";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";

export const metadata = {
  title: SITE_NAME,
  description: "Customer support dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardShellLayout({ children }: { children: ReactNode }) {
  const { session, onboardingComplete } = await requireDashboardContext();

  if (!onboardingComplete) {
    redirect("/onboarding");
  }

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
      <AdminPanelLayout userData={userData}>{children}</AdminPanelLayout>
    </main>
  );
}
