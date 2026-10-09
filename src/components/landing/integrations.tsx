"use client";

import Image from "next/image";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SectionLayout } from "./section-layout";

import { getAllIntegrations } from "@/features/integrations/registry";

const INTEGRATIONS = getAllIntegrations();

export function Integrations() {
  return (
    <SectionLayout id="integrations">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        {/* ── Left: text content ── */}
        <div className="flex-shrink-0 lg:w-[36%]">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Integrations
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.025em] text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
            Explore integrations
            <br />
            for your stack.
          </h2>
          <p className="text-pretty mt-5 text-lg leading-relaxed text-gray-600">
            Connect supported tools for agent actions and team workflows. Inbound messaging requires
            additional provider configuration.
          </p>
        </div>

        {/* ── Right: icon grid with tooltips ── */}
        <div className="flex-1">
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
            {INTEGRATIONS.map((item) => (
              <Tooltip key={item.name}>
                <TooltipTrigger
                  render={
                    <div className="surface-depth group flex aspect-square cursor-default items-center justify-center rounded-2xl bg-white p-3 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1" />
                  }
                >
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={36}
                    height={36}
                    unoptimized
                    className="size-full max-h-8 max-w-8 object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </TooltipTrigger>
                <TooltipContent side="top">{item.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </SectionLayout>
  );
}
