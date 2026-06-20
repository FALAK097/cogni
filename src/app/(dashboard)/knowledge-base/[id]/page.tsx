import { ContentLayout } from "@/components/app-nav/content-layout";
import { WidgetKnowledgeManager } from "@/components/workspace/widget-knowledge-manager";
import { SITE_NAME } from "@/lib/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Knowledge Base ${id} | ${SITE_NAME}` };
}

export default async function KnowledgeBaseDetailPage({
  params: _params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireDashboardContext();

  return (
    <ContentLayout>
      <div className="container mx-auto">
        <WidgetKnowledgeManager />
      </div>
    </ContentLayout>
  );
}
