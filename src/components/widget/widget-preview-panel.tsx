"use client";

import { useRef, useState } from "react";

import { BotMessageSquare, MessageCircle, Monitor, Smartphone, Tablet } from "@/components/icons";
import { cn } from "@/lib/utils";

import { WidgetLiveWidgetPreview, type WidgetLivePreviewConfig } from "./widget-live-preview";

type PreviewMode = "widget" | "full-chat";
type DeviceMode = "desktop" | "tablet" | "mobile";

type WidgetPreviewPanelProps = {
  liveConfig: WidgetLivePreviewConfig;
};

export function WidgetPreviewPanel({ liveConfig }: WidgetPreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("widget");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const previewHostRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setPreviewMode("widget")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors",
            previewMode === "widget"
              ? "border-[var(--widget-accent-border)] bg-[var(--widget-accent-muted)] text-[var(--widget-accent)]"
              : "border-transparent text-foreground hover:bg-muted",
          )}
        >
          <MessageCircle className="size-3.5" />
          Widget
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode("full-chat")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors",
            previewMode === "full-chat"
              ? "border-[var(--widget-accent-border)] bg-[var(--widget-accent-muted)] text-[var(--widget-accent)]"
              : "border-transparent text-foreground hover:bg-muted",
          )}
        >
          <BotMessageSquare className="size-3.5" />
          Full Chat
        </button>

        <div className="ml-1 flex items-center gap-0.5">
          {(
            [
              { id: "desktop" as const, icon: Monitor },
              { id: "tablet" as const, icon: Tablet },
              { id: "mobile" as const, icon: Smartphone },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDeviceMode(id)}
              aria-label={`${id} preview`}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-md border transition-colors",
                deviceMode === id
                  ? "border-[var(--widget-accent)] bg-[var(--widget-accent-muted)] text-[var(--widget-accent)]"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-visible p-4">
        <div
          className={cn(
            "flex h-full w-full items-center justify-center",
            deviceMode === "mobile" && "max-w-[300px]",
            deviceMode === "tablet" && "max-w-[380px]",
          )}
        >
          <div
            className={cn(
              "h-full w-full",
              deviceMode === "mobile" && "rounded-[32px] border-2 border-border p-2 shadow-lg",
              deviceMode === "tablet" && "rounded-[24px] border border-border p-2 shadow-md",
            )}
          >
            <div
              ref={previewHostRef}
              data-position={(liveConfig.position as string) ?? "bottom-right"}
              data-device={deviceMode}
              className={cn(
                "widget-preview-host relative h-full w-full overflow-hidden",
                deviceMode === "mobile" && "min-h-[560px] rounded-[24px]",
                deviceMode === "tablet" && "min-h-[520px] rounded-[18px]",
                deviceMode === "desktop" && "min-h-[480px]",
                previewMode === "full-chat"
                  ? "widget-preview-mode-full-chat"
                  : "widget-preview-mode-widget",
              )}
            >
              <WidgetLiveWidgetPreview
                config={liveConfig}
                mountRef={previewHostRef}
                previewMode={previewMode}
                deviceMode={deviceMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
