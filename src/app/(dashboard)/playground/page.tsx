import { WidgetCustomizer } from "@/components/widget/widget-customizer";
import { SITE_NAME } from "@/lib/constants";
import { Suspense } from "react";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Agent | ${SITE_NAME}`,
  description: "Build, customize, preview and deploy your AI customer agent.",
};

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ subtab?: string }>;
}) {
  const [{ workspace, membership }, { subtab }] = await Promise.all([
    requireDashboardContext(),
    searchParams,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Suspense>
        <WidgetCustomizer
          workspaceId={workspace.id}
          initialSubtab={subtab}
          canManage={membership.role === "OWNER"}
          key={workspace.id}
        />
      </Suspense>
    </div>
  );
}
