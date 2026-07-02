"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bot,
  CheckCircle2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  X,
} from "@/components/icons";
import { ContentLayout } from "@/components/app-nav/content-layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  WidgetLiveWidgetPreview,
  type WidgetLivePreviewConfig,
} from "@/components/widget/widget-live-preview";
import { useKnowledgeBaseSources, useWidgetConfig } from "@/hooks/query";
import { cn } from "@/lib/utils";

type PlaygroundPageProps = {
  workspaceId: string;
};

type ModelOption = {
  id: string;
  name: string;
  provider: string;
  description: string;
  textCost: number;
  locked?: boolean;
};

type PlaygroundInstance = {
  id: string;
  modelId: string;
  sync: boolean;
  temperature: number;
  messages: string[];
};

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    description: "Balanced reasoning and speed for general customer support and assistant tasks.",
    textCost: 3,
  },
  {
    id: "gpt-5-1",
    name: "GPT-5.1",
    provider: "OpenAI",
    description: "A slightly stronger reasoning profile for deeper multi-step conversations.",
    textCost: 3,
  },
  {
    id: "gpt-5-2",
    name: "GPT-5.2",
    provider: "OpenAI",
    description: "Sharper context handling for agent workflows with longer instructions.",
    textCost: 3,
  },
  {
    id: "gpt-5-4",
    name: "GPT-5.4",
    provider: "OpenAI",
    description: "Reliable premium model for polished answers, retrieval, and business use cases.",
    textCost: 4,
  },
  {
    id: "gpt-5-5",
    name: "GPT-5.5",
    provider: "OpenAI",
    description:
      "OpenAI's newest and most capable model, advancing beyond GPT-5.4 with significantly improved reasoning, enhanced context retention, and superior performance across the most demanding AI tasks.",
    textCost: 4,
    locked: true,
  },
  {
    id: "gpt-5-4-mini",
    name: "GPT-5.4 Mini",
    provider: "OpenAI",
    description: "Fast and affordable for day-to-day support flows and playground iteration.",
    textCost: 1,
  },
  {
    id: "gpt-5-4-nano",
    name: "GPT-5.4 Nano",
    provider: "OpenAI",
    description: "Lightweight preview model for rapid UI testing and fallback behavior.",
    textCost: 1,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    description: "Compact assistant model optimized for fast replies and low-cost experiments.",
    textCost: 1,
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "OpenAI",
    description: "Smallest footprint option for low-latency testing and lightweight workflows.",
    textCost: 1,
  },
];

const DEFAULT_SUGGESTIONS = [
  "Ready for AI call automation?",
  "What WhatsApp automation do you offer?",
  "Book a quick demo",
];

const DEFAULT_MESSAGES = ["Hi! What can I help you with?"];

type TrainingSummary = {
  statusLabel: string;
  statusTone: "success" | "warning" | "pending";
  detail: string;
};

function resolvePlaygroundModelId(modelName?: string): string {
  if (!modelName) return "gpt-5-4-mini";

  const normalized = modelName.toLowerCase();
  const match = MODEL_OPTIONS.find(
    (model) => model.id === normalized || model.name.toLowerCase() === normalized,
  );

  return match?.id ?? MODEL_OPTIONS[0].id;
}

function buildTrainingSummary(
  sources: Array<{
    status: string;
    updatedAt: string;
    chunkCount: number;
    lastError?: string | null;
  }>,
): TrainingSummary {
  if (sources.length === 0) {
    return {
      statusLabel: "Not trained",
      statusTone: "warning",
      detail: "Add sources in Knowledge Base to train your agent",
    };
  }

  const isProcessing = sources.some(
    (source) => source.status === "processing" || source.status === "PROCESSING",
  );
  const failedCount = sources.filter(
    (source) => source.status === "failed" || Boolean(source.lastError),
  ).length;
  const latestUpdatedAt = sources.reduce((latest, source) => {
    const sourceTime = new Date(source.updatedAt).getTime();
    return sourceTime > latest ? sourceTime : latest;
  }, 0);
  const totalChunks = sources.reduce((sum, source) => sum + source.chunkCount, 0);

  if (isProcessing) {
    return {
      statusLabel: "Training",
      statusTone: "pending",
      detail: `Updating ${sources.length} source${sources.length === 1 ? "" : "s"} • ${totalChunks} chunks`,
    };
  }

  if (failedCount > 0) {
    return {
      statusLabel: "Needs attention",
      statusTone: "warning",
      detail: `${failedCount} source${failedCount === 1 ? "" : "s"} failed • ${totalChunks} chunks indexed`,
    };
  }

  return {
    statusLabel: "Trained",
    statusTone: "success",
    detail: `Last trained ${formatDistanceToNow(new Date(latestUpdatedAt), { addSuffix: true })} • ${totalChunks} chunks`,
  };
}

function getModelById(id: string) {
  return MODEL_OPTIONS.find((model) => model.id === id) ?? MODEL_OPTIONS[0];
}

function CompareChatPreview({
  title,
  messages,
  suggestions,
  instance,
  position,
  count,
  onMove,
  onDelete,
  onOpenSettings,
  settingsOpen = false,
  settingsRef,
  settingsPanel,
}: {
  title: string;
  messages: string[];
  suggestions: string[];
  instance: PlaygroundInstance;
  position: number;
  count: number;
  onMove: (direction: "left" | "right") => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  settingsOpen?: boolean;
  settingsRef?: React.RefObject<HTMLDivElement | null>;
  settingsPanel?: React.ReactNode;
}) {
  return (
    <div className="relative flex h-[min(440px,calc(100dvh-12rem))] min-h-[320px] flex-col overflow-hidden rounded-xl bg-card sm:h-[min(440px,calc(100vh-11.5rem))]">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground sm:gap-2">
          <span className="hidden sm:inline">Sync</span>
          <Switch checked={instance.sync} />
          <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 rounded-xl text-muted-foreground"
            data-compare-settings-trigger
            onClick={onOpenSettings}
          >
            <Sliders className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 rounded-xl text-muted-foreground"
          >
            <CheckCircle2 className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="ghost" size="icon-sm" className="size-8 rounded-xl">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {position > 0 ? (
                <DropdownMenuItem onClick={() => onMove("left")}>
                  <ArrowLeft className="size-4" />
                  Move left
                </DropdownMenuItem>
              ) : null}
              {position < count - 1 ? (
                <DropdownMenuItem onClick={() => onMove("right")}>
                  <ArrowRight className="size-4" />
                  Move right
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem>
                <RefreshCw className="size-4" />
                Clear chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                Delete agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-muted/20 px-4 py-5 dark:bg-background/40">
        <div className="max-w-[220px] rounded-2xl bg-muted/60 px-4 py-2.5 text-sm text-foreground shadow-xs">
          {messages[0] ?? DEFAULT_MESSAGES[0]}
        </div>

        <div className="mt-auto flex flex-col items-end gap-2 pb-3">
          {suggestions.map((message) => (
            <div
              key={message}
              className="max-w-[220px] rounded-full border border-border/80 bg-card px-4 py-2 text-right text-sm text-foreground shadow-xs"
            >
              {message}
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-border/70 bg-card p-3">
        <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground shadow-xs">
          <span className="flex-1">Message...</span>
          <span className="size-4 rounded-full border border-muted-foreground/30" />
        </div>
      </div>

      {settingsOpen && settingsPanel ? (
        <div className="absolute inset-x-3 top-14 bottom-[3.25rem] z-20 hidden justify-end lg:flex">
          <div
            ref={settingsRef}
            className="flex h-full w-[min(300px,72%)] flex-col overflow-hidden rounded-xl border border-border/70 bg-popover p-4 shadow-2xl"
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">{settingsPanel}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LivePlaygroundPreview({
  config,
  autoOpen = true,
}: {
  config: WidgetLivePreviewConfig;
  autoOpen?: boolean;
}) {
  const previewHostRef = useRef<HTMLDivElement>(null);
  const didOpenRef = useRef(false);

  useEffect(() => {
    if (!autoOpen) return;
    if (didOpenRef.current) return;
    didOpenRef.current = true;

    let cancelled = false;
    let attempts = 0;

    const tryOpen = () => {
      if (cancelled) return;
      attempts += 1;

      const widgetWindow = document.querySelector("#widget-container .oc-window");
      if (window.Widget?.open && widgetWindow instanceof HTMLElement) {
        try {
          window.Widget.open();
          return;
        } catch {
          // Wait for the embedded widget internals to finish mounting.
        }
      }

      if (attempts < 60) {
        window.setTimeout(tryOpen, 50);
      }
    };

    tryOpen();
    return () => {
      cancelled = true;
    };
  }, [autoOpen]);

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[920px] items-center justify-center overflow-hidden px-2 sm:px-0">
      <div className="playground-live-preview flex h-[min(570px,calc(100dvh-10rem))] w-full max-w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[28px]">
        <div
          ref={previewHostRef}
          data-position={(config.position as string) ?? "bottom-right"}
          className="widget-preview-host widget-preview-mode-widget relative h-full min-h-0 w-full overflow-hidden rounded-[28px]"
        >
          <WidgetLiveWidgetPreview config={config} mountRef={previewHostRef} previewMode="widget" />
        </div>
      </div>
    </div>
  );
}

const MODEL_PICKER_POPUP_WIDTH = 560;
const MODEL_PICKER_POPUP_HEIGHT = 320;
const MODEL_PICKER_DETAILS_WIDTH = 208;
const MODEL_PICKER_VIEWPORT_MARGIN = 12;

function ModelPicker({
  selectedModelId,
  onSelect,
  overlay = false,
  mobile = false,
}: {
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  overlay?: boolean;
  mobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoveredModelId, setHoveredModelId] = useState(selectedModelId);
  const [mounted, setMounted] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedModel = getModelById(selectedModelId);
  const visibleModels = MODEL_OPTIONS.filter((model) =>
    `${model.provider} ${model.name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const hoveredModel = getModelById(hoveredModelId);

  const computePopupPosition = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return null;

    const popupWidth = mobile
      ? Math.min(window.innerWidth - MODEL_PICKER_VIEWPORT_MARGIN * 2, 360)
      : MODEL_PICKER_POPUP_WIDTH;
    const popupHeight = mobile
      ? Math.min(window.innerHeight * 0.55, 360)
      : MODEL_PICKER_POPUP_HEIGHT;
    const margin = MODEL_PICKER_VIEWPORT_MARGIN;
    const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
    const spaceAbove = triggerRect.top - margin;
    const openUpward = spaceBelow < popupHeight && spaceAbove > spaceBelow;

    const top = openUpward
      ? Math.max(margin, triggerRect.top - popupHeight - margin)
      : Math.min(triggerRect.bottom + margin, window.innerHeight - popupHeight - margin);

    const preferredLeft = mobile
      ? (window.innerWidth - popupWidth) / 2
      : overlay
        ? triggerRect.right - popupWidth
        : triggerRect.left;
    const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - popupWidth - margin));

    return { top, left, width: popupWidth, height: popupHeight };
  }, [mobile, overlay]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPopupPosition(null);
      return;
    }

    setPopupPosition(computePopupPosition());
  }, [open, computePopupPosition]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      setPopupPosition(computePopupPosition());
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, computePopupPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      className="fixed z-[300] flex overflow-hidden rounded-xl border border-border/70 bg-popover shadow-2xl"
      style={{
        top: popupPosition?.top ?? -9999,
        left: popupPosition?.left ?? -9999,
        width: popupPosition?.width ?? (mobile ? 360 : MODEL_PICKER_POPUP_WIDTH),
        height: popupPosition?.height ?? (mobile ? 360 : MODEL_PICKER_POPUP_HEIGHT),
      }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border/60 p-2.5">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted px-2.5 py-1.5 shadow-xs">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <ScrollArea className="h-full min-h-0 flex-1">
          <div className="space-y-0.5 p-1.5">
            {visibleModels.map((model) => {
              const selected = model.id === selectedModelId;
              const hovered = model.id === hoveredModelId;

              return (
                <button
                  key={model.id}
                  type="button"
                  onMouseEnter={() => setHoveredModelId(model.id)}
                  onFocus={() => setHoveredModelId(model.id)}
                  onClick={() => {
                    onSelect(model.id);
                    setHoveredModelId(model.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                    selected || hovered ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                  )}
                >
                  <Bot className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{model.name}</span>
                  {selected ? <CheckCircle2 className="size-3.5 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
          </div>
          <ScrollBar />
        </ScrollArea>
      </div>

      {!mobile ? (
        <div
          className="hidden shrink-0 flex-col border-l border-border/60 p-3 lg:flex"
          style={{ width: MODEL_PICKER_DETAILS_WIDTH }}
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bot className="size-3.5" />
            <span>{hoveredModel.provider}</span>
          </div>
          <h4 className="mt-1.5 text-base font-semibold text-foreground">{hoveredModel.name}</h4>
          <Separator className="my-2.5" />
          <p className="min-h-0 flex-1 overflow-y-auto text-xs leading-5 text-muted-foreground">
            {hoveredModel.description}
          </p>
          <Separator className="my-2.5" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Text cost</span>
            <span className="font-semibold text-foreground">{hoveredModel.textCost}</span>
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setHoveredModelId(selectedModelId);
          setOpen((current) => !current);
        }}
        className={cn(
          "flex w-full items-center border border-border bg-background text-left shadow-xs transition-colors hover:border-border/80",
          mobile || overlay ? "gap-2 rounded-xl px-3 py-2" : "gap-3 rounded-2xl px-4 py-3",
        )}
      >
        <Bot
          className={cn("shrink-0 text-foreground", mobile || overlay ? "size-3.5" : "size-4")}
        />
        <span
          className={cn(
            "flex-1 truncate font-semibold text-foreground",
            mobile || overlay ? "text-xs" : "text-sm",
          )}
        >
          {selectedModel.name}
        </span>
        <ArrowUpDown
          className={cn(
            "shrink-0 text-muted-foreground",
            mobile || overlay ? "size-3.5" : "size-4",
          )}
        />
      </button>

      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

function PlaygroundSettings({
  agentName,
  instance,
  instructions,
  trainingSummary,
  onUpdate,
  onCompare,
  onResetInstructions,
  compact = false,
  overlay = false,
  mobile = false,
}: {
  agentName: string;
  instance: PlaygroundInstance;
  instructions: string;
  trainingSummary: TrainingSummary;
  onUpdate: (patch: Partial<PlaygroundInstance>) => void;
  onCompare?: () => void;
  onResetInstructions?: () => void;
  compact?: boolean;
  overlay?: boolean;
  mobile?: boolean;
}) {
  const trainingToneClassName =
    trainingSummary.statusTone === "success"
      ? "text-emerald-700 dark:text-emerald-400"
      : trainingSummary.statusTone === "pending"
        ? "text-amber-700 dark:text-amber-400"
        : "text-amber-700 dark:text-amber-400";

  const trainingDotClassName =
    trainingSummary.statusTone === "success"
      ? "bg-emerald-500"
      : trainingSummary.statusTone === "pending"
        ? "bg-amber-500"
        : "bg-amber-500";

  return (
    <div className={cn(!overlay && !mobile && "flex h-full min-h-0 flex-col")}>
      {mobile ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div
              className={cn("flex items-center gap-2 text-sm font-medium", trainingToneClassName)}
            >
              <span className={cn("size-2 rounded-full", trainingDotClassName)} />
              {trainingSummary.statusLabel}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{trainingSummary.detail}</p>
          </div>

          {onCompare ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Compare AI models</p>
                <p className="text-xs text-muted-foreground">Run side-by-side.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onCompare();
                }}
              >
                Compare
              </Button>
            </div>
          ) : null}
        </div>
      ) : !compact ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Playground</h1>
            <div className="mt-6 rounded-3xl border border-border/70 bg-muted/30 p-4">
              <div
                className={cn("flex items-center gap-2 text-sm font-medium", trainingToneClassName)}
              >
                <span className={cn("size-2 rounded-full", trainingDotClassName)} />
                {trainingSummary.statusLabel}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{trainingSummary.detail}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Compare AI models</p>
                <p className="text-xs text-muted-foreground">Run your agent side-by-side.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={onCompare}>
                Compare
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          mobile || overlay
            ? "mt-4 space-y-4"
            : cn("min-h-0 flex-1 overflow-y-auto pr-2", compact ? "" : "mt-4"),
        )}
      >
        <div className={mobile || overlay ? "contents" : "space-y-6 pb-6"}>
          <section className="space-y-3">
            <FieldLabel>Model</FieldLabel>
            <ModelPicker
              selectedModelId={instance.modelId}
              onSelect={(modelId) => onUpdate({ modelId })}
              overlay={overlay}
              mobile={mobile}
            />
            <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-fuchsia-50 via-rose-50 to-orange-50 p-3 dark:from-fuchsia-950/40 dark:via-rose-950/30 dark:to-orange-950/20">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  Upgrade for{" "}
                  <span className="text-fuchsia-600 dark:text-fuchsia-400">attachments</span> &amp;
                  advanced models
                </p>
                <Button type="button" size="sm" className="rounded-xl">
                  Upgrade
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Temperature</FieldLabel>
              <span className="text-sm font-medium text-foreground">{instance.temperature}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={instance.temperature}
              onChange={(event) => onUpdate({ temperature: Number(event.target.value) })}
              className="h-2 w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Reserved</span>
              <span>Creative</span>
            </div>
          </section>

          <section className="space-y-3">
            <FieldLabel>Voice Mode</FieldLabel>
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3">
              <div className="text-sm text-muted-foreground">Enable voice for this instance</div>
              <Switch
                checked={instance.sync}
                onCheckedChange={(checked) => onUpdate({ sync: checked })}
              />
            </div>
          </section>

          <section className="space-y-3">
            <FieldLabel>AI Actions</FieldLabel>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-center rounded-2xl border border-border/70 bg-card text-sm font-medium text-muted-foreground shadow-xs",
                overlay ? "h-11" : "h-14",
              )}
            >
              Add your first action
            </button>
          </section>

          <section className="space-y-3">
            <FieldLabel>Instructions (System prompt)</FieldLabel>
            <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-xl border border-border/70 bg-muted px-3 py-2 text-sm font-medium text-foreground shadow-xs">
                  Base Instructions
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-border/70 bg-muted p-2 text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  aria-label="Reset instructions"
                  onClick={onResetInstructions}
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
              <Textarea
                value={instructions}
                readOnly
                placeholder={`No instructions configured for ${agentName} yet.`}
                className={cn(
                  "rounded-2xl border-border/70 bg-muted/40 text-sm leading-6 text-foreground",
                  overlay ? "min-h-24" : "min-h-56",
                )}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-foreground">{children}</p>;
}

function InstanceCard({
  instance,
  position,
  count,
  onMove,
  onDelete,
  onOpenSettings,
  suggestions,
  settingsOpen = false,
  settingsRef,
  settingsPanel,
}: {
  instance: PlaygroundInstance;
  position: number;
  count: number;
  onMove: (direction: "left" | "right") => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  suggestions: string[];
  settingsOpen?: boolean;
  settingsRef?: React.RefObject<HTMLDivElement | null>;
  settingsPanel?: React.ReactNode;
}) {
  const model = getModelById(instance.modelId);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <CompareChatPreview
        title={model.name}
        messages={instance.messages}
        suggestions={suggestions}
        instance={instance}
        position={position}
        count={count}
        onMove={onMove}
        onDelete={onDelete}
        onOpenSettings={onOpenSettings}
        settingsOpen={settingsOpen}
        settingsRef={settingsRef}
        settingsPanel={settingsPanel}
      />
    </div>
  );
}

export function PlaygroundPage({ workspaceId }: PlaygroundPageProps) {
  const { data: widgetConfig } = useWidgetConfig(workspaceId);
  const { data: knowledgeBaseData } = useKnowledgeBaseSources("default");
  const [compareMode, setCompareMode] = useState(false);
  const [desktopSettingsOpen, setDesktopSettingsOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState("primary");
  const desktopSettingsRef = useRef<HTMLDivElement>(null);
  const [instructions, setInstructions] = useState("");
  const [instances, setInstances] = useState<PlaygroundInstance[]>([
    {
      id: "primary",
      modelId: "gpt-5-4-mini",
      sync: true,
      temperature: 0,
      messages: DEFAULT_MESSAGES,
    },
  ]);

  const trainingSummary = useMemo(
    () => buildTrainingSummary(knowledgeBaseData?.sources ?? []),
    [knowledgeBaseData?.sources],
  );

  useEffect(() => {
    if (!widgetConfig) return;

    setInstructions(widgetConfig.instructions?.trim() ?? "");
    const modelId = resolvePlaygroundModelId(widgetConfig.modelName);
    setInstances((current) =>
      current.map((instance) => (instance.id === "primary" ? { ...instance, modelId } : instance)),
    );
  }, [widgetConfig]);

  const selectedInstance =
    instances.find((instance) => instance.id === selectedInstanceId) ?? instances[0];

  const suggestions = widgetConfig?.suggestions?.filter((item) => item.trim()).length
    ? widgetConfig.suggestions.filter((item) => item.trim())
    : DEFAULT_SUGGESTIONS;
  const agentName = widgetConfig?.agentName || widgetConfig?.displayName || "Support Agent";
  const livePreviewConfig = useMemo<WidgetLivePreviewConfig | null>(() => {
    if (!widgetConfig) return null;

    return {
      workspaceId,
      publicKey: widgetConfig.publicKey,
      position: widgetConfig.position,
      agentName: widgetConfig.agentName,
      displayName: widgetConfig.displayName,
      logoUrl: widgetConfig.logoUrl,
      primaryColor: widgetConfig.primaryColor,
      backgroundColor: widgetConfig.backgroundColor,
      textColor: widgetConfig.textColor,
      userBubbleColor: widgetConfig.userBubbleColor,
      userBubbleTextColor: widgetConfig.userBubbleTextColor,
      botBubbleColor: widgetConfig.botBubbleColor,
      botBubbleTextColor: widgetConfig.botBubbleTextColor,
      headerGradientFrom: widgetConfig.headerGradientFrom,
      headerGradientTo: widgetConfig.headerGradientTo,
      theme: widgetConfig.theme,
      launcherSize: widgetConfig.launcherSize,
      borderRadius: widgetConfig.borderRadius,
      shadowSize: widgetConfig.shadowSize,
      borderColor: widgetConfig.borderColor,
      fontFamily: widgetConfig.fontFamily,
      fontSize: widgetConfig.fontSize,
      suggestions,
      previewMessages: widgetConfig.previewMessages?.filter((item) => item.trim()).length
        ? widgetConfig.previewMessages.filter((item) => item.trim())
        : DEFAULT_MESSAGES,
      allowedDomains: widgetConfig.allowedDomains,
      instructions: widgetConfig.instructions,
      inputPlaceholder: widgetConfig.inputPlaceholder,
      hideSuggestionsOnInteract: widgetConfig.hideSuggestionsOnInteract,
      autoShowPreviewDelay: 1,
      showBranding: widgetConfig.showBranding,
      privacyPolicyUrl: widgetConfig.privacyPolicyUrl,
      enableLeadCapture: widgetConfig.enableLeadCapture,
      leadCaptureKeywords: widgetConfig.leadCaptureKeywords,
      leadCaptureMinutesThreshold: widgetConfig.leadCaptureMinutesThreshold,
      leadCaptureMessageThreshold: widgetConfig.leadCaptureMessageThreshold,
      enableBrochure: widgetConfig.enableBrochure,
      brochureSuggestionText: widgetConfig.brochureSuggestionText,
      escalationKeywords: widgetConfig.escalationKeywords,
    };
  }, [suggestions, widgetConfig, workspaceId]);
  function updateInstance(instanceId: string, patch: Partial<PlaygroundInstance>) {
    setInstances((current) =>
      current.map((instance) =>
        instance.id === instanceId ? { ...instance, ...patch } : instance,
      ),
    );
  }

  function enableCompareMode() {
    setCompareMode(true);
    setMobileSettingsOpen(false);
    setInstances((current) => {
      if (current.length > 1) return current;
      return [
        ...current,
        {
          id: "compare",
          modelId: "gpt-5-5",
          sync: true,
          temperature: 0,
          messages: DEFAULT_MESSAGES,
        },
      ];
    });
  }

  function moveInstance(instanceId: string, direction: "left" | "right") {
    setInstances((current) => {
      const index = current.findIndex((instance) => instance.id === instanceId);
      if (index === -1) return current;
      const nextIndex = direction === "left" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  function removeInstance(instanceId: string) {
    setInstances((current) => {
      const next = current.filter((instance) => instance.id !== instanceId);
      if (next.length <= 1) {
        setCompareMode(false);
      }
      if (!next.some((instance) => instance.id === selectedInstanceId) && next[0]) {
        setSelectedInstanceId(next[0].id);
      }
      return next.length > 0 ? next : current;
    });
  }

  function addInstance() {
    const index = instances.length + 1;
    const newInstance: PlaygroundInstance = {
      id: `instance-${index}`,
      modelId: MODEL_OPTIONS[index % MODEL_OPTIONS.length]?.id ?? "gpt-5-4-mini",
      sync: true,
      temperature: 0,
      messages: DEFAULT_MESSAGES,
    };
    setInstances((current) => [...current, newInstance]);
    setCompareMode(true);
  }

  function openSettings(instanceId: string) {
    setSelectedInstanceId(instanceId);

    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopSettingsOpen(true);
      return;
    }

    setMobileSettingsOpen(true);
  }

  function openMobilePlaygroundSettings() {
    setSelectedInstanceId(instances[0]?.id ?? "primary");
    setMobileSettingsOpen(true);
  }

  useEffect(() => {
    if (!desktopSettingsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-compare-settings-trigger]")) return;
      if (!desktopSettingsRef.current?.contains(target)) {
        setDesktopSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [desktopSettingsOpen]);

  const previewCards = instances.map((instance, index) => (
    <InstanceCard
      key={instance.id}
      instance={instance}
      position={index}
      count={instances.length}
      onMove={(direction) => moveInstance(instance.id, direction)}
      onDelete={() => removeInstance(instance.id)}
      onOpenSettings={() => openSettings(instance.id)}
      suggestions={suggestions}
      settingsOpen={desktopSettingsOpen && selectedInstanceId === instance.id}
      settingsRef={
        desktopSettingsOpen && selectedInstanceId === instance.id ? desktopSettingsRef : undefined
      }
      settingsPanel={
        <PlaygroundSettings
          agentName={agentName}
          instance={instance}
          instructions={instructions}
          trainingSummary={trainingSummary}
          onUpdate={(patch) => updateInstance(instance.id, patch)}
          onResetInstructions={() => setInstructions(widgetConfig?.instructions?.trim() ?? "")}
          compact
          overlay
        />
      }
    />
  ));

  return (
    <ContentLayout
      className="overflow-hidden bg-transparent p-0 sm:px-0 sm:py-0"
      scrollable={false}
    >
      <div className="relative flex h-[calc(100dvh-3rem)] min-h-0 flex-col bg-background">
        {compareMode ? (
          <div className="shrink-0 border-b border-border/70 px-4 py-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={() => setCompareMode(false)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Playground
            </button>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Compare
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm">
                  Clear all chats
                </Button>
                <Button type="button" variant="outline" size="sm">
                  Reset
                </Button>
                <Button type="button" size="sm" onClick={addInstance} className="gap-2">
                  <Plus className="size-4" />
                  Add an instance
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {!compareMode ? (
            <aside className="hidden w-[360px] shrink-0 border-r border-border/70 bg-card lg:block">
              <div className="flex h-full min-h-0 flex-col overflow-hidden p-5">
                <PlaygroundSettings
                  agentName={agentName}
                  instance={selectedInstance}
                  instructions={instructions}
                  trainingSummary={trainingSummary}
                  onUpdate={(patch) => updateInstance(selectedInstance.id, patch)}
                  onCompare={enableCompareMode}
                  onResetInstructions={() =>
                    setInstructions(widgetConfig?.instructions?.trim() ?? "")
                  }
                />
              </div>
            </aside>
          ) : null}

          <div className="relative min-w-0 flex-1 overflow-hidden bg-muted/20 dark:bg-background">
            <div
              className="absolute inset-0 opacity-80 dark:opacity-35"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(99,91,255,0.12) 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            />

            {compareMode ? (
              <div className="relative h-full min-h-0 overflow-y-auto lg:flex lg:items-center lg:overflow-hidden">
                <div className="w-full p-3 sm:p-6">
                  <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">{previewCards}</div>
                </div>
              </div>
            ) : (
              <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 lg:hidden">
                  <div>
                    <h1 className="text-base font-semibold text-foreground">Playground</h1>
                    <p className="text-xs text-muted-foreground">Test your agent live</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={enableCompareMode}
                    >
                      Compare
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={openMobilePlaygroundSettings}
                    >
                      <Sliders className="size-4" />
                      Settings
                    </Button>
                  </div>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-6">
                  {livePreviewConfig ? (
                    <>
                      <div className="hidden min-h-0 flex-1 lg:flex">
                        <LivePlaygroundPreview config={livePreviewConfig} />
                      </div>

                      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
                        {mobilePreviewOpen ? (
                          <div className="relative flex min-h-0 flex-1 flex-col">
                            <div className="mb-3 flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => setMobilePreviewOpen(false)}
                              >
                                <X className="size-4" />
                                Close preview
                              </Button>
                            </div>
                            <div className="min-h-0 flex-1">
                              <LivePlaygroundPreview
                                key={
                                  mobilePreviewOpen
                                    ? "mobile-preview-open"
                                    : "mobile-preview-closed"
                                }
                                config={livePreviewConfig}
                                autoOpen
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/80 p-6 text-center">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <MessageCircle className="size-7" />
                            </div>
                            <h2 className="mt-4 text-base font-semibold text-foreground">
                              Widget preview
                            </h2>
                            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                              Open a live preview of your agent widget and test conversations on
                              mobile.
                            </p>
                            <Button
                              type="button"
                              className="mt-5 rounded-xl"
                              onClick={() => setMobilePreviewOpen(true)}
                            >
                              <MessageCircle className="size-4" />
                              Preview widget
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full min-h-0 w-full items-center justify-center rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground shadow-sm">
                      Loading widget preview...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <Sheet open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
          <SheetContent
            side="bottom"
            className="z-[200] h-[min(85dvh,680px)] rounded-t-2xl p-0 lg:hidden"
          >
            <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
              <SheetTitle>{compareMode ? "Instance settings" : "Playground settings"}</SheetTitle>
              <SheetDescription>
                Adjust model, temperature, and instructions for this test session.
              </SheetDescription>
            </SheetHeader>
            <div className="h-[calc(100%-5.5rem)] overflow-y-auto p-5">
              {selectedInstance ? (
                <PlaygroundSettings
                  agentName={agentName}
                  instance={selectedInstance}
                  instructions={instructions}
                  trainingSummary={trainingSummary}
                  onUpdate={(patch) => updateInstance(selectedInstance.id, patch)}
                  onCompare={enableCompareMode}
                  onResetInstructions={() =>
                    setInstructions(widgetConfig?.instructions?.trim() ?? "")
                  }
                  mobile
                  compact={compareMode}
                  overlay={compareMode}
                />
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </ContentLayout>
  );
}
