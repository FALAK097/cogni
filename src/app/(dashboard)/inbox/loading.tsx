import { Skeleton } from "@/components/ui/skeleton";
import { panelBoxClassName } from "@/components/widget/conversation-layout";

function ConversationRowsSkeleton() {
  return (
    <div className="space-y-1 px-2 pb-2">
      <div className="flex items-center gap-2 p-2" aria-hidden="true">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div aria-hidden="true" className="space-y-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 rounded-lg px-3 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28 max-w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InboxLoading() {
  return (
    <output
      aria-busy="true"
      aria-label="Loading Inbox"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar"
    >
      <div aria-hidden="true" className="shrink-0 space-y-3 px-4 pt-3 sm:px-5 sm:pt-4">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="flex min-h-0 flex-1 gap-2.5 p-2 sm:px-4 sm:pb-4">
        <div
          aria-hidden="true"
          className={`${panelBoxClassName} w-full shrink-0 lg:w-[300px] xl:w-[320px]`}
        >
          <ConversationRowsSkeleton />
        </div>
        <section
          aria-hidden="true"
          className={`${panelBoxClassName} hidden min-w-0 flex-1 items-center justify-center lg:flex`}
        >
          <Skeleton className="h-4 w-48 max-w-[70%]" />
        </section>
        <section
          aria-hidden="true"
          className={`${panelBoxClassName} hidden w-[280px] shrink-0 items-center justify-center xl:flex`}
        >
          <div className="w-full space-y-3 p-4">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
          </div>
        </section>
      </div>
    </output>
  );
}
