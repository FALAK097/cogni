"use client";

import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Pause,
  Play,
  MessageSquare,
  Send,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserPlus,
} from "@/components/icons";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  useConversation,
  useDeleteConversation,
  useSetConversationAiPaused,
  useSetConversationStatus,
  useSendConversationMessage,
  useTakeOverConversation,
} from "@/hooks/query";
import type { ConversationDetail as ConversationDetailData, WidgetMessage } from "@/hooks/query";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { cn } from "@/lib/utils";
import { resolveTranscriptScroll } from "@/features/conversations/transcript-scroll";
import { clearSubmittedDraft } from "@/features/conversations/draft-state";
import { getConversationChannelLabel } from "@/features/conversations/channel-label";

import {
  scrollPaneClassName,
  detailCardClassName,
  composerBoxClassName,
} from "./conversation-layout";

interface ConversationDetailProps {
  conversationId: string;
  canManage: boolean;
  onBack: () => void;
  onSelectConversation: (conversationId: string) => void;
  part?: "chat" | "details";
}

const copilotResultSchema = z.object({
  runId: z.string().uuid(),
  summary: z.string().min(1),
  draftReply: z.string().min(1),
  nextActions: z.array(z.string()),
  sources: z.array(z.object({ documentId: z.string().min(1), title: z.string().min(1) })),
});

const uncertainDeliveryMessage = "The channel may have received this reply";

async function generateCopilotDraft(conversationId: string) {
  const response = await fetch(`/api/dashboard/conversations/${conversationId}/copilot`, {
    method: "POST",
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    throw new Error(error.success ? error.data.error : "Could not generate a draft.");
  }
  return copilotResultSchema.parse(body);
}

function getDisplayName(session: ConversationDetailData) {
  if (
    session.contactName &&
    session.contactName !== "Visitor" &&
    session.contactName !== "Website visitor"
  ) {
    return session.contactName;
  }
  if (session.visitorId) {
    return `Visitor ${session.visitorId.slice(0, 6)}`;
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

function splitMessageSources(content: string) {
  const lines = content.trimEnd().split("\n");

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim().toLowerCase() !== "sources:") continue;

    const sourceLines = lines.slice(index + 1).filter((line) => line.trim());
    if (sourceLines.length === 0) continue;

    const sources = sourceLines.map((line) =>
      line
        .trim()
        .match(/^[-*]\s+(.+)$/)?.[1]
        ?.trim(),
    );
    if (sources.some((source) => !source)) continue;

    return {
      content: lines.slice(0, index).join("\n").trimEnd(),
      sources: [...new Set(sources.filter((source): source is string => Boolean(source)))],
    };
  }

  return { content, sources: [] };
}

function formatDateSeparator(timestamp: string) {
  const date = new Date(timestamp);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function formatStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function workflowStatusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED") return "secondary";
  if (status === "FAILED" || status === "CANCELLED") return "destructive";
  if (status === "WAITING_APPROVAL" || status === "WAITING_USER") return "outline";
  return "default";
}

function workflowInputString(input: Record<string, unknown> | null, key: string) {
  const value = input?.[key];
  return typeof value === "string" ? value : null;
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "OPEN":
      return "default";
    case "CLOSED":
      return "secondary";
    case "ESCALATED":
      return "destructive";
    default:
      return "outline";
  }
}

function detailCardHeaderClassName() {
  return "px-4 py-3";
}

function detailCardContentClassName() {
  return "px-4 pb-4";
}

export function ConversationDetail({
  conversationId,
  canManage,
  onBack,
  onSelectConversation,
  part = "chat",
}: ConversationDetailProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateReplyDialog, setShowDuplicateReplyDialog] = useState(false);
  const [channelReplyDeliveryUncertain, setChannelReplyDeliveryUncertain] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply");
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef<number | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const composerText = composerMode === "reply" ? replyText : noteText;
  const setComposerText = composerMode === "reply" ? setReplyText : setNoteText;

  const {
    data: session,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useConversation(conversationId);
  const deleteConversationMutation = useDeleteConversation();
  const takeOverMutation = useTakeOverConversation();
  const aiPausedMutation = useSetConversationAiPaused();
  const statusMutation = useSetConversationStatus();
  const sendMessageMutation = useSendConversationMessage();
  const copilotMutation = useMutation({
    mutationFn: () => generateCopilotDraft(conversationId),
    onError: (error) => {
      toast({
        title: "Copilot failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const messages = session?.messages;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const messageCount = messages?.length ?? 0;
    const previousMessageCount = previousMessageCountRef.current;
    const scrollUpdate = resolveTranscriptScroll({
      stickToBottom: stickToBottomRef.current,
      previousMessageCount,
      messageCount,
    });
    if (scrollUpdate.scrollToBottom) {
      container.scrollTop = container.scrollHeight;
      setHasNewMessages(false);
    } else if (scrollUpdate.announceNewMessages) {
      setHasNewMessages(true);
    }
    previousMessageCountRef.current = messageCount;
  }, [messages]);

  const displayName = session ? getDisplayName(session) : "";

  const groupedMessages = useMemo(() => {
    if (!messages) return [];

    const groups: Array<{ date: string; messages: WidgetMessage[] }> = [];
    for (const message of messages) {
      const dateKey = format(new Date(message.timestamp), "yyyy-MM-dd");
      const lastGroup = groups[groups.length - 1];
      if (
        lastGroup &&
        format(new Date(lastGroup.messages[0]!.timestamp), "yyyy-MM-dd") === dateKey
      ) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date: message.timestamp, messages: [message] });
      }
    }
    return groups;
  }, [messages]);

  const handleDelete = () => {
    deleteConversationMutation.mutate(conversationId, {
      onSuccess: () => {
        toast({ title: "Conversation deleted" });
        onBack();
      },
      onError: () => {
        toast({ title: "Failed to delete conversation", variant: "destructive" });
      },
    });
  };

  const handleExport = () => {
    if (!session) return;
    const payload = { session, messages: session.messages };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `conversation-${session.visitorId || "anonymous"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleAssign = () => {
    takeOverMutation.mutate(conversationId, {
      onSuccess: () =>
        toast({ title: "You took over this conversation", description: "AI replies are paused." }),
      onError: () => toast({ title: "Failed to take over conversation", variant: "destructive" }),
    });
  };

  const handleToggleAi = (isPaused: boolean) => {
    aiPausedMutation.mutate(
      { conversationId, paused: !isPaused },
      {
        onSuccess: () => toast({ title: isPaused ? "AI replies resumed" : "AI replies paused" }),
        onError: () => toast({ title: "Could not update AI replies", variant: "destructive" }),
      },
    );
  };

  const handleToggleStatus = () => {
    const isClosed = session?.conversationStatus === "CLOSED";
    statusMutation.mutate(
      { conversationId, status: isClosed ? "OPEN" : "CLOSED" },
      {
        onSuccess: () =>
          toast({
            title: isClosed ? "Conversation reopened" : "Conversation resolved",
            description: isClosed
              ? "It’s back in the active inbox."
              : "You can reopen it at any time.",
          }),
        onError: () =>
          toast({
            title: isClosed ? "Could not reopen conversation" : "Could not resolve conversation",
            variant: "destructive",
          }),
      },
    );
  };

  const handleSend = (confirmedPossibleDuplicate = false) => {
    const submittedDraft = composerText;
    const text = submittedDraft.trim();
    if (!text || sendMessageMutation.isPending) return;
    if (composerMode === "reply" && channelReplyDeliveryUncertain && !confirmedPossibleDuplicate) {
      setShowDuplicateReplyDialog(true);
      return;
    }

    sendMessageMutation.mutate(
      { conversationId, message: text, action: composerMode },
      {
        onSuccess: () => {
          setComposerText((currentDraft) => clearSubmittedDraft(currentDraft, submittedDraft));
          if (composerMode === "reply") setChannelReplyDeliveryUncertain(false);
          toast({ title: composerMode === "reply" ? "Reply sent" : "Internal note added" });
        },
        onError: (error) => {
          if (error instanceof Error && error.message.includes(uncertainDeliveryMessage)) {
            setChannelReplyDeliveryUncertain(true);
            toast({
              title: "Check channel delivery",
              description:
                "The reply may have reached the customer. Check the channel before sending again.",
              variant: "destructive",
            });
            return;
          }
          toast({
            title: composerMode === "reply" ? "Failed to send reply" : "Failed to add note",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading && !session) {
    if (part === "details") {
      return (
        <div className={cn("flex h-full flex-col gap-2.5", scrollPaneClassName)}>
          <Skeleton className="h-28 w-full shrink-0 rounded-xl" />
          <Skeleton className="h-36 w-full shrink-0 rounded-xl" />
          <Skeleton className="h-36 w-full shrink-0 rounded-xl" />
        </div>
      );
    }

    return (
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="px-5 py-4">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex-1 space-y-4 p-5">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="ml-auto h-16 w-1/2" />
        </div>
      </div>
    );
  }

  if (isError && !session) {
    return (
      <div className="flex h-full min-w-0 flex-col overflow-hidden">
        {part === "chat" ? (
          <header className="shrink-0 px-3 py-2 sm:px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-11 w-11 lg:hidden sm:h-9 sm:w-9"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          </header>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div role="alert" className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {part === "details" ? "Details are unavailable" : "This conversation couldn’t load"}
            </p>
            <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 gap-2"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? (
              <Loader2 className="size-4 motion-safe:animate-spin motion-reduce:animate-none" />
            ) : null}
            {isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isAssignedToMe = session.assigneeId === session.currentMembershipId;
  const replyTargetLabel = `Replying to ${displayName} via ${getConversationChannelLabel(session.conversationChannel)}`;

  if (part === "details") {
    return (
      <div className={cn("flex h-full flex-col gap-2.5", scrollPaneClassName)}>
        <SessionDetailsContent
          session={session}
          displayName={displayName}
          onSelectConversation={onSelectConversation}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDuplicateReplyDialog} onOpenChange={setShowDuplicateReplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check channel delivery before retrying</AlertDialogTitle>
            <AlertDialogDescription>
              The channel may already have delivered your last reply, but Cogni could not confirm
              it. Check the channel before sending this message again; resending can create a
              duplicate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSend(true)}>
              Send again anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isError ? (
        <output
          aria-live="polite"
          className="mx-3 mt-2 flex shrink-0 items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs sm:mx-4"
        >
          <span className="min-w-0 truncate text-muted-foreground">
            Couldn’t refresh. Showing the last loaded conversation.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2.5"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-busy={isFetching}
          >
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </output>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-11 w-11 shrink-0 lg:hidden sm:h-9 sm:w-9"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>

            <Avatar className="h-7 w-7">
              <AvatarImage src={generateAvatarUrl(session.visitorId)} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{displayName}</h3>
              <p className="text-xs text-muted-foreground">
                Last activity{" "}
                {formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isAssignedToMe ? (
              <Button
                variant="outline"
                size="sm"
                className="hidden h-9 rounded-md border-border/60 px-2.5 text-xs shadow-none sm:inline-flex"
                onClick={handleAssign}
                disabled={takeOverMutation.isPending}
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                Take over
              </Button>
            ) : null}

            <Button
              type="button"
              variant={session.conversationStatus === "CLOSED" ? "outline" : "secondary"}
              size="sm"
              className="hidden h-9 gap-1.5 rounded-md px-2.5 text-xs shadow-none lg:inline-flex"
              onClick={handleToggleStatus}
              disabled={statusMutation.isPending}
              aria-label={
                session.conversationStatus === "CLOSED"
                  ? `Reopen conversation with ${displayName}`
                  : `Resolve conversation with ${displayName}`
              }
            >
              {statusMutation.isPending ? (
                <Loader2 className="size-3.5 motion-safe:animate-spin motion-reduce:animate-none" />
              ) : session.conversationStatus === "CLOSED" ? (
                <RotateCcw className="size-3.5" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {session.conversationStatus === "CLOSED" ? "Reopen" : "Resolve"}
            </Button>

            <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 rounded-md border-border/60 px-3 text-xs shadow-none sm:h-9 sm:px-2.5 sm:text-xs xl:hidden"
                  >
                    Details
                  </Button>
                }
              />
              <SheetContent side="right" className={cn("w-full max-w-sm p-0", scrollPaneClassName)}>
                <SheetHeader className="border-b border-border/60 px-4 py-4">
                  <SheetTitle>Conversation details</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <SessionDetailsContent
                    session={session}
                    displayName={displayName}
                    onSelectConversation={onSelectConversation}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 sm:h-9 sm:w-9"
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleToggleStatus}
                  disabled={statusMutation.isPending}
                  className="lg:hidden"
                >
                  {session.conversationStatus === "CLOSED" ? (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {session.conversationStatus === "CLOSED"
                    ? "Reopen conversation"
                    : "Resolve conversation"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToggleAi(session.aiPaused ?? false)}
                  disabled={aiPausedMutation.isPending}
                >
                  {session.aiPaused ? (
                    <Play className="mr-2 h-4 w-4" />
                  ) : (
                    <Pause className="mr-2 h-4 w-4" />
                  )}
                  {session.aiPaused ? "Resume AI replies" : "Pause AI replies"}
                </DropdownMenuItem>
                {!isAssignedToMe ? (
                  <DropdownMenuItem
                    onClick={handleAssign}
                    disabled={takeOverMutation.isPending}
                    className="sm:hidden"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Take over
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className={cn(canManage && "text-destructive")}
                  disabled={!canManage}
                  onClick={canManage ? () => setShowDeleteDialog(true) : undefined}
                  title={canManage ? undefined : "Only workspace owners can delete conversations."}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete conversation
                  {!canManage ? (
                    <span className="ml-auto pl-4 text-xs text-muted-foreground">Owner only</span>
                  ) : null}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={(event) => {
              const container = event.currentTarget;
              stickToBottomRef.current =
                container.scrollHeight - container.scrollTop - container.clientHeight < 64;
              if (stickToBottomRef.current) setHasNewMessages(false);
            }}
            className={cn("h-full", scrollPaneClassName)}
          >
            <div className="mx-auto max-w-3xl space-y-5 px-3 py-3 sm:px-4">
              {groupedMessages.map((group) => (
                <div key={group.date} className="space-y-4">
                  <div className="flex items-center justify-center px-1">
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {formatDateSeparator(group.date)}
                    </span>
                  </div>

                  {group.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      session={session}
                      displayName={displayName}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {hasNewMessages ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full shadow-md"
              onClick={() => {
                const container = scrollRef.current;
                if (!container) return;
                container.scrollTop = container.scrollHeight;
                stickToBottomRef.current = true;
                setHasNewMessages(false);
              }}
            >
              New messages
            </Button>
          ) : null}
          <output aria-live="polite" className="sr-only">
            {hasNewMessages ? "New messages have arrived" : ""}
          </output>
        </div>

        <div className="shrink-0 px-3 pb-3 sm:px-4">
          {copilotMutation.data && composerMode === "reply" ? (
            <div className="mb-2 space-y-2 rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Bot className="h-3.5 w-3.5" /> Copilot draft
                </p>
                <span className="text-xs text-muted-foreground">Never sent automatically</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {copilotMutation.data.summary}
              </p>
              {copilotMutation.data.nextActions.length > 0 ? (
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {copilotMutation.data.nextActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setComposerMode("reply");
                    setReplyText(copilotMutation.data.draftReply);
                  }}
                >
                  Use editable draft
                </Button>
                {copilotMutation.data.sources.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Sources: {copilotMutation.data.sources.map((source) => source.title).join(", ")}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          <div
            className={cn(
              composerBoxClassName,
              composerMode === "note" &&
                "border-amber-300/70 bg-amber-50/40 dark:border-amber-800/70 dark:bg-amber-950/10",
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <fieldset className="inline-flex min-w-0 items-center gap-0.5 rounded-lg border border-border/50 bg-muted/30 p-0.5">
                <legend className="sr-only">Message type</legend>
                <Button
                  type="button"
                  size="sm"
                  variant={composerMode === "reply" ? "secondary" : "ghost"}
                  className="h-11 gap-1.5 px-3 text-xs sm:h-9 sm:px-2.5"
                  aria-pressed={composerMode === "reply"}
                  disabled={sendMessageMutation.isPending}
                  onClick={() => setComposerMode("reply")}
                >
                  <MessageSquare className="size-3.5" aria-hidden="true" />
                  Reply
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={composerMode === "note" ? "secondary" : "ghost"}
                  className="h-11 gap-1.5 px-3 text-xs sm:h-9 sm:px-2.5"
                  aria-pressed={composerMode === "note"}
                  disabled={sendMessageMutation.isPending}
                  onClick={() => setComposerMode("note")}
                >
                  <FileText className="size-3.5" aria-hidden="true" />
                  Note
                </Button>
              </fieldset>
              {composerMode === "note" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <FileText className="size-3" aria-hidden="true" />
                  Team only
                </span>
              ) : (
                <span
                  className="inline-flex max-w-[52%] min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:max-w-[60%]"
                  title={replyTargetLabel}
                >
                  <MessageSquare className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    To {displayName} · {getConversationChannelLabel(session.conversationChannel)}
                  </span>
                </span>
              )}
            </div>
            <Textarea
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              aria-label={composerMode === "reply" ? "Reply to customer" : "Internal note"}
              placeholder={
                composerMode === "reply" ? "Type your reply..." : "Write a note for your team..."
              }
              className="min-h-[64px] resize-none rounded-lg border-border/50 bg-muted/20 px-3 py-2 text-base leading-relaxed shadow-none sm:text-sm dark:bg-muted/10"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-0.5">
                {composerMode === "reply" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 gap-1.5 px-2 text-sm text-muted-foreground sm:h-9"
                    disabled={copilotMutation.isPending}
                    onClick={() => copilotMutation.mutate()}
                  >
                    <Bot className="size-4" aria-hidden="true" />
                    {copilotMutation.isPending ? "Thinking…" : "Copilot"}
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center">
                <span id="composer-shortcut-hint" className="sr-only">
                  Press Command or Control and Enter to send.
                </span>
                <span
                  aria-hidden="true"
                  className="mr-3 hidden text-xs text-muted-foreground sm:inline"
                >
                  ⌘/Ctrl + Enter
                </span>
                <Button
                  size="sm"
                  className="h-11 min-w-[76px] gap-1.5 rounded-md px-3.5 text-sm sm:h-9"
                  onClick={() => handleSend()}
                  disabled={!composerText.trim() || sendMessageMutation.isPending}
                  aria-keyshortcuts="Meta+Enter Control+Enter"
                  aria-describedby="composer-shortcut-hint"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2
                        className="size-3.5 motion-safe:animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      {composerMode === "reply" ? "Sending" : "Adding"}
                    </>
                  ) : (
                    <>
                      {composerMode === "reply" ? (
                        <Send className="size-3.5" aria-hidden="true" />
                      ) : null}
                      {composerMode === "reply" ? "Send" : "Add note"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  session,
  displayName,
}: {
  message: WidgetMessage;
  session: ConversationDetailData;
  displayName: string;
}) {
  const isUser = message.role === "user";
  const isTeam = message.authorType === "TEAM";
  const hasDocuments =
    message.metadata?.type === "documents" && !!message.metadata?.documents?.length;
  const parsedMessage = splitMessageSources(message.content);

  return (
    <div className="flex gap-3">
      {isUser ? (
        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
          <AvatarImage src={generateAvatarUrl(session.visitorId)} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className="min-w-0 max-w-[85%] sm:max-w-[78%]">
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "border border-border/50 bg-card text-foreground"
              : isTeam
                ? "border border-primary/15 bg-primary/8 text-foreground"
                : "border border-primary/10 bg-primary/5 text-foreground",
          )}
        >
          <Streamdown className="break-words font-sans text-sm leading-relaxed">
            {parsedMessage.content}
          </Streamdown>

          {parsedMessage.sources.length > 0 ? (
            <div
              className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5"
              aria-label="Sources"
            >
              <span className="mr-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <FileText className="h-3 w-3" aria-hidden="true" />
                Sources
              </span>
              {parsedMessage.sources.map((source) => (
                <span
                  key={source}
                  className="inline-flex max-w-full items-center rounded-md bg-background/80 px-2 py-1 text-xs leading-none text-foreground ring-1 ring-border/60"
                >
                  <span className="truncate">{source}</span>
                </span>
              ))}
            </div>
          ) : null}

          {hasDocuments ? (
            <div className="mt-3 space-y-2">
              {message.metadata!.documents!.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/80 p-2.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{doc.fileName}</p>
                    {doc.description ? (
                      <p className="truncate text-xs text-muted-foreground">{doc.description}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {message.role === "assistant" && message.feedback ? (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                  message.feedback === "positive"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                )}
              >
                {message.feedback === "positive" ? (
                  <ThumbsUp className="h-3 w-3" />
                ) : (
                  <ThumbsDown className="h-3 w-3" />
                )}
                {message.feedback === "positive" ? "Helpful" : "Not helpful"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right text-xs font-medium text-foreground">{children}</div>
    </div>
  );
}

function SessionDetailsContent({
  session,
  displayName,
  onSelectConversation,
}: {
  session: ConversationDetailData;
  displayName: string;
  onSelectConversation: (conversationId: string) => void;
}) {
  const { toast } = useToast();
  const userId = session.contactExternalId ?? session.visitorId;
  const locationLabel = [session.city, session.country].filter(Boolean).join(", ");
  const localTime = session.timezone
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: session.timezone,
      }).format(new Date())
    : null;

  const allNotes = [
    ...(session.contactNotes ?? []).map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt,
      authorName: note.authorName,
      type: "contact" as const,
    })),
    ...(session.internalNotes ?? []).map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt,
      authorName: "Team",
      type: "internal" as const,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const locationTimeLabel = [
    locationLabel,
    localTime ? `${localTime}${session.timezone ? ` (${session.timezone})` : ""}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <>
      <Card className={cn(detailCardClassName, "shrink-0")}>
        <CardHeader
          className={cn("flex flex-row items-center justify-between", detailCardHeaderClassName())}
        >
          <CardTitle className="text-xs font-semibold">Contact</CardTitle>
        </CardHeader>
        <CardContent className={detailCardContentClassName()}>
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={generateAvatarUrl(session.visitorId)} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{displayName}</p>
              {session.contactEmail ? (
                <p className="text-xs text-muted-foreground">{session.contactEmail}</p>
              ) : null}
              {session.contactPhone ? (
                <p className="text-xs text-muted-foreground">{session.contactPhone}</p>
              ) : null}
            </div>
          </div>

          {locationTimeLabel ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {locationLabel ? (
                <CountryFlag countryCode={session.ipData?.countryCode ?? ""} size="sm" />
              ) : null}
              <span className="truncate">{locationTimeLabel}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className={cn(detailCardClassName, "shrink-0")}>
        <CardHeader className={detailCardHeaderClassName()}>
          <CardTitle className="text-xs font-semibold">User details</CardTitle>
        </CardHeader>
        <CardContent className={cn("space-y-0 pb-3", detailCardContentClassName())}>
          <DetailRow label="User ID">
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-xs">{userId.slice(0, 12)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copy user ID"
                title="Copy user ID"
                className="-my-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(userId)
                    .then(() => toast({ title: "User ID copied" }))
                    .catch(() =>
                      toast({ title: "Could not copy user ID", variant: "destructive" }),
                    );
                }}
              >
                <Copy className="size-3.5" aria-hidden="true" />
              </Button>
            </span>
          </DetailRow>
          {session.contactCreatedAt ? (
            <DetailRow label="Signed up">
              {format(new Date(session.contactCreatedAt), "MMM d, yyyy")}
            </DetailRow>
          ) : null}
          <DetailRow label="Last seen">
            {formatDistanceToNow(new Date(session.contactLastSeenAt ?? session.lastActivityAt), {
              addSuffix: true,
            })}
          </DetailRow>
          {session.browser ? <DetailRow label="Browser">{session.browser}</DetailRow> : null}
          {session.os ? <DetailRow label="Device">{session.os}</DetailRow> : null}
        </CardContent>
      </Card>

      <Card className={cn(detailCardClassName, "shrink-0")}>
        <CardHeader className={detailCardHeaderClassName()}>
          <CardTitle className="text-xs font-semibold">Conversation details</CardTitle>
        </CardHeader>
        <CardContent className={cn("space-y-0 pb-3", detailCardContentClassName())}>
          <DetailRow label="Status">
            <Badge
              variant={statusBadgeVariant(session.conversationStatus ?? "OPEN")}
              className="text-[10px]"
            >
              {formatStatusLabel(session.conversationStatus ?? "OPEN")}
            </Badge>
          </DetailRow>
          <DetailRow label="AI replies">
            <Badge
              variant={session.aiPaused ? "outline" : "secondary"}
              className={cn(
                "inline-flex items-center gap-1 text-[10px]",
                session.aiPaused &&
                  "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300",
              )}
            >
              {session.aiPaused ? (
                <Pause className="size-3" aria-hidden="true" />
              ) : (
                <Bot className="size-3" aria-hidden="true" />
              )}
              {session.aiPaused ? "Paused" : "Enabled"}
            </Badge>
          </DetailRow>
          <DetailRow label="Ticket">{session.conversationSubject ?? "Customer request"}</DetailRow>
          <DetailRow label="Assignee">
            <span className="inline-flex items-center gap-1">
              {session.assigneeName ?? "Unassigned"}
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </span>
          </DetailRow>
          <DetailRow label="Channel">
            {session.conversationChannel === "WIDGET" ? "Widget" : session.conversationChannel}
          </DetailRow>
          <DetailRow label="Qualification">
            <Badge
              variant={session.contactCapturedAt ? "default" : "outline"}
              className="text-[10px]"
            >
              {session.contactCapturedAt ? "Contact captured" : "Anonymous"}
            </Badge>
          </DetailRow>
          <DetailRow label="Source">
            {session.contactSource ?? session.conversationChannel ?? "Widget"}
          </DetailRow>
          <DetailRow label="Started">
            {format(
              new Date(session.conversationStartedAt ?? session.createdAt),
              "MMM d, yyyy h:mm a",
            )}
          </DetailRow>
        </CardContent>
      </Card>

      {(session.previousConversations?.length ?? 0) > 0 ? (
        <Card className={cn(detailCardClassName, "shrink-0")}>
          <CardHeader className={detailCardHeaderClassName()}>
            <CardTitle className="text-xs font-semibold">Previous conversations</CardTitle>
          </CardHeader>
          <CardContent className={cn("space-y-1 pb-3", detailCardContentClassName())}>
            {session.previousConversations?.map((conversation) => {
              const statusLabel =
                conversation.status === "CLOSED"
                  ? "Resolved"
                  : formatStatusLabel(conversation.status);
              const lastMessageLabel = format(new Date(conversation.lastMessageAt), "MMM d, yyyy");

              return (
                <button
                  key={conversation.id}
                  type="button"
                  className="group flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label={`Open previous conversation: ${conversation.subject}, ${statusLabel}, ${lastMessageLabel}`}
                  title={conversation.subject}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-xs font-medium text-foreground group-hover:text-primary">
                      {conversation.subject}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {lastMessageLabel}
                    </span>
                  </span>
                  <Badge
                    variant={conversation.status === "CLOSED" ? "secondary" : "outline"}
                    className={cn(
                      "shrink-0 text-[10px]",
                      conversation.status === "CLOSED" &&
                        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                    )}
                  >
                    {statusLabel}
                  </Badge>
                  <ArrowRight
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {(session.workflows?.length ?? 0) > 0 ? (
        <Card className={cn(detailCardClassName, "shrink-0")}>
          <CardHeader className={detailCardHeaderClassName()}>
            <CardTitle className="text-xs font-semibold">Workflows</CardTitle>
          </CardHeader>
          <CardContent className={cn("space-y-3 pb-3", detailCardContentClassName())}>
            {session.workflows?.map((workflow) => {
              const startAt = workflowInputString(workflow.input, "startAt");
              const attendeeEmail = workflowInputString(workflow.input, "attendeeEmail");
              return (
                <div key={workflow.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {workflow.name === "appointment.booking"
                          ? "Appointment booking"
                          : workflow.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(workflow.startedAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge variant={workflowStatusVariant(workflow.status)} className="text-[11px]">
                      {formatStatusLabel(workflow.status.replaceAll("_", " "))}
                    </Badge>
                  </div>
                  {startAt || attendeeEmail ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {startAt ? format(new Date(startAt), "MMM d, yyyy h:mm a") : null}
                      {startAt && attendeeEmail ? " · " : null}
                      {attendeeEmail}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-2 border-l pl-3">
                    {workflow.steps.map((step) => (
                      <div key={step.id}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate">{step.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatStatusLabel(step.status.replaceAll("_", " "))}
                          </span>
                        </div>
                        {step.errorMessage ? (
                          <p className="mt-0.5 text-xs text-destructive">{step.errorMessage}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {workflow.errorMessage ? (
                    <p className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      {workflow.errorMessage}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card className={cn(detailCardClassName, "shrink-0")}>
        <CardHeader className={detailCardHeaderClassName()}>
          <CardTitle className="text-xs font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent className={cn("pb-3", detailCardContentClassName())}>
          {allNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No notes yet. Choose Note in the composer to add one for your team.
            </p>
          ) : (
            <div className="space-y-3">
              {allNotes.map((note) => (
                <div key={note.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs leading-relaxed text-foreground">{note.body}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                      {note.type === "internal" ? "Internal" : "Contact"}
                    </Badge>
                    <span>
                      {format(new Date(note.createdAt), "MMM d, yyyy")} · {note.authorName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export { SessionDetailsContent };
