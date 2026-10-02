"use client";

import { useEffect, useRef, useState } from "react";

import { Trash2 } from "@/components/icons";
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
import { useConversations, useDeleteInboxSavedView, useInboxSavedViews } from "@/hooks/query";
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
import { cn } from "@/lib/utils";

import { ConversationDetail } from "./conversation-detail";
import { ConversationsList } from "./conversations-list";
import { detailsColumnClassName, panelBoxClassName } from "./conversation-layout";

interface WidgetConversationsProps {
  initialConversationId?: string | null;
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
  all: 0,
  unassigned: 0,
  mine: 0,
  open: 0,
  closed: 0,
  snoozed: 0,
};

export function WidgetConversations({
  initialConversationId = null,
  canManage,
}: WidgetConversationsProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<string | null>(null);
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
  const savedViews = savedViewsData?.views ?? [];
  const selectedSavedView = savedViews.find((view) => view.id === selectedSavedViewId) ?? null;
  const [prevInitialConversationId, setPrevInitialConversationId] = useState(initialConversationId);
  const [prevFilter, setPrevFilter] = useState(filter);

  useEffect(() => {
    if (previousWorkspaceId.current === workspaceId) return;
    previousWorkspaceId.current = workspaceId;
    setSelectedConversationId(null);
    setSelectedSavedViewId(null);
    setFilter("all");
    setViewSelectionRevision((revision) => revision + 1);
  }, [workspaceId]);

  if (initialConversationId !== prevInitialConversationId) {
    setPrevInitialConversationId(initialConversationId);
    if (initialConversationId) {
      setSelectedConversationId(initialConversationId);
    }
  }

  if (filter !== prevFilter) {
    setPrevFilter(filter);
    setSelectedConversationId(null);
  }

  const { data: conversationsData } = useConversations({ limit: 20, filter });
  const canDeleteSavedView = Boolean(
    selectedSavedView &&
    (canManage ||
      selectedSavedView.createdByMembershipId === conversationsData?.currentMembershipId),
  );

  const counts = conversationsData?.counts ?? EMPTY_COUNTS;
  const activeView = FILTER_TABS.find((tab) => tab.value === filter);
  const activeViewCount = activeView ? counts[activeView.countKey] : 0;
  const activeCountKind = filter === "snoozed" ? "snoozed" : "unread";
  const composerDraftKey = `${workspaceId}:${selectedConversationId ?? ""}`;
  const composerDraft = composerDrafts[composerDraftKey] ?? EMPTY_CONVERSATION_COMPOSER_DRAFT;
  const updateComposerDraft: ConversationComposerDraftChange = (update) => {
    setComposerDrafts((current) =>
      updateConversationComposerDrafts(current, composerDraftKey, update),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar">
      <header className="shrink-0 bg-sidebar px-4 pt-3 sm:px-5 sm:pt-4 lg:pt-4">
        <h1 className="hidden text-xl font-semibold tracking-tight text-foreground lg:block">
          Inbox
        </h1>

        <div className="mt-2 flex gap-1.5 lg:mt-3">
          <Select
            value={selectedSavedView?.id ?? filter}
            onValueChange={(value) => {
              if (!value) return;
              setSelectedConversationId(null);
              const savedView = savedViews.find((view) => view.id === value);
              if (savedView) {
                setSelectedSavedViewId(savedView.id);
                setFilter(savedView.filter);
              } else {
                setSelectedSavedViewId(null);
                setFilter(value as ConversationFilter);
              }
              setViewSelectionRevision((revision) => revision + 1);
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
              setSelectedSavedViewId(null);
              setFilter("all");
            }}
            initialChannel={selectedSavedView?.channel ?? null}
            initialAssignee={
              selectedSavedView?.assigneeFilter === "all"
                ? null
                : (selectedSavedView?.assigneeFilter ?? null)
            }
            initialLabel={selectedSavedView?.labelFilter ?? null}
            onFacetChange={() => setSelectedSavedViewId(null)}
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
              onBack={() => setSelectedConversationId(null)}
              onSelectConversation={setSelectedConversationId}
              part="chat"
              composerDraft={composerDraft}
              onComposerDraftChange={updateComposerDraft}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">
                Select a conversation to view messages
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
                Contact and conversation details will appear here
              </p>
            </div>
          )}
        </div>
      </div>
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
                    setSelectedSavedViewId(null);
                    setFilter("all");
                    setViewSelectionRevision((revision) => revision + 1);
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
