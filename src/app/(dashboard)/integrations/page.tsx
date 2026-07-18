import { ContentLayout } from "@/components/app-nav/content-layout";
import { WidgetIntegrationsPage } from "@/features/integrations/components/widget-integrations-page";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Integrations | ${SITE_NAME}`,
  description: "Connect integrations",
};

export default async function IntegrationsPage() {
  await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="container mx-auto">
        <WidgetIntegrationsPage />
      </div>
    </ContentLayout>
  );
}
