"use client";

import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Laptop,
  MapPin,
  Monitor,
  MoreVertical,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountryFlag } from "@/components/ui/country-flag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteWidgetSession, useWidgetSession } from "@/hooks/query";
import type { WidgetSessionDetail } from "@/hooks/query";
import { generateAvatarUrl } from "@/lib/avatar-generator";
import { getVisitorName } from "@/lib/constants";

interface ConversationDetailProps {
  sessionId: string;
  onBack: () => void;
}

export function ConversationDetail({ sessionId, onBack }: ConversationDetailProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: session } = useWidgetSession(sessionId);
  const deleteWidgetSessionMutation = useDeleteWidgetSession();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session]);

  const handleDelete = () => {
    deleteWidgetSessionMutation.mutate(sessionId, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Conversation deleted",
        });
        onBack();
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete conversation",
          variant: "destructive",
        });
      },
    });
  };

  const handleExport = () => {
    if (!session) return;

    const sessionData = {
      "Visitor ID": session.visitorId,
      Location: `${session.city}, ${session.country}`,
      "IP Address": session.ipData?.ip,
      Device: `${session.os} - ${session.browser}`,
      "Created At": format(new Date(session.createdAt), "PP p"),
      "Last Active": format(new Date(session.lastActivityAt), "PP p"),
      "Page URL": session.pageUrl,
      Referrer: session.referrer,
    };

    const messagesData = session.messages.map((msg) => ({
      Role: msg.role,
      Content: msg.content,
      Time: format(new Date(msg.timestamp), "PP p"),
      Feedback: msg.feedback || "",
      "Feedback Reason": msg.feedbackReason || "",
      "Feedback At": msg.feedbackAt ? format(new Date(msg.feedbackAt), "PP p") : "",
    }));

    const payload = {
      session: sessionData,
      messages: messagesData,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `conversation-${session.visitorId || "anonymous"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!session) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden lg:flex-row bg-background">
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
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

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:min-h-full">
        {/* Header */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>

              {/* Mobile Details Trigger */}
              <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
                <SheetTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon"
                      title="Session Details"
                      className="lg:hidden"
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                  }
                />
                <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Session Details</SheetTitle>
                  </SheetHeader>
                  <SessionDetailsContent session={session} />
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="shrink-0">
              <AvatarImage src={generateAvatarUrl(session.visitorId)} />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{getVisitorName(session.visitorId)}</h3>
              <div className="flex flex-wrap items-center text-xs gap-x-2 gap-y-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <CountryFlag countryCode={session.ipData?.countryCode ?? ""} size="sm" />{" "}
                  {session.city}, {session.country}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>{format(new Date(session.lastActivityAt), "PP p")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            {session.messages.map((msg) => {
              const hasDocuments =
                msg.metadata?.type === "documents" && !!msg.metadata?.documents?.length;

              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-muted text-foreground dark:border dark:border-zinc-600/80 dark:bg-zinc-700 dark:text-zinc-50"
                        : "bg-violet-600 text-white dark:bg-violet-300 dark:text-violet-950"
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>

                    {/* Document attachments */}
                    {hasDocuments && (
                      <div className="mt-3 space-y-2">
                        {msg.metadata!.documents!.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-background/80 border border-border/50"
                          >
                            <div className="flex items-center justify-center rounded-md w-9 h-9 bg-primary/10 text-primary shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{doc.fileName}</p>
                              {doc.description && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center transition-colors rounded-md w-7 h-7 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                              title="Download"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] opacity-70">
                          {format(new Date(msg.timestamp), "p")}
                        </span>
                        {msg.role === "assistant" && msg.feedback && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              msg.feedback === "positive"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {msg.feedback === "positive" ? (
                              <ThumbsUp className="w-3 h-3" />
                            ) : (
                              <ThumbsDown className="w-3 h-3" />
                            )}
                            {msg.feedback === "positive" ? "Helpful" : "Not helpful"}
                          </span>
                        )}
                      </div>
                      {msg.feedbackReason && (
                        <span className="text-[10px] italic text-red-600 dark:text-red-400">
                          Reason: {msg.feedbackReason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar Metadata - Desktop Only */}
      <div className="hidden h-full p-4 overflow-y-auto border-l lg:flex lg:flex-col w-80 bg-muted/5 shrink-0">
        <h4 className="mb-4 font-semibold">Session Details</h4>
        <SessionDetailsContent session={session} />
      </div>
    </div>
  );
}

function SessionDetailsContent({ session }: { session: WidgetSessionDetail }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <CountryFlag countryCode={session.ipData?.countryCode ?? ""} size="sm" />
            <span>
              {session.city}, {session.country}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">IP: {session.ipData?.ip || "Unknown"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Laptop className="w-4 h-4 text-muted-foreground" />
            Device Info
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm">
          <div className="font-medium">
            {session.os} - {session.browser}
          </div>
          <div className="text-xs text-muted-foreground">Screen: {session.screenSize}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Source
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Page URL</div>
            <div className="truncate" title={session.pageUrl || ""}>
              {session.pageUrl}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Referrer</div>
            <div className="truncate" title={session.referrer || ""}>
              {session.referrer || "Direct"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
