import type { ReactNode } from "react";

import type { Hugeicon } from "@/components/icons";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: Hugeicon;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-center sm:p-8",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground shadow-sm">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
