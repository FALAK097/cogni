import { Suspense } from "react";

import { WidgetCustomizer } from "@/components/widget/widget-customizer";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { SITE_NAME } from "@/lib/constants";
import { APP_PAGES, canonicalAgentPath, isAgentTab } from "@/features/navigation/app-routes";
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
  const [{ workspace, membership }, params] = await Promise.all([
    requireDashboardContext(),
    searchParams,
  ]);

  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  if (
    params.subtab !== undefined ||
    params.section !== undefined ||
    (params.tab !== undefined && (!tab || !isAgentTab(tab) || tab === "build")) ||
    (Array.isArray(params.tab) && params.tab.length !== 1)
  ) {
    redirect(canonicalAgentPath(params));
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Suspense>
        <WidgetCustomizer
          workspaceId={workspace.id}
          canManage={membership.role === "OWNER"}
          key={workspace.id}
        />
      </Suspense>
    </div>
  );
}
