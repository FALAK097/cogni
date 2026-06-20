"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function InboxLiveRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, router]);

  return null;
}
