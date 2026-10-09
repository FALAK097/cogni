import { ConversationRowSkeleton } from "@/components/widget/conversation-row-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { panelBoxClassName } from "@/components/widget/conversation-layout";

function ConversationRowsSkeleton() {
  return (
    <div className="space-y-1 px-2 pb-2">
      <div className="flex items-center gap-2 p-2" aria-hidden="true">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div aria-hidden="true" className="flex gap-1 px-2 pb-1">
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div aria-hidden="true" className="space-y-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <ConversationRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function ConversationThreadSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        aria-hidden="true"
        className="flex items-center gap-3 border-b border-border/60 px-4 py-3"
      >
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-3 w-24 max-w-full" />
        </div>
        <Skeleton className="hidden h-8 w-20 rounded-lg sm:block" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <div
        aria-hidden="true"
        className="flex min-h-0 flex-1 flex-col justify-end gap-5 overflow-hidden p-4 sm:p-6"
      >
        <Skeleton className="mx-auto h-3 w-32" />
        <Skeleton className="h-14 w-3/4 max-w-[420px] rounded-xl" />
        <Skeleton className="ml-auto h-12 w-2/3 max-w-[360px] rounded-xl" />
        <Skeleton className="h-20 w-4/5 max-w-[460px] rounded-xl" />
      </div>
      <div aria-hidden="true" className="border-t border-border/60 p-3 sm:p-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ContactDetailsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4 p-4">
      <div className="border-b border-border/60 pb-4">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="mt-3 h-4 w-28" />
        <Skeleton className="mt-2 h-3 w-40 max-w-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="space-y-3 rounded-xl border border-border/60 p-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="space-y-3 rounded-xl border border-border/60 p-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="space-y-3 rounded-xl border border-border/60 p-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
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
          className={`${panelBoxClassName} hidden min-w-0 flex-1 flex-col lg:flex`}
        >
          <ConversationThreadSkeleton />
        </section>
        <section
          aria-hidden="true"
          className={`${panelBoxClassName} hidden w-[280px] shrink-0 xl:block`}
        >
          <ContactDetailsSkeleton />
        </section>
      </div>
    </output>
  );
}
