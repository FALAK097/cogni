import { notFound } from "next/navigation";

import { ContentLayout } from "@/components/app-nav/content-layout";
import { IntegrationDetail } from "@/features/integrations/components/integration-detail";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getIntegrationBySlug } from "@/features/integrations/registry";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { membership } = await requireDashboardContext();
  const { slug } = await params;
  if (!getIntegrationBySlug(slug)) notFound();

  return (
    <ContentLayout>
      <div className="container mx-auto pb-10">
        <IntegrationDetail slug={slug} canManage={membership.role === "OWNER"} />
      </div>
    </ContentLayout>
  );
}
