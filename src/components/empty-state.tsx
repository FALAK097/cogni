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
        "flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50",
        className,
      )}
    >
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        {Icon ? <Icon className="h-10 w-10 text-muted-foreground" /> : null}
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
