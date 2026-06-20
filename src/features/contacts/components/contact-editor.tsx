"use client";

import { useActionState, useEffect } from "react";
import { FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { updateContactAction, type ContactActionState } from "@/features/contacts/actions";

const initialState: ContactActionState = {};

export function ContactEditor({
  contact,
}: {
  contact: {
    id: string;
    name: string;
    email: string | null;
    externalId: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateContactAction, initialState);

  useEffect(() => {
    if (state.savedAt) {
      // noop: revalidation updates server props
    }
  }, [state.savedAt]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="contactId" value={contact.id} />
      <label className="grid gap-2 text-sm font-medium">
        Name
        <input
          name="name"
          defaultValue={contact.name}
          required
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          defaultValue={contact.email ?? ""}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        External ID
        <input
          name="externalId"
          defaultValue={contact.externalId ?? ""}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.savedAt ? <p className="text-sm text-muted-foreground">Contact saved.</p> : null}
      <Button type="submit" disabled={pending}>
        <HugeiconsIcon icon={FloppyDiskIcon} />
        {pending ? "Saving…" : "Save contact"}
      </Button>
    </form>
  );
}
