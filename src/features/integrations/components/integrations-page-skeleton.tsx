import { Skeleton } from "@/components/ui/skeleton";

export function IntegrationsPageSkeleton() {
  return (
    <output aria-busy="true" aria-label="Loading connections" className="block space-y-10">
      <div aria-hidden="true" className="space-y-8">
        {Array.from({ length: 3 }).map((_, categoryIndex) => (
          <section key={categoryIndex} className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex flex-col divide-y divide-border/40">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-5 sm:grid-cols-[240px_minmax(0,1fr)_100px]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <Skeleton className="size-6 shrink-0 rounded-md" />
                    <Skeleton className="h-4 w-28 max-w-full" />
                  </div>
                  <Skeleton className="order-3 col-span-2 h-4 w-3/4 max-w-md sm:order-none sm:col-span-1" />
                  <Skeleton className="h-4 w-16 justify-self-end" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </output>
  );
}
