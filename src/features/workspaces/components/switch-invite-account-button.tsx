"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SwitchInviteAccountButton({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function switchAccount() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
    } catch {
      setError("Could not sign out. Try again before accepting this invite.");
      setPending(false);
      return;
    }
    window.location.assign(`/sign-in?callbackURL=${encodeURIComponent(returnTo)}`);
  }

  return (
    <div className="mt-5 space-y-2">
      <Button type="button" onClick={() => void switchAccount()} disabled={pending}>
        {pending ? "Signing out…" : "Switch Google account"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
