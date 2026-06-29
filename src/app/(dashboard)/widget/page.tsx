import { WidgetCustomizer } from "@/components/widget/widget-customizer";
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <Suspense>
        <WidgetCustomizer workspaceId={workspace.id} initialSubtab={subtab} key={workspace.id} />
      </Suspense>
    </div>
  );
}
