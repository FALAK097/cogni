"use client";

import { CheckCircle2 } from "@/components/icons";
import { IntegrationIcon } from "@/features/integrations/components/integration-icon";
import { buttonVariants } from "@/components/ui/button-variants";
import type { IntegrationManifest } from "@/features/integrations/types";
import { cn } from "@/lib/utils";

type IntegrationCardProps = {
  integration: IntegrationManifest;
  isConnected: boolean;
  onClick: () => void;
};

export function IntegrationCard({ integration, isConnected, onClick }: IntegrationCardProps) {
  const isComingSoon = integration.isComingSoon;

  const handleClick = () => {
    if (!isComingSoon) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      disabled={isComingSoon}
      className={cn(
        "group relative flex h-full w-full flex-col rounded-xl border border-border/70 bg-card p-4 sm:p-5 text-left transition-[transform,background-color,border-color,box-shadow] duration-200",
        isComingSoon
          ? "opacity-75"
          : "cursor-pointer hover:border-primary/40 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
      )}
      onClick={handleClick}
      aria-label={
        isComingSoon
          ? `${integration.name} coming soon`
          : `${isConnected ? "Manage" : "Connect"} ${integration.name}`
      }
    >
      {/* Status Indicator */}
      {isConnected && (
        <div className="absolute top-3.5 right-3.5 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 p-0.5 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>
      )}
      {/* Header: logo + name/subtitle */}
      <div className="flex items-start gap-3">
        <IntegrationIcon
          src={integration.icon}
          alt={integration.name}
          iconDark={integration.iconDark}
          background={integration.iconBg}
          size="md"
        />
        <div className="flex-1 min-w-0 pt-0.5">
          <h3
            className="text-[14.5px] sm:text-[15px] font-semibold text-foreground leading-snug tracking-tight truncate"
            title={integration.name}
          >
            {integration.name}
          </h3>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium truncate">
            {integration.subtitle}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3.5 text-[12.5px] sm:text-[13px] leading-[1.55] text-muted-foreground line-clamp-3 flex-1 min-h-[60px]">
        {integration.description}
      </p>

      {/* Footer */}
      <div className="mt-4">
        {isComingSoon ? (
          <span
            className={cn(
              "inline-flex w-full justify-center items-center rounded-md bg-amber-50 px-3 py-1.5 text-[13px] font-medium text-amber-700",
              "dark:bg-amber-500/10 dark:text-amber-400",
            )}
          >
            Coming Soon
          </span>
        ) : isConnected ? (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full text-foreground/80 border-border/70 group-hover:bg-muted group-hover:text-foreground group-hover:border-border font-medium",
            )}
          >
            Manage
          </span>
        ) : (
          <span
            className={cn(
              buttonVariants({ size: "sm" }),
              "w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm",
            )}
          >
            Connect
          </span>
        )}
      </div>
    </button>
  );
}
