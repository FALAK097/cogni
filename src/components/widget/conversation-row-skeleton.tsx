import { Skeleton } from "@/components/ui/skeleton";

export function ConversationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-28 max-w-[55%]" />
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <Skeleton className="h-4 min-w-0 flex-1" />
          <Skeleton className="size-5 shrink-0 rounded-full" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}
