import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <output
      aria-busy="true"
      aria-label="Loading Insights"
      className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-8"
    >
      <div
        aria-hidden="true"
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-64 max-w-[80vw]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[132px] flex-col gap-4 rounded-xl border border-border/50 p-4 sm:p-5 xl:p-6"
          >
            <Skeleton className="h-3.5 w-28 max-w-full" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[300px] rounded-xl border border-border/50 bg-transparent" />
        <Skeleton className="h-[300px] rounded-xl border border-border/50 bg-transparent" />
      </div>
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[260px] rounded-xl border border-border/50 bg-transparent" />
        <Skeleton className="h-[260px] rounded-xl border border-border/50 bg-transparent" />
      </div>
    </output>
  );
}
