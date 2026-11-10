import { ContentLayout } from "@/components/app-nav/content-layout";
import { IntegrationDetailSkeleton } from "@/features/integrations/components/integration-detail";

export default function IntegrationLoading() {
  return (
    <ContentLayout>
      <div className="container mx-auto pb-10">
        <IntegrationDetailSkeleton />
      </div>
    </ContentLayout>
  );
}
