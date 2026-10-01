"use client";

import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Pause,
  Plus,
  Search,
  User,
  X,
} from "@/components/icons";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations, useMarkConversationRead } from "@/hooks/query";
import type { ConversationFilter, ConversationSummary } from "@/hooks/query";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { getConversationChannelLabel } from "@/features/conversations/channel-label";
import { cn } from "@/lib/utils";

import { scrollPaneClassName } from "./conversation-layout";

interface ConversationsListProps {
  filter: ConversationFilter;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onClearFilter: () => void;
}

const PAGE_SIZE = 20;

function getDisplayName(conversation: ConversationSummary) {
  if (
    conversation.contactName &&
    conversation.contactName !== "Visitor" &&
    conversation.contactName !== "Website visitor"
  ) {
    return conversation.contactName;
  }
  if (conversation.visitorId) {
    return `Visitor ${conversation.visitorId.slice(0, 6)}`;
  }
  return "Visitor";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatListTime(timestamp: string) {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

export function ConversationsList({
  filter,
  selectedConversationId,
  onSelectConversation,
  onClearFilter,
}: ConversationsListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const listKey = `${filter}:${debouncedSearch}`;
  const [trackedListKey, setTrackedListKey] = useState(listKey);
  const [pagesCache, setPagesCache] = useState<Record<number, ConversationSummary[]>>({});
  const [cursorsByPage, setCursorsByPage] = useState<Record<number, string | null>>({ 1: null });
  const { mutate: markConversationRead } = useMarkConversationRead();
  const markedReadRef = useRef<string | null>(null);
  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
  };

  if (listKey !== trackedListKey) {
    setTrackedListKey(listKey);
    setPage(1);
    setPagesCache({});
    setCursorsByPage({ 1: null });
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: conversationsData,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    refetch,
  } = useConversations({
    limit: PAGE_SIZE,
    cursor: cursorsByPage[page] ?? null,
    search: debouncedSearch,
    filter,
  });
  const isSearchPending =
    search.trim() !== debouncedSearch.trim() || (isFetching && Boolean(search.trim()));

  const effectivePagesCache = useMemo(() => {
    if (!conversationsData || isPlaceholderData) return pagesCache;
    return { ...pagesCache, [page]: conversationsData.conversations };
  }, [pagesCache, conversationsData, page, isPlaceholderData]);

  const hasMore = conversationsData?.pagination.hasMore ?? false;
  const conversations = useMemo(() => {
    if (page === 1) {
      return effectivePagesCache[1] ?? conversationsData?.conversations ?? [];
    }

    const seen = new Set<string>();
    const result: ConversationSummary[] = [];
    for (let currentPage = 1; currentPage <= page; currentPage++) {
      for (const conversation of effectivePagesCache[currentPage] ?? []) {
        if (!seen.has(conversation.id)) {
          seen.add(conversation.id);
          result.push(conversation);
        }
      }
    }
    return result;
  }, [effectivePagesCache, page, conversationsData?.conversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      markedReadRef.current = null;
      return;
    }
    if (markedReadRef.current === selectedConversationId) return;
    const selectedConversation = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );
    if (!selectedConversation?.lastUnreadVisitorMessageId) return;
    markedReadRef.current = selectedConversationId;
    markConversationRead({
      conversationId: selectedConversationId,
      throughMessageId: selectedConversation.lastUnreadVisitorMessageId,
    });
  }, [conversations, selectedConversationId, markConversationRead]);

  const handleLoadMore = () => {
    const nextCursor = conversationsData?.pagination.nextCursor;
    if (!conversationsData || !nextCursor || isPlaceholderData || isFetching) return;

    setPagesCache((current) => ({ ...current, [page]: conversationsData.conversations }));
    setCursorsByPage((current) => ({ ...current, [page + 1]: nextCursor }));
    setPage((current) => current + 1);
  };
  const firstConversationId = conversations[0]?.id ?? null;
  const searchTerm = debouncedSearch.trim();
  const emptyTitle = searchTerm
    ? `No matches for “${searchTerm}”`
    : filter === "all"
      ? "No conversations yet"
      : filter === "unread"
        ? "You’re all caught up"
        : filter === "unassigned"
          ? "No unassigned conversations"
          : filter === "mine"
            ? "No conversations assigned to you"
            : filter === "open"
              ? "No open conversations"
              : "No closed conversations";

  useEffect(() => {
    if (selectedConversationId || !firstConversationId) return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      onSelectConversation(firstConversationId);
    }
  }, [firstConversationId, selectedConversationId, onSelectConversation]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {isSearchPending ? (
              <Loader2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground motion-safe:animate-spin motion-reduce:animate-none" />
            ) : (
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              aria-label="Search conversations"
              placeholder="Search conversations…"
              className="h-11 rounded-lg border-border/50 bg-input/50 pl-9 pr-12 text-base shadow-none sm:h-9 sm:pr-10 sm:text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                title="Clear search"
                onClick={clearSearch}
                className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-transform duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:scale-100 sm:size-8"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
            <output aria-live="polite" className="sr-only">
              {isSearchPending ? "Searching conversations" : ""}
            </output>
          </div>
        </div>
      </div>

      {isError && conversations.length > 0 ? (
        <div role="alert" className="mx-4 mb-2 space-y-2 text-sm text-muted-foreground">
          <p>Conversations could not refresh. Showing previously loaded results.</p>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            Retry loading
          </Button>
        </div>
      ) : null}
      <div aria-busy={isSearchPending} className={cn("min-h-0 flex-1", scrollPaneClassName)}>
        {isError && conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p role="alert" className="text-sm text-muted-foreground">
              Unable to load conversations. Check your connection and try again.
            </p>
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              Retry loading
            </Button>
          </div>
        ) : isLoading && conversations.length === 0 ? (
          <div className="space-y-1 px-2 pb-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 rounded-lg px-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 px-5 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground">
              {searchTerm ? (
                <Search className="size-[18px]" aria-hidden="true" />
              ) : (
                <MessageSquare className="size-[18px]" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
              <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                {searchTerm
                  ? "Try another search or clear this one."
                  : filter === "all"
                    ? "New website chats will appear here. Set up your agent to start receiving conversations."
                    : filter === "unread"
                      ? "Unread visitor messages will show up here."
                      : "Try another inbox view to find a conversation."}
              </p>
            </div>
            {searchTerm ? (
              <Button type="button" variant="outline" size="sm" onClick={clearSearch}>
                Clear search
              </Button>
            ) : filter === "all" ? (
              <Button render={<Link href="/playground" />} variant="outline" size="sm">
                Set up your agent
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={onClearFilter}>
                View all conversations
              </Button>
            )}
          </div>
        ) : (
          <div className="px-2 pb-2">
            {conversations.map((conversation) => {
              const displayName = getDisplayName(conversation);
              const selected = selectedConversationId === conversation.id;
              const unreadCount = conversation.unreadCount;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    "relative flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                    selected
                      ? "bg-primary/5 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                      : "hover:bg-muted/40",
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={generateAvatarUrl(conversation.visitorId)} alt="" />
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {displayName}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formatListTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-end justify-between gap-2">
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {conversation.preview}
                      </p>
                      {unreadCount > 0 ? (
                        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
                          {unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {getConversationChannelLabel(conversation.channel)}
                      </span>
                      {conversation.status === "CLOSED" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                          <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
                          Closed
                        </span>
                      ) : conversation.status === "ESCALATED" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                          Escalated
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          conversation.aiPaused
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {conversation.aiPaused ? (
                          <Pause className="size-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <Bot className="size-3.5 shrink-0" aria-hidden="true" />
                        )}
                        {conversation.aiPaused ? "AI paused" : "AI enabled"}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <User className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          {conversation.assigneeName ?? "Unassigned"}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hasMore ? (
        <div className="shrink-0 p-3 pt-0">
          <Button
            variant="ghost"
            className="h-9 w-full gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={handleLoadMore}
            disabled={isFetching || isPlaceholderData}
            aria-busy={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2
                  className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Loading conversations…
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden="true" />
                Load more conversations
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
