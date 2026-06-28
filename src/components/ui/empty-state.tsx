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
        "flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-card text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {children ? <div className="mt-5 flex items-center gap-2">{children}</div> : null}
    </div>
  );
}
