import { ContentLayout } from "@/components/app-nav/content-layout";
import { WidgetIntegrationsPage } from "@/features/integrations/components/widget-integrations-page";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";
import { APP_PAGES } from "@/features/navigation/app-routes";

export const metadata = {
  title: `${APP_PAGES.settings.label} | ${SITE_NAME}`,
  description: APP_PAGES.settings.description,
};

export default async function SettingsPage() {
  const { membership } = await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="container mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{APP_PAGES.settings.label}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{APP_PAGES.settings.description}</p>
        </header>
        <section aria-labelledby="connections-heading">
          <h2 id="connections-heading" className="mb-4 text-lg font-semibold tracking-tight">
            Connections
          </h2>
          <WidgetIntegrationsPage canManage={membership.role === "OWNER"} />
        </section>
      </div>
    </ContentLayout>
  );
}
