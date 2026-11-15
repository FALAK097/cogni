"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { APP_ROUTES } from "@/features/navigation/app-routes";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function DashboardError({ retry }: DashboardErrorProps) {
  return (
    <section className="flex min-h-[60svh] w-full items-center justify-center px-4 py-12">
      <EmptyState
        mode="page"
        isError
        title="This page didn’t load"
        titleAs="h1"
        description="Something interrupted this workspace page. Try again in a moment, or open your inbox."
      >
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
      </EmptyState>
    </section>
  );
}
