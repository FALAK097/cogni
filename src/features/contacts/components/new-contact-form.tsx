"use client";

import { useActionState } from "react";

import { createContactAction, type ContactActionState } from "@/features/contacts/actions";
import { Button } from "@/components/ui/button";

const initialState: ContactActionState = {};

export function NewContactForm() {
  const [state, formAction, pending] = useActionState(createContactAction, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-3xl border p-6">
      <label className="grid gap-2 text-sm font-medium">
        Name
        <input
          name="name"
          required
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        External ID
        <input
          name="externalId"
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create contact"}
      </Button>
    </form>
  );
}
