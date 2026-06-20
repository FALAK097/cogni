import Link from "next/link";
import { Add01Icon, ArrowRight01Icon, InboxIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/features/inbox/components/status-badge";
import { isConversationStatus } from "@/features/inbox/constants";
import { formatConversationTime } from "@/features/inbox/format";
import type { getInboxSummary } from "@/features/inbox/queries";
import { cn } from "@/lib/utils";

type Conversation = Awaited<ReturnType<typeof getInboxSummary>>["conversations"][number];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <HugeiconsIcon icon={InboxIcon} className="size-5" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">No conversations here</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Start a conversation manually now. Messages from the website widget will join this inbox
          in the next product slice.
        </p>
        <Link href="/dashboard/inbox/new" className={cn(buttonVariants({ size: "sm" }), "mt-6")}>
          <HugeiconsIcon icon={Add01Icon} />
          New conversation
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => {
        const latestMessage = conversation.messages[0];
        const status = isConversationStatus(conversation.status) ? conversation.status : "OPEN";

        return (
          <Link
            key={conversation.id}
            href={`/dashboard/inbox/${conversation.id}`}
            className="group grid gap-3 px-4 py-4 transition-colors hover:bg-muted/45 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"
          >
            <Avatar className="size-10">
              <AvatarFallback>{initials(conversation.contact.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{conversation.contact.name}</span>
                <StatusBadge status={status} />
              </span>
              <span className="mt-1 block truncate text-sm font-medium">
                {conversation.subject}
              </span>
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {latestMessage?.body ?? "No messages yet"}
              </span>
            </span>
            <span className="flex items-center gap-3 self-start text-xs text-muted-foreground sm:self-center">
              <time dateTime={conversation.lastMessageAt.toISOString()}>
                {formatConversationTime(conversation.lastMessageAt)}
              </time>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
