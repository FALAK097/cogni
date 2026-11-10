import { ContentLayout } from "@/components/app-nav/content-layout";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardLoading() {
  return (
    <ContentLayout>
      <div className="container mx-auto">
        <DashboardSkeleton label="Loading Overview" />
      </div>
    </ContentLayout>
  );
}
