import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 8;

export function ConversationsListSkeleton({ rows = ROW_COUNT }: { rows?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="hidden flex-1 sm:block">
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <div className="hidden w-28 sm:block">
            <Skeleton className="h-3.5 w-20" />
          </div>
          <div className="hidden w-24 sm:block">
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-7 w-12 rounded-md" />
        </div>
      ))}
    </div>
  );
}
