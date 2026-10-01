import { ContentLayout } from "@/components/app-nav/content-layout";
import { WidgetIntegrationsPage } from "@/features/integrations/components/widget-integrations-page";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Settings · Connections | ${SITE_NAME}`,
  description: "Connect integrations",
};

export default async function IntegrationsPage() {
  const { membership } = await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="container mx-auto">
        <header className="mb-8">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Settings</p>
          <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect message channels and business tools for your agent.
          </p>
        </header>
        <WidgetIntegrationsPage canManage={membership.role === "OWNER"} />
      </div>
    </ContentLayout>
  );
}
