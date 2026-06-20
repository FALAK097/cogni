import { Skeleton } from "@/components/ui/skeleton";

export function IntegrationsPageSkeleton() {
  return (
    <div className="space-y-10">
      {/* Tabs skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-10 border-b border-border/60 pb-3">
        <div className="flex gap-7">
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[90px]" />
          <Skeleton className="h-5 w-[80px]" />
        </div>
        <Skeleton className="h-9 w-[120px]" />
      </div>
      {/* Category sections skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="rounded-xl border p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-5 w-[120px]" />
                    <Skeleton className="h-3 w-[180px]" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
