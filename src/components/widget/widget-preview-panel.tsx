"use client";

import { useRef, useState } from "react";

import { BotMessageSquare, MessageCircle } from "@/components/icons";
import { cn } from "@/lib/utils";

import { WidgetLiveWidgetPreview, type WidgetLivePreviewConfig } from "./widget-live-preview";

type PreviewMode = "widget" | "full-chat";

type WidgetPreviewPanelProps = {
  liveConfig: WidgetLivePreviewConfig;
};

export function WidgetPreviewPanel({ liveConfig }: WidgetPreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("widget");
  const previewHostRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
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
          Full Screen
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden p-4">
        <div
          ref={previewHostRef}
          data-position={(liveConfig.position as string) ?? "bottom-right"}
          className={cn(
            "widget-preview-host relative h-full min-h-0 w-full overflow-hidden",
            previewMode === "full-chat"
              ? "widget-preview-mode-full-chat"
              : "widget-preview-mode-widget",
          )}
        >
          <WidgetLiveWidgetPreview
            config={liveConfig}
            mountRef={previewHostRef}
            previewMode={previewMode}
          />
        </div>
      </div>
    </div>
  );
}
