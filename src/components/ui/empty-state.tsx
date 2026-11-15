import type { AriaRole, ComponentType, ReactNode, SVGProps } from "react";

import { AlertCircle, type Hugeicon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type EmptyStateMode = "page" | "pane" | "inline" | "error";
export type EmptyStateTitleElement = "h1" | "h2" | "h3" | "p";

export type EmptyStateProps = {
  mode: EmptyStateMode;
  icon?: Hugeicon | ComponentType<SVGProps<SVGSVGElement> & { size?: number }> | null;
  title: ReactNode;
  titleAs?: EmptyStateTitleElement;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  isError?: boolean;
  role?: AriaRole;
};

export function EmptyState({
  mode,
  icon: IconProp,
  title,
  titleAs: Title = "h3",
  description,
  children,
  className,
  isError = false,
  role,
}: EmptyStateProps) {
  const isErrorState = isError || mode === "error";
  const resolvedMode: "page" | "pane" | "inline" =
    mode === "page" ? "page" : mode === "inline" ? "inline" : "pane";

  const Icon = IconProp !== undefined ? IconProp : isErrorState ? AlertCircle : null;
  const containerRole = role ?? (isErrorState ? "alert" : undefined);

  return (
    <div
      role={containerRole}
      className={cn(
        "flex min-w-0 max-w-full flex-col items-center justify-center text-center",
        resolvedMode === "page" && "min-h-[50svh] px-4 py-16 sm:py-24",
        resolvedMode === "pane" && "min-h-[240px] px-4 py-10 sm:py-14",
        resolvedMode === "inline" && "min-h-[140px] px-3 py-6",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex items-center justify-center",
            isErrorState ? "text-destructive" : "text-muted-foreground",
            resolvedMode === "page" && "mb-4",
            resolvedMode === "pane" && "mb-3",
            resolvedMode === "inline" && "mb-2",
          )}
        >
          <Icon
            className={cn(
              resolvedMode === "page" && "size-7 sm:size-8",
              resolvedMode === "pane" && "size-5 sm:size-6",
              resolvedMode === "inline" && "size-4",
            )}
            aria-hidden="true"
          />
        </span>
      ) : null}
      <Title
        className={cn(
          "max-w-full [overflow-wrap:anywhere] font-semibold tracking-tight text-foreground",
          resolvedMode === "page" && "text-xl sm:text-2xl",
          resolvedMode === "pane" && "text-base",
          resolvedMode === "inline" && "text-sm font-medium",
        )}
      >
        {title}
      </Title>
      {description ? (
        <p
          className={cn(
            "leading-relaxed text-muted-foreground",
            resolvedMode === "page" && "mt-2 max-w-md text-sm",
            resolvedMode === "pane" && "mt-1.5 max-w-sm text-sm",
            resolvedMode === "inline" && "mt-1 max-w-xs text-xs",
          )}
        >
          {description}
        </p>
      ) : null}
      {children ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-2",
            resolvedMode === "page" && "mt-6 gap-3",
            resolvedMode === "pane" && "mt-5",
            resolvedMode === "inline" && "mt-3",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
