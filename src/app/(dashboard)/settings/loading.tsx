import { ContentLayout } from "@/components/app-nav/content-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationsPageSkeleton } from "@/features/integrations/components/integrations-page-skeleton";

export default function SettingsLoading() {
  return (
    <ContentLayout>
      <output
        aria-busy="true"
        aria-label="Loading workspace settings"
        className="container mx-auto block space-y-8 pb-10"
      >
        <header aria-hidden="true" className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </header>
        <section aria-labelledby="team-loading-heading" className="space-y-4">
          <h2 id="team-loading-heading" className="sr-only">
            Loading team settings
          </h2>
          <div className="space-y-5" aria-hidden="true">
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-4 py-4 sm:px-5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-3 w-56 max-w-full" />
              </div>
              <div className="divide-y divide-border/70">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-36 max-w-[70%]" />
                      <Skeleton className="h-3 w-48 max-w-[85%]" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-64 max-w-full" />
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </section>
        <section aria-labelledby="connections-loading-heading" className="space-y-4">
          <h2 id="connections-loading-heading" className="sr-only">
            Loading connections
          </h2>
          <Skeleton aria-hidden="true" className="h-6 w-28" />
          <IntegrationsPageSkeleton />
        </section>
      </output>
    </ContentLayout>
  );
}
