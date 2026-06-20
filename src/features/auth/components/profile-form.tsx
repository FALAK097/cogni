"use client";

import { useActionState } from "react";
import { FloppyDiskIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { updateProfileAction, type ProfileActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

const initialState: ProfileActionState = {};

export function ProfileForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <label className="grid gap-2 text-sm font-medium">
        Display name
        <input
          name="name"
          defaultValue={name}
          required
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.savedAt ? <p className="text-sm text-muted-foreground">Profile updated.</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        <HugeiconsIcon icon={FloppyDiskIcon} />
        {pending ? "Saving…" : "Update profile"}
      </Button>
    </form>
  );
}
