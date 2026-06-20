import { ContentLayout } from "@/components/app-nav/content-layout";
import { CampaignList } from "@/components/campaign/campaign-list";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Campaigns | ${SITE_NAME}`,
  description: "Manage campaigns",
};

export default async function CampaignsPage() {
  await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="container mx-auto">
        <CampaignList />
      </div>
    </ContentLayout>
  );
}
