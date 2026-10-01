import { ContentLayout } from "@/components/app-nav/content-layout";
import { WidgetKnowledgeManager } from "@/components/workspace/widget-knowledge-manager";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export const metadata = {
  title: `Knowledge Base | ${SITE_NAME}`,
  description: "Manage knowledge sources",
};

export default async function KnowledgeBasePage() {
  const { membership } = await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="container mx-auto">
        <WidgetKnowledgeManager canManage={membership.role === "OWNER"} />
      </div>
    </ContentLayout>
  );
}
