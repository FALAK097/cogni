"use client";

import { useActionState, useEffect, useRef } from "react";
import { SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { replyToConversationAction, type InboxActionState } from "@/features/inbox/actions";

const initialState: InboxActionState = {};

export function ReplyComposer({ conversationId }: { conversationId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(replyToConversationAction, initialState);

  useEffect(() => {
    if (state.submittedAt) {
      formRef.current?.reset();
    }
  }, [state.submittedAt]);

  return (
    <form ref={formRef} action={formAction} className="border-t bg-background p-4 sm:p-5">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label className="sr-only" htmlFor="reply-message">
        Reply
      </label>
      <textarea
        id="reply-message"
        name="message"
        required
        rows={4}
        placeholder="Reply to the customer…"
        className="w-full resize-none rounded-2xl border bg-muted/25 px-4 py-3 text-sm leading-6 outline-none transition-shadow placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/30"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Visible to the customer</span>
        <Button type="submit" size="sm" disabled={pending}>
          <HugeiconsIcon icon={SentIcon} />
          {pending ? "Sending…" : "Send reply"}
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
