"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConversations } from "@/hooks/query";
import type { ConversationFilter, ConversationSummary } from "@/hooks/query";
import { cn } from "@/lib/utils";

import { ConversationDetail } from "./conversation-detail";
import { ConversationsList } from "./conversations-list";
import { detailsColumnClassName, panelBoxClassName } from "./conversation-layout";

interface WidgetConversationsProps {
  initialConversationId?: string | null;
}

const FILTER_TABS: Array<{ value: ConversationFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unassigned", label: "Unassigned" },
  { value: "mine", label: "Mine" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const EMPTY_COUNTS = {
  all: 0,
  unassigned: 0,
  mine: 0,
  open: 0,
  closed: 0,
};

function adjustUnreadTabCounts(
  counts: typeof EMPTY_COUNTS,
  selectedConversation: ConversationSummary | undefined,
  currentMembershipId: string | null,
) {
  if (!selectedConversation || selectedConversation.unreadCount === 0) {
    return counts;
  }

  const decrement = (value: number) => Math.max(0, value - 1);

  return {
    all: decrement(counts.all),
    unassigned:
      selectedConversation.status !== "CLOSED" && !selectedConversation.assigneeId
        ? decrement(counts.unassigned)
        : counts.unassigned,
    mine:
      currentMembershipId && selectedConversation.assigneeId === currentMembershipId
        ? decrement(counts.mine)
        : counts.mine,
    open: selectedConversation.status === "OPEN" ? decrement(counts.open) : counts.open,
    closed: selectedConversation.status === "CLOSED" ? decrement(counts.closed) : counts.closed,
  };
}

export function WidgetConversations({ initialConversationId = null }: WidgetConversationsProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [filter, setFilter] = useState<ConversationFilter>("all");

  const { data: conversationsData } = useConversations({ page: 1, limit: 20, filter });

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  const prevFilterRef = useRef<ConversationFilter>(filter);
  useEffect(() => {
    if (prevFilterRef.current === filter) return;
    prevFilterRef.current = filter;
    setSelectedConversationId(null);
  }, [filter]);

  const counts = useMemo(() => {
    const baseCounts = conversationsData?.counts ?? EMPTY_COUNTS;
    if (!selectedConversationId) return baseCounts;

    const selectedConversation = conversationsData?.conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );

    return adjustUnreadTabCounts(
      baseCounts,
      selectedConversation,
      conversationsData?.currentMembershipId ?? null,
    );
  }, [conversationsData, selectedConversationId]);

  return (
    <div className="flex h-screen flex-col bg-[#f9fafb] dark:bg-zinc-900">
      <header className="shrink-0 bg-[#f9fafb] px-4 pt-4 dark:bg-zinc-900 sm:px-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Conversations</h1>

        <div className="mt-3">
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as ConversationFilter)}
            className="gap-0"
          >
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none bg-transparent p-0 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {FILTER_TABS.map((tab) => {
                const active = filter === tab.value;
                const count = counts[tab.value];

                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "h-9 shrink-0 flex-none gap-2 rounded-none bg-transparent px-0 pb-2 text-sm font-medium shadow-none",
                      "after:-bottom-px after:h-[2px] after:rounded-full after:bg-primary",
                      "data-active:bg-transparent data-active:shadow-none",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    {count > 0 ? (
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-2.5 p-2 sm:px-4 sm:pb-4">
        <div
          className={cn(
            panelBoxClassName,
            "w-full shrink-0 lg:w-[300px] xl:w-[320px]",
            selectedConversationId ? "hidden lg:flex" : "flex",
          )}
        >
          <ConversationsList
            filter={filter}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
          />
        </div>

        <div
          className={cn(
            panelBoxClassName,
            "min-w-0 flex-1",
            !selectedConversationId && "hidden lg:flex",
            selectedConversationId && "flex",
          )}
        >
          {selectedConversationId ? (
            <ConversationDetail
              conversationId={selectedConversationId}
              onBack={() => setSelectedConversationId(null)}
              part="chat"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">
                Select a conversation to view messages
              </p>
            </div>
          )}
        </div>

        <div
          className={cn(detailsColumnClassName, "hidden w-[272px] shrink-0 lg:flex xl:w-[292px]")}
        >
          {selectedConversationId ? (
            <ConversationDetail
              conversationId={selectedConversationId}
              onBack={() => {}}
              part="details"
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/60 bg-white p-4 dark:bg-zinc-950">
              <p className="text-center text-xs text-muted-foreground">
                Contact and conversation details will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
