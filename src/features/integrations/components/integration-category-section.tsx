"use client";

import { useState } from "react";
import { ChevronRight } from "@/components/icons";

import { IntegrationCard } from "@/features/integrations/components/integration-card";
import type { CategoryDefinition, IntegrationManifest } from "@/features/integrations/types";
import { cn } from "@/lib/utils";

type IntegrationCategorySectionProps = {
  category: CategoryDefinition;
  integrations: IntegrationManifest[];
  isConnected: (slug: string) => boolean;
  hasRecord: (slug: string) => boolean;
  canManage: boolean;
  onSelect: (slug: string) => void;
  initialVisible?: number;
};

export function IntegrationCategorySection({
  category,
  integrations,
  isConnected,
  hasRecord,
  canManage,
  onSelect,
  initialVisible = 4,
}: IntegrationCategorySectionProps) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = integrations.length > initialVisible;
  const visible = showAll ? integrations : integrations.slice(0, initialVisible);

  if (integrations.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
            {category.label}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5 line-clamp-1">
            {category.description}
          </p>
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className={cn(
              "shrink-0 inline-flex items-center gap-0.5 text-[13px] font-medium text-primary",
              "hover:underline underline-offset-4 transition-colors cursor-pointer",
            )}
          >
            {showAll ? "Show less" : `View all (${integrations.length})`}
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform", showAll && "rotate-90")}
            />
          </button>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((integration) => (
          <IntegrationCard
            key={integration.slug}
            integration={integration}
            isConnected={isConnected(integration.slug)}
            hasRecord={hasRecord(integration.slug)}
            canManage={canManage}
            onClick={() => onSelect(integration.slug)}
          />
        ))}
      </div>
    </section>
  );
}
