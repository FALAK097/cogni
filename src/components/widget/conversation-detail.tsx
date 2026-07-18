"use client";

import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Clock,
  Download,
  File,
  FileText,
  LinkIcon,
  MoreVertical,
  Pencil,
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
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  useAssignConversation,
  useConversation,
  useDeleteConversation,
  useSendConversationMessage,
} from "@/hooks/query";
import type { ConversationDetail as ConversationDetailData, WidgetMessage } from "@/hooks/query";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { cn } from "@/lib/utils";

import {
  hideScrollbarClassName,
  detailCardClassName,
  composerBoxClassName,
} from "./conversation-layout";

interface ConversationDetailProps {
  conversationId: string;
  onBack: () => void;
  part?: "chat" | "details";
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

function isOnline(lastActivityAt: string) {
  return Date.now() - new Date(lastActivityAt).getTime() < 5 * 60 * 1000;
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
  onBack,
  part = "chat",
}: ConversationDetailProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [composerText, setComposerText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading, isError, error } = useConversation(conversationId);
  const deleteConversationMutation = useDeleteConversation();
  const assignMutation = useAssignConversation();
  const sendMessageMutation = useSendConversationMessage();

  const messages = session?.messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const displayName = session ? getDisplayName(session) : "";
  const online = session ? isOnline(session.lastActivityAt) : false;

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
    assignMutation.mutate(conversationId, {
      onSuccess: () => toast({ title: "Conversation assigned to you" }),
      onError: () => toast({ title: "Failed to assign conversation", variant: "destructive" }),
    });
  };

  const handleSend = () => {
    const text = composerText.trim();
    if (!text) return;

    sendMessageMutation.mutate(
      { conversationId, message: text, action: "reply" },
      {
        onSuccess: () => {
          setComposerText("");
          toast({ title: "Reply sent" });
        },
        onError: () => {
          toast({ title: "Failed to send message", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading && !session) {
    if (part === "details") {
      return (
        <div className={cn("flex h-full flex-col gap-2.5", hideScrollbarClassName)}>
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

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load conversation";
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  }

  if (!session) return null;

  const isAssignedToMe = session.assigneeId === session.currentMembershipId;

  if (part === "details") {
    return (
      <div className={cn("flex h-full flex-col gap-2.5", hideScrollbarClassName)}>
        <SessionDetailsContent
          conversationId={conversationId}
          session={session}
          displayName={displayName}
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-7 w-7 shrink-0 lg:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>

            <Avatar className="h-7 w-7">
              <AvatarImage src={generateAvatarUrl(session.visitorId)} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
              {online ? (
                <AvatarBadge className="size-2 bg-emerald-500 ring-2 ring-background" />
              ) : null}
            </Avatar>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{displayName}</h3>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    online ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )}
                />
                {online ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isAssignedToMe ? (
              <Button
                variant="outline"
                size="sm"
                className="hidden h-7 rounded-md border-border/60 px-2.5 text-[11px] shadow-none sm:inline-flex"
                onClick={handleAssign}
                disabled={assignMutation.isPending}
              >
                <UserPlus className="mr-1 h-3 w-3" />
                Assign to me
              </Button>
            ) : null}

            <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md border-border/60 px-2.5 text-[11px] shadow-none xl:hidden"
                  >
                    Details
                  </Button>
                }
              />
              <SheetContent
                side="right"
                className={cn("w-full max-w-sm p-0", hideScrollbarClassName)}
              >
                <SheetHeader className="border-b border-border/60 px-4 py-4">
                  <SheetTitle>Conversation details</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <SessionDetailsContent
                    conversationId={conversationId}
                    session={session}
                    displayName={displayName}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </DropdownMenuItem>
                {!isAssignedToMe ? (
                  <DropdownMenuItem onClick={handleAssign} className="sm:hidden">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign to me
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div ref={scrollRef} className={cn("min-h-0 flex-1", hideScrollbarClassName)}>
          <div className="mx-auto max-w-3xl space-y-5 px-3 py-3 sm:px-4">
            {groupedMessages.map((group) => (
              <div key={group.date} className="space-y-4">
                <div className="flex items-center justify-center px-1">
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
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

        <div className="shrink-0 px-3 pb-3 sm:px-4">
          <div className={composerBoxClassName}>
            <Textarea
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              placeholder="Type your reply..."
              className="min-h-[64px] resize-none rounded-lg border-border/50 bg-[#fafafa] px-3 py-2 text-sm leading-relaxed shadow-none dark:bg-zinc-900/50"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="Formatting"
                >
                  <span className="text-[10px] font-semibold">T</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="Add emoji"
                >
                  <span className="text-[11px]">☺</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="Attach file"
                >
                  <File className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="Add link"
                >
                  <LinkIcon className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center">
                <Button
                  size="sm"
                  className="h-7 rounded-r-none px-3 text-xs"
                  onClick={handleSend}
                  disabled={!composerText.trim() || sendMessageMutation.isPending}
                >
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 rounded-l-none border-l border-primary-foreground/20 px-1.5"
                  aria-label="Send options"
                >
                  <ChevronDown className="h-3 w-3" />
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
              ? "border border-border/50 bg-white text-foreground dark:bg-zinc-950"
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
              <span className="mr-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <FileText className="h-3 w-3" aria-hidden="true" />
                Sources
              </span>
              {parsedMessage.sources.map((source) => (
                <span
                  key={source}
                  className="inline-flex max-w-full items-center rounded-md bg-background/80 px-2 py-1 text-[11px] leading-none text-foreground ring-1 ring-border/60"
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
                      <p className="truncate text-[10px] text-muted-foreground">
                        {doc.description}
                      </p>
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
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="text-right text-[11px] font-medium text-foreground">{children}</div>
    </div>
  );
}

function SessionDetailsContent({
  conversationId,
  session,
  displayName,
}: {
  conversationId: string;
  session: ConversationDetailData;
  displayName: string;
}) {
  const { toast } = useToast();
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const sendMessageMutation = useSendConversationMessage();
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

  const handleSaveNote = () => {
    const text = noteText.trim();
    if (!text) return;

    sendMessageMutation.mutate(
      { conversationId, message: text, action: "note" },
      {
        onSuccess: () => {
          setNoteText("");
          setIsAddingNote(false);
          toast({ title: "Note added" });
        },
        onError: () => {
          toast({ title: "Failed to add note", variant: "destructive" });
        },
      },
    );
  };

  return (
    <>
      <Card className={cn(detailCardClassName, "shrink-0")}>
        <CardHeader
          className={cn("flex flex-row items-center justify-between", detailCardHeaderClassName())}
        >
          <CardTitle className="text-xs font-semibold">Contact</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Edit contact">
            <Pencil className="h-3 w-3" />
          </Button>
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
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
            <span className="font-mono text-[11px]">
              {session.contactExternalId ?? session.visitorId.slice(0, 12)}
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
          <CardContent className={cn("space-y-2.5 pb-3", detailCardContentClassName())}>
            {session.previousConversations?.map((conversation) => (
              <div key={conversation.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {conversation.subject}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(conversation.lastMessageAt), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge
                  variant={conversation.status === "CLOSED" ? "secondary" : "outline"}
                  className={cn(
                    "shrink-0 text-[10px]",
                    conversation.status === "CLOSED" &&
                      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                  )}
                >
                  {conversation.status === "CLOSED"
                    ? "Resolved"
                    : formatStatusLabel(conversation.status)}
                </Badge>
              </div>
            ))}
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
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(workflow.startedAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge variant={workflowStatusVariant(workflow.status)} className="text-[9px]">
                      {formatStatusLabel(workflow.status.replaceAll("_", " "))}
                    </Badge>
                  </div>
                  {startAt || attendeeEmail ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {startAt ? format(new Date(startAt), "MMM d, yyyy h:mm a") : null}
                      {startAt && attendeeEmail ? " · " : null}
                      {attendeeEmail}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-2 border-l pl-3">
                    {workflow.steps.map((step) => (
                      <div key={step.id}>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate">{step.name}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatStatusLabel(step.status.replaceAll("_", " "))}
                          </span>
                        </div>
                        {step.errorMessage ? (
                          <p className="mt-0.5 text-[10px] text-destructive">{step.errorMessage}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {workflow.errorMessage ? (
                    <p className="mt-2 rounded bg-destructive/10 p-2 text-[10px] text-destructive">
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
        <CardHeader
          className={cn("flex flex-row items-center justify-between", detailCardHeaderClassName())}
        >
          <CardTitle className="text-xs font-semibold">Notes</CardTitle>
          <button
            type="button"
            onClick={() => setIsAddingNote((current) => !current)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            + Add note
          </button>
        </CardHeader>
        <CardContent className={cn("pb-3", detailCardContentClassName())}>
          {isAddingNote ? (
            <div className="mb-3 space-y-2">
              <Textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Add an internal note..."
                className="min-h-[72px] resize-none text-xs leading-relaxed"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    handleSaveNote();
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNoteText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || sendMessageMutation.isPending}
                >
                  Save note
                </Button>
              </div>
            </div>
          ) : null}

          {allNotes.length === 0 && !isAddingNote ? (
            <p className="text-xs text-muted-foreground">No notes yet</p>
          ) : (
            <div className="space-y-3">
              {allNotes.map((note) => (
                <div key={note.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs leading-relaxed text-foreground">{note.body}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {format(new Date(note.createdAt), "MMM d, yyyy")} · {note.authorName}
                  </p>
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
