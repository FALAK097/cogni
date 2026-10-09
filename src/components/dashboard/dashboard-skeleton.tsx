import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton({ label = "Loading Insights" }: { label?: string }) {
  return (
    <output
      aria-busy="true"
      aria-label={label}
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
      <div
        aria-hidden="true"
        className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="flex min-h-[320px] flex-col rounded-xl border border-border/50 p-6 md:col-span-2 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40 max-w-[55%]" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <div className="flex flex-1 gap-3">
            <div className="flex w-9 flex-col justify-between py-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-3 w-7" />
              ))}
            </div>
            <div className="relative flex flex-1 flex-col justify-between overflow-hidden border-b border-l border-border/50 py-3 pl-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-px w-full border-t border-dashed border-border/50" />
              ))}
              <Skeleton
                className="absolute bottom-0 left-0 h-3/4 w-full rounded-none"
                style={{
                  clipPath:
                    "polygon(0 86%, 16% 62%, 32% 70%, 48% 35%, 64% 48%, 81% 20%, 100% 30%, 100% 100%, 0 100%)",
                }}
              />
            </div>
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[320px] flex-col items-center rounded-xl border border-border/50 p-6"
          >
            <Skeleton className="mr-auto h-4 w-36 max-w-full" />
            <div className="relative my-5 flex size-[180px] items-center justify-center rounded-full border-[24px] border-muted">
              <Skeleton className="absolute inset-[18px] rounded-full" />
            </div>
            <div className="w-full space-y-3">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div key={rowIndex} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3.5 w-24 max-w-[60%]" />
                  <Skeleton className="h-3.5 w-14" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[260px] flex-col rounded-xl border border-border/50 p-6 xl:col-span-2"
          >
            <Skeleton className="h-4 w-36" />
            <div className="mt-5 flex-1 space-y-3">
              {Array.from({ length: index === 2 ? 4 : 5 }).map((__, rowIndex) => (
                <Skeleton key={rowIndex} className="h-9 w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </output>
  );
}
