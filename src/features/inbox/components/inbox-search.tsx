"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Input } from "@/components/ui/input";

export function InboxSearch({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue);

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim();
      const current = params.get("q") ?? "";

      if (trimmed === current) {
        return;
      }

      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }

      const next = params.toString();
      router.replace(next ? `/dashboard/inbox?${next}` : "/dashboard/inbox");
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, router, searchParams]);

  return (
    <div className="relative max-w-md">
      <HugeiconsIcon
        icon={Search01Icon}
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="Search conversations…"
        aria-label="Search conversations"
        className="pl-9"
      />
    </div>
  );
}
