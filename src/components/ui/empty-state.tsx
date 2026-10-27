import type { ReactNode } from "react";

import type { Hugeicon } from "@/components/icons";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: Hugeicon;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "min-h-[220px] p-5" : "min-h-[280px] p-6 sm:p-8",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex items-center justify-center text-muted-foreground",
            compact ? "mb-3 size-10" : "mb-4 size-11",
          )}
        >
          <Icon className={compact ? "size-4" : "size-[18px]"} aria-hidden="true" />
        </span>
      ) : null}
      <h3
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-sm" : "text-[15px]",
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "leading-relaxed text-muted-foreground",
          compact ? "mt-1 max-w-[240px] text-xs" : "mt-1.5 max-w-sm text-sm",
        )}
      >
        {description}
      </p>
      {children ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-2",
            compact ? "mt-4" : "mt-5",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
