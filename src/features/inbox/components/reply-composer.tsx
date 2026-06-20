"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { SentIcon, StickyNote01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { replyToConversationAction, type InboxActionState } from "@/features/inbox/actions";

const initialState: InboxActionState = {};

export function ReplyComposer({ conversationId }: { conversationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
  const [state, formAction, pending] = useActionState(replyToConversationAction, initialState);

  useEffect(() => {
    if (state.submittedAt) {
      formRef.current?.reset();
    }
  }, [state.submittedAt]);

  return (
    <form ref={formRef} action={formAction} className="border-t bg-background p-4 sm:p-5">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="visibility" value={mode} />
      <div className="mb-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "PUBLIC" ? "default" : "outline"}
          onClick={() => setMode("PUBLIC")}
        >
          <HugeiconsIcon icon={SentIcon} />
          Reply
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "INTERNAL" ? "default" : "outline"}
          onClick={() => setMode("INTERNAL")}
        >
          <HugeiconsIcon icon={StickyNote01Icon} />
          Internal note
        </Button>
      </div>
      <label className="sr-only" htmlFor="reply-message">
        {mode === "PUBLIC" ? "Reply" : "Internal note"}
      </label>
      <textarea
        id="reply-message"
        name="message"
        required
        rows={4}
        placeholder={
          mode === "PUBLIC" ? "Reply to the customer…" : "Add an internal note for your team…"
        }
        className="w-full resize-none rounded-2xl border bg-muted/25 px-4 py-3 text-sm leading-6 outline-none transition-shadow placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/30"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {mode === "PUBLIC" ? "Visible to the customer" : "Only visible to workspace members"}
        </span>
        <Button type="submit" size="sm" disabled={pending}>
          <HugeiconsIcon icon={mode === "PUBLIC" ? SentIcon : StickyNote01Icon} />
          {pending ? "Saving…" : mode === "PUBLIC" ? "Send reply" : "Add note"}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
