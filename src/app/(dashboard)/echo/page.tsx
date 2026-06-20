import { ContentLayout } from "@/components/app-nav/content-layout";
import { EchoCustomizer } from "@/components/echo/echo-customizer";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Echo Widget | ${SITE_NAME}`,
  description: "Customize your AI chat widget",
};

export default async function EchoPage({
  searchParams,
}: {
  searchParams: Promise<{ subtab?: string }>;
}) {
  const { workspace } = await requireDashboardContext();
  const { subtab } = await searchParams;

  return (
    <ContentLayout className="max-w-full">
      <div className="mx-auto max-w-7xl pb-16">
        <EchoCustomizer workspaceId={workspace.id} initialSubtab={subtab} key={workspace.id} />
      </div>
    </ContentLayout>
  );
}
