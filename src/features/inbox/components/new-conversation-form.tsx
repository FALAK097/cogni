"use client";

import { useActionState } from "react";
import { SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { createConversationAction, type InboxActionState } from "@/features/inbox/actions";

const initialState: InboxActionState = {};
const fieldClassName =
  "h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/30";

export function NewConversationForm() {
  const [state, formAction, pending] = useActionState(createConversationAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Customer name
          <input
            name="contactName"
            required
            autoComplete="name"
            placeholder="Jane Smith"
            className={fieldClassName}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Email
          <input
            name="contactEmail"
            type="email"
            autoComplete="email"
            placeholder="jane@company.com"
            className={fieldClassName}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Subject
        <input name="subject" required placeholder="How can we help?" className={fieldClassName} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        First message
        <textarea
          name="message"
          required
          rows={7}
          placeholder="Write the first message in this conversation…"
          className="w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6 outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <HugeiconsIcon icon={SentIcon} />
          {pending ? "Creating…" : "Create conversation"}
        </Button>
      </div>
    </form>
  );
}
