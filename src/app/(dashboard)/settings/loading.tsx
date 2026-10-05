import { ContentLayout } from "@/components/app-nav/content-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationsPageSkeleton } from "@/features/integrations/components/integrations-page-skeleton";

export default function SettingsLoading() {
  return (
    <ContentLayout>
      <div className="container mx-auto space-y-8">
        <header aria-hidden="true" className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </header>
        <section aria-labelledby="connections-loading-heading" className="space-y-4">
          <h2 id="connections-loading-heading" className="sr-only">
            Loading connections
          </h2>
          <IntegrationsPageSkeleton />
        </section>
      </div>
    </ContentLayout>
  );
}
