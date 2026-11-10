import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { ContentLayout } from "@/components/app-nav/content-layout";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";
import { APP_PAGES } from "@/features/navigation/app-routes";

export const metadata = {
  title: `${APP_PAGES.insights.label} | ${SITE_NAME}`,
  description: APP_PAGES.insights.description,
};

export default async function InsightsPage() {
  const { membership, workspace } = await requireDashboardContext();

  return (
    <ContentLayout className="bg-transparent py-6">
      <DashboardPage
        key={workspace.id}
        canManage={membership.role === "OWNER"}
        workspaceTimezone={workspace.timezone}
      />
    </ContentLayout>
  );
}
