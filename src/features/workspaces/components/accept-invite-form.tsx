"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { acceptInviteAction, type MemberActionState } from "@/features/workspaces/actions-members";

const initialState: MemberActionState = {};

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Joining workspace…" : "Accept invite"}
      </Button>
    </form>
  );
}
