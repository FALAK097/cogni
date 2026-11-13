import type { AriaRole, ComponentType, ReactNode, SVGProps } from "react";

import { AlertCircle, type Hugeicon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type EmptyStateMode = "page" | "pane" | "inline" | "error";
export type EmptyStateTitleElement = "h1" | "h2" | "h3" | "p";

export type EmptyStateProps = {
  mode?: EmptyStateMode;
  icon?: Hugeicon | ComponentType<SVGProps<SVGSVGElement> & { size?: number }> | null;
  title: ReactNode;
  titleAs?: EmptyStateTitleElement;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
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
  compact = false,
  isError = false,
  role,
}: EmptyStateProps) {
  const isErrorState = isError || mode === "error";
  const isLegacyMode = mode === undefined;
  const resolvedMode: "page" | "pane" | "inline" =
    mode === "page" ? "page" : mode === "inline" || (compact && !mode) ? "inline" : "pane";

  const Icon = IconProp !== undefined ? IconProp : isErrorState ? AlertCircle : null;
  const containerRole = role ?? (isErrorState ? "alert" : undefined);

  return (
    <div
      role={containerRole}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isLegacyMode && compact && "min-h-[220px] p-5",
        isLegacyMode && !compact && "min-h-[280px] p-6 sm:p-8",
        !isLegacyMode && resolvedMode === "page" && "min-h-[50svh] px-4 py-16 sm:py-24",
        !isLegacyMode && resolvedMode === "pane" && "min-h-[240px] px-4 py-10 sm:py-14",
        !isLegacyMode && resolvedMode === "inline" && "min-h-[140px] px-3 py-6",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex items-center justify-center",
            isErrorState ? "text-destructive" : "text-muted-foreground",
            isLegacyMode && compact && "mb-3 size-10",
            isLegacyMode && !compact && "mb-4 size-11",
            !isLegacyMode && resolvedMode === "page" && "mb-4",
            !isLegacyMode && resolvedMode === "pane" && "mb-3",
            !isLegacyMode && resolvedMode === "inline" && "mb-2",
          )}
        >
          <Icon
            className={cn(
              isLegacyMode && (compact ? "size-4" : "size-[18px]"),
              !isLegacyMode && resolvedMode === "page" && "size-7 sm:size-8",
              !isLegacyMode && resolvedMode === "pane" && "size-5 sm:size-6",
              !isLegacyMode && resolvedMode === "inline" && "size-4",
            )}
            aria-hidden="true"
          />
        </span>
      ) : null}
      <Title
        className={cn(
          "font-semibold tracking-tight text-foreground",
          isLegacyMode && (compact ? "text-sm" : "text-[15px]"),
          !isLegacyMode && resolvedMode === "page" && "text-xl sm:text-2xl",
          !isLegacyMode && resolvedMode === "pane" && "text-base",
          !isLegacyMode && resolvedMode === "inline" && "text-sm font-medium",
        )}
      >
        {title}
      </Title>
      {description ? (
        <p
          className={cn(
            "leading-relaxed text-muted-foreground",
            isLegacyMode && compact && "mt-1 max-w-[240px] text-xs",
            isLegacyMode && !compact && "mt-1.5 max-w-sm text-sm",
            !isLegacyMode && resolvedMode === "page" && "mt-2 max-w-md text-sm",
            !isLegacyMode && resolvedMode === "pane" && "mt-1.5 max-w-sm text-sm",
            !isLegacyMode && resolvedMode === "inline" && "mt-1 max-w-xs text-xs",
          )}
        >
          {description}
        </p>
      ) : null}
      {children ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-2",
            isLegacyMode && (compact ? "mt-4" : "mt-5"),
            !isLegacyMode && resolvedMode === "page" && "mt-6 gap-3",
            !isLegacyMode && resolvedMode === "pane" && "mt-5",
            !isLegacyMode && resolvedMode === "inline" && "mt-3",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
