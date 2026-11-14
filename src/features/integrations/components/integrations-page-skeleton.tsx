import { Skeleton } from "@/components/ui/skeleton";
import { INTEGRATION_CATEGORIES } from "@/features/integrations/categories";
import { getIntegrationsByCategory } from "@/features/integrations/registry";

export function IntegrationsPageSkeleton() {
  return (
    <output aria-busy="true" aria-label="Loading connections" className="block space-y-10">
      {INTEGRATION_CATEGORIES.map((category) => {
        const integrations = getIntegrationsByCategory(category.id);
        if (integrations.length === 0) return null;

        return (
          <section key={category.id} aria-hidden="true" className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[17px] font-semibold tracking-tight">{category.label}</h2>
              {integrations.length > 6 ? <Skeleton className="h-4 w-20" /> : null}
            </div>
            <div className="flex flex-col">
              {integrations.slice(0, 6).map((integration) => (
                <div
                  key={integration.slug}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-5 sm:grid-cols-[240px_minmax(0,1fr)_100px]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <Skeleton className="size-8 shrink-0 rounded-md" />
                    <Skeleton className="h-4 w-28 max-w-full" />
                  </div>
                  <div className="relative order-3 col-span-2 text-sm leading-6 sm:order-none sm:col-span-1">
                    <span className="invisible">{integration.description}</span>
                    <Skeleton className="absolute inset-y-1 left-0 w-3/4" />
                  </div>
                  <Skeleton className="h-4 w-16 justify-self-end" />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </output>
  );
}
