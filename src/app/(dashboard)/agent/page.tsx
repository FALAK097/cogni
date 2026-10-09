import { Suspense } from "react";

import { WidgetCustomizer, WidgetCustomizerSkeleton } from "@/components/widget/widget-customizer";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";
import { APP_PAGES, APP_ROUTES } from "@/features/navigation/app-routes";
import { redirect } from "next/navigation";

export const metadata = {
  title: `${APP_PAGES.agent.label} | ${SITE_NAME}`,
  description: APP_PAGES.agent.description,
};

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (Object.keys(params).length > 0) redirect(APP_ROUTES.agent);

  const { workspace, membership } = await requireDashboardContext();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Suspense fallback={<WidgetCustomizerSkeleton />}>
        <WidgetCustomizer
          workspaceId={workspace.id}
          canManage={membership.role === "OWNER"}
          key={workspace.id}
        />
      </Suspense>
    </div>
  );
}
