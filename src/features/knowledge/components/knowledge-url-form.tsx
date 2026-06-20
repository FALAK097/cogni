"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { addUrlSourceAction, type KnowledgeActionState } from "@/features/knowledge/actions";

const initialState: KnowledgeActionState = {};

export function KnowledgeUrlForm() {
  const [state, formAction, pending] = useActionState(addUrlSourceAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-3xl border p-6">
      <h2 className="text-base font-semibold">Add website source</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Title
          <input
            name="title"
            required
            placeholder="Product docs"
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          URL
          <input
            name="sourceUrl"
            type="url"
            required
            placeholder="https://example.com/docs"
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.savedAt ? <p className="text-sm text-muted-foreground">URL source added.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add source"}
      </Button>
    </form>
  );
}
