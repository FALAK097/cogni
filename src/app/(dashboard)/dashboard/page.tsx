import type { Metadata } from "next";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ContentLayout } from "@/components/app-nav/content-layout";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Insights | ${SITE_NAME}`,
};

export default async function DashboardHomePage() {
  const { membership } = await requireDashboardContext();

  return (
    <ContentLayout className="bg-transparent py-6">
      <DashboardPage canManage={membership.role === "OWNER"} />
    </ContentLayout>
  );
}
