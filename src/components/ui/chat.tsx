"use client";

import * as React from "react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  ThumbsDown,
  ThumbsUp,
} from "@/components/icons";

export type ChatMessageAlignment = "incoming" | "outgoing" | "internal";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateMarker(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

/* -------------------------------------------------------------------------- */
/* ChatMessage: Row container for a chat transcript entry                     */
/* -------------------------------------------------------------------------- */

export interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  alignment?: ChatMessageAlignment;
}

export function ChatMessage({
  alignment = "incoming",
  className,
  children,
  ...props
}: ChatMessageProps) {
  return (
    <div
      data-slot="chat-message"
      data-message-alignment={alignment}
      className={cn(
        "flex w-full min-w-0 gap-3",
        alignment === "outgoing" ? "justify-end" : "justify-start",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatMessageContent: Inner message wrapper with stable max-width & wrapping */
/* -------------------------------------------------------------------------- */

export interface ChatMessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  alignment?: ChatMessageAlignment;
}

export function ChatMessageContent({
  alignment = "incoming",
  className,
  children,
  ...props
}: ChatMessageContentProps) {
  return (
    <div
      data-slot="chat-message-content"
      className={cn(
        "flex min-w-0 max-w-[min(88%,calc(100%-3rem))] flex-col sm:max-w-[min(78%,calc(100%-3rem))]",
        alignment === "outgoing" && "items-end",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatMessageAvatar: Avatar wrapper with consistent sizing & fallbacks       */
/* -------------------------------------------------------------------------- */

export interface ChatMessageAvatarProps extends React.ComponentProps<typeof Avatar> {
  src?: string;
  alt?: string;
  initials?: string;
  fallbackIcon?: React.ReactNode;
}

export function ChatMessageAvatar({
  src,
  alt = "",
  initials,
  fallbackIcon,
  className,
  ...props
}: ChatMessageAvatarProps) {
  return (
    <Avatar
      data-slot="chat-message-avatar"
      className={cn("mt-0.5 size-8 shrink-0 select-none", className)}
      {...props}
    >
      {src ? <AvatarImage src={src} alt={alt} /> : null}
      <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
        {fallbackIcon ?? initials ?? ""}
      </AvatarFallback>
    </Avatar>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatMessageHeader: Metadata line for author, role marker, and timestamp    */
/* -------------------------------------------------------------------------- */

export interface ChatMessageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  author?: string;
  timestamp?: string | Date;
  isInternal?: boolean;
}

export function ChatMessageHeader({
  author,
  timestamp,
  isInternal,
  className,
  children,
  ...props
}: ChatMessageHeaderProps) {
  const dateObj = timestamp
    ? typeof timestamp === "string"
      ? new Date(timestamp)
      : timestamp
    : null;

  return (
    <div
      data-slot="chat-message-header"
      className={cn(
        "mb-1 flex min-h-4 min-w-0 items-center gap-2 px-1 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {author ? (
        <span className="min-w-0 truncate font-medium text-foreground">{author}</span>
      ) : null}
      {isInternal ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
          <FileText className="size-3" aria-hidden="true" />
          Internal note
        </span>
      ) : null}
      {children}
      {dateObj ? (
        <time
          dateTime={dateObj.toISOString()}
          title={format(dateObj, "PPpp")}
          className="ml-auto shrink-0 tabular-nums text-muted-foreground"
        >
          {format(dateObj, "p")}
        </time>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatBubble: Minimal, flat, typography-driven message bubble                */
/* -------------------------------------------------------------------------- */

export const chatBubbleVariants = cva(
  "relative min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed transition-colors [overflow-wrap:anywhere] break-words",
  {
    variants: {
      variant: {
        incoming: "bg-muted text-foreground",
        outgoing: "bg-muted text-foreground",
        internal: "bg-muted/60 text-foreground",
        team: "bg-muted text-foreground",
      },
    },
    defaultVariants: {
      variant: "incoming",
    },
  },
);

export interface ChatBubbleProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof chatBubbleVariants> {}

export function ChatBubble({ variant, className, children, ...props }: ChatBubbleProps) {
  return (
    <div
      data-slot="chat-bubble"
      className={cn(chatBubbleVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatAttachmentChip: Clean typography-driven attachment chip                */
/* -------------------------------------------------------------------------- */

export interface ChatAttachmentChipProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  createdAt?: string | Date;
}

export function ChatAttachmentChip({
  fileName,
  fileSize,
  mimeType = "",
  createdAt,
  href,
  download,
  className,
  ...props
}: ChatAttachmentChipProps) {
  const isImage = mimeType.startsWith("image/");
  const formattedSize = fileSize !== undefined ? formatFileSize(fileSize) : null;
  const formattedDate = createdAt
    ? format(typeof createdAt === "string" ? new Date(createdAt) : createdAt, "MMM d, p")
    : null;
  const opensInNewTab = props.target === "_blank";
  const shouldDownload = download !== undefined && download !== false;
  const actionLabel = shouldDownload ? "Download" : opensInNewTab ? "Open" : "View";

  const content = (
    <>
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
        {isImage ? (
          <ImageIcon className="size-3.5" aria-hidden="true" />
        ) : (
          <FileText className="size-3.5" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-foreground group-hover:text-primary">
          {fileName}
        </span>
        {formattedSize || formattedDate ? (
          <span className="block text-[11px] text-muted-foreground tabular-nums">
            {formattedSize}
            {formattedSize && formattedDate ? " · " : ""}
            {formattedDate}
          </span>
        ) : null}
      </span>
      {href ? (
        opensInNewTab ? (
          <ExternalLink
            className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        ) : (
          <Download
            className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        )
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        data-slot="chat-attachment-chip"
        href={href}
        download={download}
        aria-label={`${actionLabel} ${fileName}${formattedSize ? `, ${formattedSize}` : ""}${opensInNewTab ? " in a new tab" : ""}`}
        title={fileName}
        className={cn(
          "group flex min-h-10 min-w-0 max-w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className,
        )}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      data-slot="chat-attachment-chip"
      title={fileName}
      className={cn(
        "flex min-h-10 min-w-0 max-w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-left",
        className,
      )}
    >
      {content}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatCitationChip: Minimal typography-driven source citation accordion      */
/* -------------------------------------------------------------------------- */

export interface ChatCitationChipProps {
  documentId?: string;
  title: string;
  excerpt?: string;
  href?: string;
  className?: string;
}

export function ChatCitationChip({
  title,
  excerpt,
  href = "/agent#build",
  className,
}: ChatCitationChipProps) {
  return (
    <details
      data-slot="chat-citation-chip"
      className={cn(
        "group min-w-0 max-w-full rounded-md border border-border/60 bg-background/75 transition-colors open:bg-background",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="shrink-0 text-[11px] font-normal text-muted-foreground group-open:hidden">
          Preview
        </span>
        <ChevronDown
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      {excerpt ? (
        <p className="whitespace-pre-wrap border-t border-border/50 px-2.5 py-2 text-xs leading-relaxed break-words text-muted-foreground [overflow-wrap:anywhere]">
          {excerpt}
        </p>
      ) : null}
      <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-2.5 py-1.5 text-[11px] text-muted-foreground">
        <span>Source document</span>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span>Inspect in Knowledge</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </details>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatFeedback: Flat, accessible rating badge or action indicator             */
/* -------------------------------------------------------------------------- */

export interface ChatFeedbackProps extends React.HTMLAttributes<HTMLElement> {
  feedback?: "positive" | "negative" | null;
  onFeedback?: (type: "positive" | "negative") => void;
  readOnly?: boolean;
}

export function ChatFeedback({
  feedback,
  onFeedback,
  readOnly = true,
  className,
  ...props
}: ChatFeedbackProps) {
  if (!feedback && readOnly) return null;

  if (readOnly && feedback) {
    const isPositive = feedback === "positive";
    return (
      <div
        data-slot="chat-feedback-indicator"
        className={cn("mt-2 flex items-center gap-1", className)}
        {...props}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium select-none",
            isPositive
              ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
          )}
        >
          {isPositive ? (
            <ThumbsUp className="size-3" aria-hidden="true" />
          ) : (
            <ThumbsDown className="size-3" aria-hidden="true" />
          )}
          <span>{isPositive ? "Helpful" : "Not helpful"}</span>
        </span>
      </div>
    );
  }

  return (
    <fieldset
      data-slot="chat-feedback-group"
      aria-label="Rate this response"
      className={cn(
        "m-0 flex items-center gap-1 border-0 p-0 mt-2 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <button
        type="button"
        aria-label="Mark response as helpful"
        aria-pressed={feedback === "positive"}
        onClick={() => onFeedback?.("positive")}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md border border-border/50 text-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          feedback === "positive" &&
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        )}
      >
        <ThumbsUp className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Mark response as not helpful"
        aria-pressed={feedback === "negative"}
        onClick={() => onFeedback?.("negative")}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-md border border-border/50 text-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          feedback === "negative" &&
            "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        )}
      >
        <ThumbsDown className="size-3" aria-hidden="true" />
      </button>
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatDateSeparator: Centered minimal date marker between conversation days  */
/* -------------------------------------------------------------------------- */

export interface ChatDateSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  date: string | Date;
}

export function ChatDateSeparator({ date, className, ...props }: ChatDateSeparatorProps) {
  return (
    <div
      data-slot="chat-date-separator"
      className={cn("flex items-center justify-center px-1 my-3 select-none", className)}
      {...props}
    >
      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        {formatDateMarker(date)}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatTypingIndicator: Smooth, stable 3-dot typing pulse                      */
/* -------------------------------------------------------------------------- */

export interface ChatTypingIndicatorProps extends React.HTMLAttributes<HTMLOutputElement> {
  agentName?: string;
}

export function ChatTypingIndicator({
  agentName = "Assistant",
  className,
  ...props
}: ChatTypingIndicatorProps) {
  return (
    <output
      data-slot="chat-typing-indicator"
      aria-live="polite"
      aria-label={`${agentName} is typing`}
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-2xl bg-muted px-4 py-2 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-bounce [animation-delay:-0.3s]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-bounce [animation-delay:-0.15s]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-bounce" />
      <span className="sr-only">{agentName} is typing</span>
    </output>
  );
}

/* -------------------------------------------------------------------------- */
/* ChatStreamingCursor: Minimal inline blinking cursor for live message stream*/
/* -------------------------------------------------------------------------- */

export function ChatStreamingCursor({ className }: { className?: string }) {
  return (
    <span
      data-slot="chat-streaming-cursor"
      aria-hidden="true"
      className={cn(
        "inline-block h-3.5 w-1.5 translate-y-0.5 bg-foreground/70 motion-safe:animate-pulse",
        className,
      )}
    />
  );
}
