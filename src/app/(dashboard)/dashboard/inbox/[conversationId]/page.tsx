import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  MessageMultiple01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReplyComposer } from "@/features/inbox/components/reply-composer";
import { StatusBadge } from "@/features/inbox/components/status-badge";
import { updateConversationStatusAction } from "@/features/inbox/actions";
import { isConversationStatus } from "@/features/inbox/constants";
import { formatMessageTime } from "@/features/inbox/format";
import { getConversation } from "@/features/inbox/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Conversation",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const [{ conversationId }, { workspace }] = await Promise.all([
    params,
    requireDashboardContext(),
  ]);
  const conversation = await getConversation(workspace.id, conversationId);

  if (!conversation) {
    notFound();
  }

  const status = isConversationStatus(conversation.status) ? conversation.status : "OPEN";
  const closed = status === "CLOSED";

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
      <Link
        href="/dashboard/inbox"
        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        Back to inbox
      </Link>

      <div className="grid min-h-[calc(100svh-10rem)] overflow-hidden rounded-3xl border bg-card lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="flex min-h-[42rem] min-w-0 flex-col">
          <header className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold">{conversation.subject}</h1>
                <StatusBadge status={status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{conversation.contact.name}</p>
            </div>
            <form action={updateConversationStatusAction}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input type="hidden" name="status" value={closed ? "OPEN" : "CLOSED"} />
              <Button type="submit" variant="outline" size="sm">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} />
                {closed ? "Reopen" : "Close"}
              </Button>
            </form>
          </header>

          <div className="flex-1 space-y-6 overflow-y-auto bg-muted/20 px-4 py-6 sm:px-6">
            {conversation.messages.map((message) => {
              const fromTeam = message.authorType === "TEAM" || message.authorType === "AI";
              const authorName = fromTeam
                ? (message.authorUser?.name ?? "Support")
                : conversation.contact.name;

              return (
                <article
                  key={message.id}
                  className={cn("flex gap-3", fromTeam && "flex-row-reverse")}
                >
                  <Avatar size="sm" className="mt-1">
                    <AvatarFallback>{initials(authorName)}</AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[82%]", fromTeam && "text-right")}>
                    <div
                      className={cn(
                        "inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6",
                        fromTeam
                          ? "rounded-tr-md bg-primary text-primary-foreground"
                          : "rounded-tl-md border bg-background",
                      )}
                    >
                      {message.body}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {authorName} ·{" "}
                      <time dateTime={message.createdAt.toISOString()}>
                        {formatMessageTime(message.createdAt)}
                      </time>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          {closed ? (
            <div className="border-t bg-muted/25 px-5 py-4 text-center text-sm text-muted-foreground">
              Reopen this conversation to send another reply.
            </div>
          ) : (
            <ReplyComposer conversationId={conversation.id} />
          )}
        </section>

        <aside className="border-t p-5 lg:border-t-0 lg:border-l">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Customer
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{initials(conversation.contact.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{conversation.contact.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {conversation.contact.email ?? "No email"}
              </p>
            </div>
          </div>
          <dl className="mt-7 space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={Mail01Icon} className="size-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="break-all">{conversation.contact.email ?? "Not provided"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HugeiconsIcon
                icon={MessageMultiple01Icon}
                className="size-4 text-muted-foreground"
              />
              <div>
                <dt className="text-xs text-muted-foreground">Channel</dt>
                <dd className="capitalize">{conversation.channel.toLowerCase()}</dd>
              </div>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
