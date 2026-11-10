"use client";

import { useEffect, useRef, useState } from "react";

import { BotMessageSquare, MessageCircle, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { WidgetLiveWidgetPreview, type WidgetLivePreviewConfig } from "./widget-live-preview";
import type { WidgetPreviewEvidence } from "./widget-test-panel";

type PreviewMode = "widget" | "full-chat";
const PREVIEW_EVIDENCE_EVENT = "cogni:widget-preview-evidence";

export function isPreviewEvidence(value: unknown): value is WidgetPreviewEvidence {
  if (typeof value !== "object" || value === null) return false;
  const evidence = value as Record<string, unknown>;
  if (
    (evidence.outcome !== "answer" &&
      evidence.outcome !== "handoff" &&
      evidence.outcome !== "error") ||
    typeof evidence.grounded !== "boolean" ||
    !Array.isArray(evidence.sources)
  ) {
    return false;
  }

  if (
    evidence.prompt !== undefined &&
    (typeof evidence.prompt !== "string" || evidence.prompt.length > 1_000)
  ) {
    return false;
  }

  const sources = evidence.sources;
  if (
    !sources.every(
      (source: unknown) =>
        typeof source === "object" &&
        source !== null &&
        "title" in source &&
        typeof source.title === "string" &&
        (!("documentId" in source) ||
          (typeof source.documentId === "string" &&
            source.documentId.length > 0 &&
            source.documentId.length <= 128)),
    )
  ) {
    return false;
  }

  return evidence.outcome !== "error" || (!evidence.grounded && sources.length === 0);
}

type WidgetPreviewPanelProps = {
  liveConfig: WidgetLivePreviewConfig;
  testMode?: boolean;
  onEvidenceChange?: (evidence: WidgetPreviewEvidence | null) => void;
};

export function WidgetPreviewPanel({
  liveConfig,
  testMode = false,
  onEvidenceChange,
}: WidgetPreviewPanelProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("widget");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!testMode) return;
    const handleEvidence = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (isPreviewEvidence(detail)) onEvidenceChange?.(detail);
    };
    window.addEventListener(PREVIEW_EVIDENCE_EVENT, handleEvidence);
    return () => window.removeEventListener(PREVIEW_EVIDENCE_EVENT, handleEvidence);
  }, [onEvidenceChange, testMode]);

  const resetTest = async () => {
    setResetting(true);
    setResetError(null);
    onEvidenceChange?.(null);
    try {
      const reset = await window.Widget?.resetPreview?.();
      if (!reset) setResetError("The preview is still starting. Try again in a moment.");
      setResetting(false);
    } catch {
      setResetError("Couldn't start a new test. Retry the preview and try again.");
      setResetting(false);
    }
  };

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
        {testMode ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1.5"
            onClick={() => void resetTest()}
            disabled={resetting}
          >
            <RefreshCw
              className={cn("size-3.5", resetting && "motion-safe:animate-spin")}
              aria-hidden="true"
            />
            {resetting ? "Resetting…" : "Reset test"}
          </Button>
        ) : null}
      </div>

      {testMode && resetError ? (
        <p role="alert" className="border-b border-border/60 px-4 py-2 text-xs text-destructive">
          {resetError}
        </p>
      ) : null}

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
