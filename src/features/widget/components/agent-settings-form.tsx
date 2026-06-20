"use client";

import { useActionState } from "react";
import { FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  saveWidgetAgentSettingsAction,
  type WidgetAgentActionState,
} from "@/features/widget/actions";

const initialState: WidgetAgentActionState = {};

export function AgentSettingsForm({
  instructions,
  escalationKeywords,
}: {
  instructions: string;
  escalationKeywords: string;
}) {
  const [state, formAction, pending] = useActionState(saveWidgetAgentSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-5 rounded-3xl border p-6">
      <label className="grid gap-2 text-sm font-medium">
        Instructions
        <textarea
          name="instructions"
          required
          defaultValue={instructions}
          rows={8}
          className="w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Escalation keywords
        <input
          name="escalationKeywords"
          required
          defaultValue={escalationKeywords}
          placeholder="human,agent,person,representative,support team"
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.savedAt ? (
        <p className="text-sm text-muted-foreground">Agent settings saved.</p>
      ) : null}
      <Button type="submit" disabled={pending}>
        <HugeiconsIcon icon={FloppyDiskIcon} />
        {pending ? "Saving…" : "Save agent settings"}
      </Button>
    </form>
  );
}
