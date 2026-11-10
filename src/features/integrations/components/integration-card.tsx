"use client";

import { IntegrationIcon } from "@/features/integrations/components/integration-icon";
import type { IntegrationManifest } from "@/features/integrations/types";
import { cn } from "@/lib/utils";

type IntegrationCardProps = {
  integration: IntegrationManifest;
  isConnected: boolean;
  hasRecord: boolean;
  canManage: boolean;
  onClick: () => void;
};

/** A connection is a row, not a card with a second button nested inside it. */
export function IntegrationCard({
  integration,
  isConnected,
  hasRecord,
  canManage,
  onClick,
}: IntegrationCardProps) {
  const canOpen = hasRecord || canManage;
  const unavailable = Boolean(integration.isComingSoon) || !canOpen;
  const action = integration.isComingSoon
    ? "Coming soon"
    : !canOpen
      ? "Owner required"
      : !canManage
        ? "View status"
        : isConnected
          ? "Manage"
          : hasRecord
            ? "Reconnect"
            : "Connect";

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onClick}
      aria-label={`${action} ${integration.name}`}
      className={cn(
        "grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-5 text-left transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[240px_minmax(0,1fr)_100px]",
        unavailable ? "opacity-60" : "cursor-pointer hover:bg-muted/40",
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <IntegrationIcon src={integration.icon} alt="" iconDark={integration.iconDark} size="sm" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{integration.name}</h3>
          {isConnected ? <p className="mt-1 text-xs text-success">Connected</p> : null}
        </div>
      </div>
      <p className="order-3 col-span-2 text-sm leading-6 text-muted-foreground sm:order-none sm:col-span-1">
        {integration.description}
      </p>
      <span className="text-right text-sm font-medium">{action}</span>
    </button>
  );
}
