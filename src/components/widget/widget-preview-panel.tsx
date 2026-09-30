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
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Preview layout</legend>
          <button
            type="button"
            onClick={() => setPreviewMode("widget")}
            aria-pressed={previewMode === "widget"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
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
            aria-pressed={previewMode === "full-chat"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
              previewMode === "full-chat"
                ? "border-[var(--widget-accent-border)] bg-[var(--widget-accent-muted)] text-[var(--widget-accent)]"
                : "border-transparent text-foreground hover:bg-muted",
            )}
          >
            <BotMessageSquare className="size-3.5" />
            Full Screen
          </button>
        </fieldset>
        <output
          aria-live="polite"
          className="ml-auto max-w-40 text-right text-[11px] leading-4 text-muted-foreground"
        >
          Sandbox · messages not saved · actions off
        </output>
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
