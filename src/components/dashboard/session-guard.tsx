"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SessionGuard() {
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const { data } = await authClient.getSession();
      if (!active) return;

      if (!data?.session) {
        setExpired(true);
      }
    }

    void checkSession();
    const interval = window.setInterval(checkSession, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!expired) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-3xl border bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Session expired</h2>
        <p className="text-sm text-muted-foreground">
          Your sign-in session ended. Sign in again to continue working in the dashboard.
        </p>
        <Button
          className="w-full"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
        >
          Return to sign in
        </Button>
      </div>
    </div>
  );
}
