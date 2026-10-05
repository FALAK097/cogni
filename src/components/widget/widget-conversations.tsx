pyenv: cannot rehash: /Users/falakgala/.pyenv/shims isn't writable
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseAsString, useQueryStates } from "nuqs";

import { MessageSquare, Trash2 } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useConversations,
  useDeleteInboxSavedView,
  useInboxConversationEvents,
  useInboxSavedViews,
} from "@/hooks/query";
import type { ConversationFilter } from "@/hooks/query";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import type {
  ConversationComposerDraft,
  ConversationComposerDraftChange,
} from "@/features/conversations/draft-state";
import {
  EMPTY_CONVERSATION_COMPOSER_DRAFT,
  updateConversationComposerDrafts,
} from "@/features/conversations/draft-state";
import { shouldShowInboxFirstRunState } from "@/features/conversations/inbox-state";
import { cn } from "@/lib/utils";
import { APP_PAGES, agentHref } from "@/features/navigation/app-routes";

import { ConversationDetail } from "./conversation-detail";
import { ConversationsList } from "./conversations-list";
import { detailsColumnClassName, panelBoxClassName } from "./conversation-layout";

interface WidgetConversationsProps {
  canManage: boolean;
}

const FILTER_TABS: Array<{
  value: ConversationFilter;
  label: string;
  countKey: keyof typeof EMPTY_COUNTS;
}> = [
  { value: "all", label: "All", countKey: "all" },
  { value: "unread", label: "Unread", countKey: "all" },
  { value: "unassigned", label: "Unassigned", countKey: "unassigned" },
  { value: "mine", label: "My inbox", countKey: "mine" },
  { value: "open", label: "All open", countKey: "open" },
  { value: "snoozed", label: "Snoozed", countKey: "snoozed" },
  { value: "closed", label: "Closed", countKey: "closed" },
];

const EMPTY_COUNTS = {
  total: 0,
  all: 0,
  unassigned: 0,
  mine: 0,
  open: 0,
  closed: 0,
  snoozed: 0,
};

export function WidgetConversations({ canManage }: WidgetConversationsProps) {
  useInboxConversationEvents();
  const [inboxQuery, setInboxQuery] = useQueryStates(
    {
      view: parseAsString.withDefault("all"),
      conversationId: parseAsString.withDefault(""),
    },
    { clearOnDefault: true, history: "push", scroll: false, shallow: true },
  );
  const selectedConversationId = inboxQuery.conversationId || null;
  const setSelectedConversationId = (
    conversationId: string | null,
    history: "push" | "replace" = "push",
  ) => {
    void setInboxQuery({ conversationId: conversationId ?? "" }, { history });
  };
  const [viewSelectionRevision, setViewSelectionRevision] = useState(0);
  const [deleteViewOpen, setDeleteViewOpen] = useState(false);
  const [deleteViewError, setDeleteViewError] = useState<string | null>(null);
  const [composerDrafts, setComposerDrafts] = useState<Record<string, ConversationComposerDraft>>(
    {},
  );
  const workspaceId = useActiveWorkspaceId() ?? "";
  const previousWorkspaceId = useRef(workspaceId);
  const {
    data: savedViewsData,
    isError: savedViewsError,
    refetch: refetchSavedViews,
  } = useInboxSavedViews();
  const deleteSavedView = useDeleteInboxSavedView();
  const savedViews = useMemo(() => savedViewsData?.views ?? [], [savedViewsData]);
  const selectedSavedView = savedViews.find((view) => view.id === inboxQuery.view) ?? null;
  const filter =
    selectedSavedView?.filter ??
    (FILTER_TABS.some((tab) => tab.value === inboxQuery.view)
      ? (inboxQuery.view as ConversationFilter)
      : "all");
  const previousView = useRef(inboxQuery.view);
  const preserveFacetStateForView = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId || previousWorkspaceId.current === workspaceId) return;
    if (!previousWorkspaceId.current) {
      previousWorkspaceId.current = workspaceId;
      return;
    }
    previousWorkspaceId.current = workspaceId;
    void setInboxQuery({ conversationId: "", view: "all" });
    setViewSelectionRevision((revision) => revision + 1);
  }, [setInboxQuery, workspaceId]);

  useEffect(() => {
    if (previousView.current === inboxQuery.view) return;
    previousView.current = inboxQuery.view;
    if (preserveFacetStateForView.current === inboxQuery.view) {
      preserveFacetStateForView.current = null;
      return;
    }
    setViewSelectionRevision((revision) => revision + 1);
  }, [inboxQuery.view]);

  useEffect(() => {
    if (!savedViewsData || FILTER_TABS.some((tab) => tab.value === inboxQuery.view)) return;
    if (savedViews.some((view) => view.id === inboxQuery.view)) return;
    void setInboxQuery({ view: "all", conversationId: "" });
  }, [inboxQuery.view, savedViews, savedViewsData, setInboxQuery]);

  const { data: conversationsData, isSuccess: conversationsLoaded } = useConversations({
    limit: 20,
    filter,
  });
  const canDeleteSavedView = Boolean(
    selectedSavedView &&
    (canManage ||
      selectedSavedView.createdByMembershipId === conversationsData?.currentMembershipId),
  );

  const counts = conversationsData?.counts ?? EMPTY_COUNTS;
  const isWorkspaceInboxEmpty = shouldShowInboxFirstRunState({
    conversationsLoaded,
    conversationCount: counts.total,
    selectedConversationId,
  });
  const activeView = FILTER_TABS.find((tab) => tab.value === filter);
  const activeViewCount = activeView ? counts[activeView.countKey] : 0;
  const activeCountKind = filter === "snoozed" ? "snoozed" : "unread";
  const composerDraftKey = `${workspaceId}:${selectedConversationId ?? ""}`;
  const composerDraft = composerDrafts[composerDraftKey] ?? EMPTY_CONVERSATION_COMPOSER_DRAFT;
  const backToConversationList = () => {
    const conversationId = selectedConversationId;
    setSelectedConversationId(null, "replace");
    requestAnimationFrame(() => {
      const options = document.querySelectorAll<HTMLButtonElement>("[data-conversation-option]");
      const selectedOption = Array.from(options).find(
        (option) => option.dataset.conversationId === conversationId,
      );
      (selectedOption ?? options[0])?.focus({ preventScroll: true });
    });
  };
  const updateComposerDraft: ConversationComposerDraftChange = (update) => {
    setComposerDrafts((current) =>
      updateConversationComposerDrafts(current, composerDraftKey, update),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
      <header className="shrink-0 bg-sidebar px-4 pt-3 sm:px-5 sm:pt-4 lg:pt-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {APP_PAGES.inbox.label}
        </h1>

        {!isWorkspaceInboxEmpty ? (
          <div className="mt-2 flex gap-1.5 lg:mt-3">
            <Select
              value={selectedSavedView?.id ?? filter}
              onValueChange={(value) => {
                if (!value) return;
                if (value === inboxQuery.view) {
                  setViewSelectionRevision((revision) => revision + 1);
                }
                void setInboxQuery({ conversationId: "", view: value });
              }}
            >
              <SelectTrigger
                aria-label="Inbox view"
                className="h-11 min-w-0 flex-1 justify-between rounded-xl border-border/60 bg-background px-3 shadow-none sm:h-10"
              >
                <SelectValue placeholder="Choose an inbox view">
                  {selectedSavedView?.name ?? activeView?.label ?? "Choose an inbox view"}
                </SelectValue>
                {!selectedSavedView && activeViewCount > 0 ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {activeViewCount} {activeCountKind}
                  </span>
                ) : null}
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false} className="w-64 rounded-xl">
                {FILTER_TABS.map((tab) => {
                  const count = counts[tab.countKey];
                  const countKind = tab.value === "snoozed" ? "snoozed" : "unread";

                  return (
                    <SelectItem key={tab.value} value={tab.value} className="min-h-10 rounded-lg">
                      <span>{tab.label}</span>
                      {count > 0 ? (
                        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {count} {countKind}
                        </span>
                      ) : null}
                    </SelectItem>
                  );
                })}
                {savedViews.length > 0 ? (
                  <>
                    <SelectSeparator />
                    <SelectLabel>Shared views</SelectLabel>
                  </>
                ) : null}
                {savedViews.map((view) => (
                  <SelectItem key={view.id} value={view.id} className="min-h-10 rounded-lg">
                    <span className="min-w-0 truncate">{view.name}</span>
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      Shared
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canDeleteSavedView && selectedSavedView ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 rounded-xl text-muted-foreground hover:text-destructive sm:size-10"
                aria-label={`Delete saved view ${selectedSavedView.name}`}
                title="Delete saved view"
                onClick={() => {
                  setDeleteViewError(null);
                  setDeleteViewOpen(true);
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ) : null}
        {savedViewsError ? (
          <p
            role="alert"
            className="mt-2 flex items-center justify-between gap-2 text-xs text-destructive"
          >
            Could not load shared views.
            <button
              type="button"
              className="shrink-0 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => void refetchSavedViews()}
            >
              Retry
            </button>
          </p>
        ) : null}
      </header>

      {isWorkspaceInboxEmpty ? (
        <div className="flex min-h-0 flex-1 p-2 sm:px-4 sm:pb-4">
          <section
            className={cn(
              panelBoxClassName,
              "w-full items-center justify-center gap-3 p-6 text-center",
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground">
              <MessageSquare className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Your inbox is ready</h2>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Set up your agent or connect a channel to start receiving conversations here.
              </p>
            </div>
            {canManage ? (
              <Button
                nativeButton={false}
                render={<Link href={agentHref()} />}
                variant="outline"
                size="sm"
                className="min-h-11 px-4"
              >
                Set up your agent
              </Button>
            ) : (
              <p className="max-w-sm text-xs text-muted-foreground">
                A workspace owner needs to finish agent setup or connect a channel before
                conversations can arrive.
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-2.5 p-2 sm:px-4 sm:pb-4">
          <div
            className={cn(
              panelBoxClassName,
              "w-full shrink-0 lg:w-[300px] xl:w-[320px]",
              selectedConversationId ? "hidden lg:flex" : "flex",
            )}
          >
            <ConversationsList
              key={viewSelectionRevision}
              filter={filter}
              selectedConversationId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              onClearFilter={() => {
                void setInboxQuery({ view: "all" });
              }}
              initialChannel={selectedSavedView?.channel ?? null}
              initialAssignee={
                selectedSavedView?.assigneeFilter === "all"
                  ? null
                  : (selectedSavedView?.assigneeFilter ?? null)
              }
              initialLabel={selectedSavedView?.labelFilter ?? null}
              onFacetChange={() => {
                if (selectedSavedView) {
                  preserveFacetStateForView.current = filter;
                  void setInboxQuery({ view: filter });
                }
              }}
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
                key={selectedConversationId}
                conversationId={selectedConversationId}
                canManage={canManage}
                onBack={backToConversationList}
                focusBackButtonOnMount
                onSelectConversation={setSelectedConversationId}
                part="chat"
                composerDraft={composerDraft}
                onComposerDraftChange={updateComposerDraft}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-sm text-muted-foreground">
                  Select a conversation to view the thread
                </p>
              </div>
            )}
          </div>

          <div className={cn(detailsColumnClassName, "hidden w-[280px] shrink-0 xl:flex")}>
            {selectedConversationId ? (
              <ConversationDetail
                key={selectedConversationId}
                conversationId={selectedConversationId}
                canManage={canManage}
                onBack={() => {}}
                onSelectConversation={setSelectedConversationId}
                part="details"
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/60 bg-card p-4">
                <p className="text-center text-xs text-muted-foreground">
                  Select a conversation to view contact details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <AlertDialog open={deleteViewOpen} onOpenChange={setDeleteViewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{selectedSavedView?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This shared view will be removed for everyone in this workspace. Conversations are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteViewError ? <p className="text-sm text-destructive">{deleteViewError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSavedView.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedSavedView || deleteSavedView.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
              onClick={(event) => {
                event.preventDefault();
                if (!selectedSavedView) return;
                deleteSavedView.mutate(selectedSavedView.id, {
                  onSuccess: () => {
                    setDeleteViewOpen(false);
                    void setInboxQuery({ view: "all" });
                  },
                  onError: (error) => setDeleteViewError(error.message),
                });
              }}
            >
              {deleteSavedView.isPending ? "Deleting…" : "Delete view"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
