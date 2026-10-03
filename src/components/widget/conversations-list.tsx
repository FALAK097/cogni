"use client";

import { format, isToday, isYesterday } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Filter,
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
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useConversations,
  useCreateInboxSavedView,
  useMarkConversationRead,
  useWorkspaceMembers,
} from "@/hooks/query";
import { useCurrentTimestamp } from "@/hooks/use-current-timestamp";
import type { ConversationFilter, ConversationSummary } from "@/hooks/query";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import {
  CONVERSATION_CHANNELS,
  getConversationChannelLabel,
} from "@/features/conversations/channel-label";
import { getConversationTargetIndex } from "@/features/conversations/list-keyboard-navigation";
import type { InboxChannel } from "@/features/conversations/inbox-pagination";
import { normalizeTimezone } from "@/features/conversations/snooze-schedule";
import { cn } from "@/lib/utils";

import { scrollPaneClassName } from "./conversation-layout";

interface ConversationsListProps {
  filter: ConversationFilter;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onClearFilter: () => void;
  initialChannel: InboxChannel | null;
  initialAssignee: string | null;
  initialLabel: string | null;
  onFacetChange: () => void;
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
  initialChannel,
  initialAssignee,
  initialLabel,
  onFacetChange,
}: ConversationsListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const currentTimestamp = useCurrentTimestamp();
  const [channelFilter, setChannelFilter] = useState<InboxChannel | null>(initialChannel);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(initialAssignee);
  const [labelFilter, setLabelFilter] = useState<string>(initialLabel ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savingView, setSavingView] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [saveViewError, setSaveViewError] = useState<string | null>(null);
  const [saveViewMessage, setSaveViewMessage] = useState<string | null>(null);
  const savedViewNameRef = useRef<HTMLInputElement>(null);
  const normalizedLabel = labelFilter.trim().toLowerCase();
  const isValidLabel =
    !normalizedLabel || /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,31}$/u.test(normalizedLabel);
  const appliedLabel = isValidLabel ? normalizedLabel : "";
  const listKey = `${filter}:${debouncedSearch}:${channelFilter ?? "all"}:${assigneeFilter ?? "all"}:${appliedLabel}`;
  const [trackedListKey, setTrackedListKey] = useState(listKey);
  const [pagesCache, setPagesCache] = useState<Record<number, ConversationSummary[]>>({});
  const [cursorsByPage, setCursorsByPage] = useState<Record<number, string | null>>({ 1: null });
  const { mutate: markConversationRead } = useMarkConversationRead();
  const createSavedView = useCreateInboxSavedView();
  const {
    data: membersData,
    isLoading: isMembersLoading,
    isError: isMembersError,
    refetch: refetchMembers,
  } = useWorkspaceMembers();
  const members = membersData?.members ?? [];
  const activeFilterCount =
    Number(Boolean(channelFilter)) +
    Number(Boolean(assigneeFilter)) +
    Number(Boolean(appliedLabel));
  const markedReadRef = useRef<string | null>(null);
  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
  };

  const saveCurrentView = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveViewError(null);
    setSaveViewMessage(null);
    createSavedView.mutate(
      {
        name: savedViewName,
        filter,
        channel: channelFilter,
        assigneeFilter: assigneeFilter ?? "all",
        labelFilter: appliedLabel || null,
      },
      {
        onSuccess: () => {
          setSavingView(false);
          setSavedViewName("");
          setSaveViewMessage("Saved view is now shared with your team.");
        },
        onError: (error) => setSaveViewError(error.message),
      },
    );
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

  useEffect(() => {
    if (savingView) savedViewNameRef.current?.focus();
  }, [savingView]);

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
    channel: channelFilter ?? undefined,
    assignee: assigneeFilter ?? undefined,
    label: appliedLabel || undefined,
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
  const searchTerm = debouncedSearch.trim();
  const hasFacetFilters = Boolean(channelFilter || assigneeFilter || appliedLabel);
  const emptyTitle = searchTerm
    ? `No matches for “${searchTerm}”`
    : hasFacetFilters
      ? "No conversations match these filters"
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
                : filter === "snoozed"
                  ? "Nothing snoozed"
                  : "No closed conversations";
  const hasVisibleSelection = conversations.some(
    (conversation) => conversation.id === selectedConversationId,
  );

  const handleConversationListKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const list = event.currentTarget.closest("ul");
    if (!list) return;
    const options = Array.from(
      list.querySelectorAll<HTMLButtonElement>("[data-conversation-option]"),
    );
    const focusedIndex = options.findIndex((option) => option === document.activeElement);
    const selectedIndex = options.findIndex((option) => option.dataset.selected === "true");
    const currentIndex = focusedIndex >= 0 ? focusedIndex : Math.max(selectedIndex, 0);
    const targetIndex = getConversationTargetIndex(event.key, currentIndex, options.length);
    if (targetIndex === null) return;

    event.preventDefault();
    const target = options[targetIndex];
    const conversation = conversations[targetIndex];
    if (!target || !conversation) return;
    target.focus();
    onSelectConversation(conversation.id);
  };

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
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant={activeFilterCount ? "secondary" : "outline"}
                  size="icon"
                  aria-label={
                    activeFilterCount
                      ? `Filters, ${activeFilterCount} active`
                      : "Filter conversations"
                  }
                  title="Filter conversations"
                  className="relative size-11 shrink-0 rounded-lg sm:size-9"
                />
              }
            >
              <Filter className="size-4" aria-hidden="true" />
              {activeFilterCount ? (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(20rem,calc(100vw-2rem))] gap-4 rounded-xl"
            >
              <PopoverHeader>
                <PopoverTitle>Filter conversations</PopoverTitle>
                <PopoverDescription>
                  Find conversations by channel, teammate or label.
                </PopoverDescription>
              </PopoverHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p
                    id="channel-filter-label"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Channel
                  </p>
                  <Select
                    value={channelFilter ?? "all"}
                    onValueChange={(value) => {
                      setChannelFilter(value === "all" ? null : (value as InboxChannel));
                      setSaveViewMessage(null);
                      onFacetChange();
                      onSelectConversation(null);
                    }}
                  >
                    <SelectTrigger
                      aria-label="Filter by channel"
                      aria-labelledby="channel-filter-label"
                      className="h-11 w-full rounded-lg bg-background sm:h-9"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All channels</SelectItem>
                      {CONVERSATION_CHANNELS.map((channel) => (
                        <SelectItem key={channel.value} value={channel.value}>
                          {channel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p
                    id="assignee-filter-label"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Assignee
                  </p>
                  <Select
                    value={assigneeFilter ?? "all"}
                    onValueChange={(value) => {
                      setAssigneeFilter(value === "all" ? null : value);
                      setSaveViewMessage(null);
                      onFacetChange();
                      onSelectConversation(null);
                    }}
                  >
                    <SelectTrigger
                      aria-label="Filter by assignee"
                      aria-labelledby="assignee-filter-label"
                      className="h-11 w-full rounded-lg bg-background sm:h-9"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teammates</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isMembersLoading ? (
                    <span className="block text-xs">Loading teammates…</span>
                  ) : null}
                  {isMembersError ? (
                    <span className="flex items-center justify-between gap-2 text-xs text-destructive">
                      Could not load teammates.
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => void refetchMembers()}
                      >
                        Retry
                      </button>
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="conversation-label-filter"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Conversation label
                  </label>
                  <Input
                    id="conversation-label-filter"
                    aria-label="Filter by conversation label"
                    aria-invalid={!isValidLabel}
                    className="h-11 text-base sm:h-9 sm:text-sm"
                    placeholder="e.g. billing"
                    maxLength={32}
                    value={labelFilter}
                    onChange={(event) => {
                      setLabelFilter(event.target.value);
                      setSaveViewMessage(null);
                      onFacetChange();
                      onSelectConversation(null);
                    }}
                  />
                  {!isValidLabel ? (
                    <p role="alert" className="text-xs text-destructive">
                      Use up to 32 letters, numbers, spaces, periods, underscores or hyphens.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Matches a label on the conversation.
                    </p>
                  )}
                </div>
                {savingView ? (
                  <form
                    onSubmit={saveCurrentView}
                    className="space-y-2 border-t border-border pt-3"
                  >
                    <Input
                      ref={savedViewNameRef}
                      aria-label="Shared view name"
                      className="h-11 text-base sm:h-9 sm:text-sm"
                      placeholder="e.g. Billing questions"
                      maxLength={40}
                      value={savedViewName}
                      onChange={(event) => setSavedViewName(event.target.value)}
                    />
                    {saveViewError ? (
                      <p role="alert" className="text-xs text-destructive">
                        {saveViewError}
                      </p>
                    ) : null}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-11 sm:h-8"
                        onClick={() => {
                          setSavingView(false);
                          setSaveViewError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="h-11 sm:h-8"
                        disabled={!savedViewName.trim() || createSavedView.isPending}
                      >
                        {createSavedView.isPending ? "Saving…" : "Save view"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-border pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-11 w-full rounded-lg sm:h-9"
                      disabled={!hasFacetFilters}
                      title={
                        hasFacetFilters
                          ? "Share these filters with your team"
                          : "Choose a filter first"
                      }
                      onClick={() => {
                        setSavingView(true);
                        setSaveViewMessage(null);
                      }}
                    >
                      Save as shared view
                    </Button>
                    <p className="mt-1.5 text-center text-xs text-muted-foreground">
                      {hasFacetFilters
                        ? "Your team can use this view."
                        : "Add a channel or teammate filter first."}
                    </p>
                  </div>
                )}
                {saveViewMessage ? (
                  <output className="block text-center text-xs text-muted-foreground">
                    {saveViewMessage}
                  </output>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {activeFilterCount ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {channelFilter ? (
              <button
                type="button"
                onClick={() => {
                  setChannelFilter(null);
                  setSaveViewMessage(null);
                  onFacetChange();
                  onSelectConversation(null);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-md bg-muted px-2 text-xs text-foreground hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring sm:h-7"
              >
                {getConversationChannelLabel(channelFilter)}
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Clear channel filter</span>
              </button>
            ) : null}
            {assigneeFilter ? (
              <button
                type="button"
                onClick={() => {
                  setAssigneeFilter(null);
                  setSaveViewMessage(null);
                  onFacetChange();
                  onSelectConversation(null);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-md bg-muted px-2 text-xs text-foreground hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring sm:h-7"
              >
                {assigneeFilter === "unassigned"
                  ? "Unassigned"
                  : (members.find((member) => member.id === assigneeFilter)?.name ?? "Teammate")}
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Clear assignee filter</span>
              </button>
            ) : null}
            {appliedLabel ? (
              <button
                type="button"
                onClick={() => {
                  setLabelFilter("");
                  setSaveViewMessage(null);
                  onFacetChange();
                  onSelectConversation(null);
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-md bg-muted px-2 text-xs text-foreground hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring sm:h-7"
              >
                {appliedLabel}
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Clear label filter</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setChannelFilter(null);
                setAssigneeFilter(null);
                setLabelFilter("");
                onSelectConversation(null);
              }}
              className="h-11 px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:h-7"
            >
              Clear filters
            </button>
          </div>
        ) : null}
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
                {searchTerm || hasFacetFilters
                  ? "Try another search or clear the active filters."
                  : filter === "all"
                    ? "New website chats will appear here. Set up your agent to start receiving conversations."
                    : filter === "unread"
                      ? "Unread visitor messages will show up here."
                      : filter === "snoozed"
                        ? "Conversations you snooze will return to the inbox when it’s time."
                        : "Try another inbox view to find a conversation."}
              </p>
            </div>
            {searchTerm || hasFacetFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  clearSearch();
                  setChannelFilter(null);
                  setAssigneeFilter(null);
                  setLabelFilter("");
                  if (filter !== "all") onClearFilter();
                  onSelectConversation(null);
                }}
              >
                Clear filters
              </Button>
            ) : filter === "all" ? (
              <Button
                nativeButton={false}
                render={<Link href="/playground" />}
                variant="outline"
                size="sm"
              >
                Set up your agent
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={onClearFilter}>
                View all conversations
              </Button>
            )}
          </div>
        ) : (
          <ul
            aria-label="Conversations"
            aria-describedby="conversation-list-keyboard-help"
            className="m-0 list-none px-2 pb-2"
          >
            <li id="conversation-list-keyboard-help" className="sr-only">
              Use the up and down arrow keys to open the previous or next conversation. Home and End
              open the first and last conversation. Enter or Space opens the focused conversation.
            </li>
            {conversations.map((conversation, index) => {
              const displayName = getDisplayName(conversation);
              const selected = selectedConversationId === conversation.id;
              const unreadCount = conversation.unreadCount;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    data-conversation-option
                    data-conversation-id={conversation.id}
                    data-selected={selected ? "true" : undefined}
                    aria-current={selected ? "true" : undefined}
                    tabIndex={selected || (!hasVisibleSelection && index === 0) ? 0 : -1}
                    aria-label={`${displayName}, ${getConversationChannelLabel(conversation.channel)}, ${conversation.preview}, ${formatListTime(conversation.lastMessageAt)}, ${conversation.aiPaused ? "AI paused" : "AI active"}, ${conversation.assigneeName ? `assigned to ${conversation.assigneeName}` : "unassigned"}${conversation.status === "CLOSED" ? ", closed" : conversation.status === "ESCALATED" ? ", escalated" : ""}${unreadCount > 0 ? `, ${unreadCount} unread` : ", read"}`}
                    onKeyDown={handleConversationListKeyDown}
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
                        <span
                          className={cn(
                            "truncate text-sm text-foreground",
                            (selected || unreadCount > 0) && "font-semibold",
                          )}
                        >
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
                        {conversation.labels.slice(0, 2).map((label) => (
                          <span
                            key={label}
                            className="inline-flex max-w-24 truncate rounded border border-border/70 bg-background px-1.5 py-0.5 text-xs text-muted-foreground"
                            title={label}
                          >
                            {label}
                          </span>
                        ))}
                        {conversation.labels.length > 2 ? (
                          <span className="text-xs text-muted-foreground">
                            +{conversation.labels.length - 2}
                          </span>
                        ) : null}
                        {conversation.snoozedUntil &&
                        currentTimestamp !== null &&
                        Date.parse(conversation.snoozedUntil) > currentTimestamp ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                            Until{" "}
                            {formatInTimeZone(
                              conversation.snoozedUntil,
                              normalizeTimezone(conversationsData?.workspaceTimezone),
                              "MMM d, h:mm a",
                            )}
                          </span>
                        ) : null}
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
                </li>
              );
            })}
          </ul>
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
