import { WidgetCustomizer } from "@/components/widget/widget-customizer";
import { ContentLayout } from "@/components/app-nav/content-layout";
import { SITE_NAME } from "@/lib/constants";
import { Suspense } from "react";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Widget | ${SITE_NAME}`,
  description: "Customize your AI chat widget",
};

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ subtab?: string }>;
}) {
  const [{ workspace }, { subtab }] = await Promise.all([requireDashboardContext(), searchParams]);

  return (
    <ContentLayout className="overflow-hidden p-0">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Suspense>
          <WidgetCustomizer workspaceId={workspace.id} initialSubtab={subtab} key={workspace.id} />
        </Suspense>
      </div>
    </ContentLayout>
  );
}
