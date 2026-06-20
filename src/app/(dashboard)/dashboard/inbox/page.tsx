import Link from "next/link";
import type { Metadata } from "next";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { buttonVariants } from "@/components/ui/button-variants";
import { ConversationList } from "@/features/inbox/components/conversation-list";
import {
  conversationStatuses,
  isConversationStatus,
  statusLabels,
} from "@/features/inbox/constants";
import { getInboxSummary } from "@/features/inbox/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ status: requestedStatus }, { workspace }] = await Promise.all([
    searchParams,
    requireDashboardContext(),
  ]);
  const { counts, conversations } = await getInboxSummary(workspace.id);
  const status = requestedStatus && isConversationStatus(requestedStatus) ? requestedStatus : null;
  const visibleConversations = status
    ? conversations.filter((conversation) => conversation.status === status)
    : conversations;
  const tabs = [
    { label: "All", value: null, count: conversations.length },
    ...conversationStatuses.map((value) => ({
      label: statusLabels[value],
      value,
      count: counts[value.toLowerCase() as Lowercase<typeof value>],
    })),
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Shared inbox</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Conversations</h1>
        </div>
        <Link href="/dashboard/inbox/new" className={cn(buttonVariants(), "w-fit")}>
          <HugeiconsIcon icon={Add01Icon} />
          New conversation
        </Link>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b" aria-label="Conversation status">
        {tabs.map((tab) => {
          const active = status === tab.value;
          const href = tab.value ? `/dashboard/inbox?status=${tab.value}` : "/dashboard/inbox";

          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
                active && "border-primary font-medium text-foreground",
              )}
            >
              {tab.label}
              <span className="font-mono text-xs">{tab.count}</span>
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden">
        <ConversationList conversations={visibleConversations} />
      </div>
    </main>
  );
}
