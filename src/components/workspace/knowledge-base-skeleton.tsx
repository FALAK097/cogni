import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 5;

export function KnowledgeBaseSkeleton({ rows = ROW_COUNT }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="hidden w-24 sm:block">
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="hidden w-28 sm:block">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="hidden w-20 sm:block">
            <Skeleton className="h-3.5 w-10" />
          </div>
          <div className="hidden w-28 sm:block">
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}
