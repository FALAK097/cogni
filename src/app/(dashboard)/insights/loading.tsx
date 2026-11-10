import { ContentLayout } from "@/components/app-nav/content-layout";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function InsightsLoading() {
  return (
    <ContentLayout className="bg-transparent py-6">
      <DashboardSkeleton />
    </ContentLayout>
  );
}
