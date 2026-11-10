"use client";

import Link from "next/link";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/features/navigation/app-routes";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function DashboardError({ retry }: DashboardErrorProps) {
  return (
    <section
      role="alert"
      aria-labelledby="dashboard-error-title"
      className="flex min-h-[60svh] w-full items-center justify-center px-5 py-12"
    >
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 text-destructive">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            strokeWidth={1.8}
            className="size-[18px]"
            aria-hidden="true"
          />
        </span>
        <h1 id="dashboard-error-title" className="text-lg font-semibold tracking-tight">
          This page didn’t load
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Something interrupted this workspace page. Try again in a moment, or open your inbox.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" className="min-h-11" onClick={retry}>
            Try again
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            render={<Link href={APP_ROUTES.inbox} />}
          >
            Open inbox
          </Button>
        </div>
      </div>
    </section>
  );
}
