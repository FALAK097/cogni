import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 12;

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: CARD_COUNT }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-3xl border border-border/60 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      ))}
    </div>
  );
}
