import { Skeleton } from "@/components/ui/skeleton";

export function IntegrationsPageSkeleton() {
  return (
    <output aria-busy="true" aria-label="Loading connections" className="block space-y-8">
      <div aria-hidden="true" className="space-y-3">
        {Array.from({ length: 3 }).map((_, categoryIndex) => (
          <section key={categoryIndex} className="space-y-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((__, cardIndex) => (
                <div key={cardIndex} className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-28 max-w-full" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-8 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </output>
  );
}
