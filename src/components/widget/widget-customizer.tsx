"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Bot,
  Code,
  Eye,
  ExternalLink,
  Menu,
  MessageCircle,
  MessageSquare,
  Sliders,
  Sparkles,
  X,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import type { DashboardWidgetConfig } from "@/hooks/query";
import { useWidgetConfig, useSaveWidgetConfig } from "@/hooks/query";
import { isValidDomain, sanitizeDomain } from "@/lib/domain-validation";
import { getWidgetAccentVars, WIDGET_BRAND_COLOR } from "@/lib/widget-accent";
import { normalizeFontFamily, normalizeFontSize, normalizeLogoUrl } from "@/features/widget/domain";
import { cn } from "@/lib/utils";

import { WidgetPreviewPanel } from "./widget-preview-panel";
import {
  APPEARANCE_DEFAULTS,
  getAppearanceDefaults,
  WidgetAgentPanel,
  WidgetAppearancePanel,
  WidgetBehaviourPanel,
  WidgetConversationStarterPanel,
  WidgetInstallationPanel,
  WidgetSuggestedQuestionsPanel,
  type AppearanceConfig,
} from "./widget-settings-panels";

const WIDGET_SETTINGS_TABS = [
  "appearance",
  "agent",
  "behaviour",
  "conversation-starter",
  "suggested-questions",
  "installation",
] as const;

type WidgetSettingsTab = (typeof WIDGET_SETTINGS_TABS)[number];

type WidgetCustomizerConfig = Pick<
  DashboardWidgetConfig,
  | "publicKey"
  | "position"
  | "theme"
  | "agentName"
  | "welcomeMessage"
  | "logoUrl"
  | "primaryColor"
  | "backgroundColor"
  | "textColor"
  | "userBubbleColor"
  | "userBubbleTextColor"
  | "botBubbleColor"
  | "botBubbleTextColor"
  | "headerGradientFrom"
  | "headerGradientTo"
  | "launcherSize"
  | "borderRadius"
  | "shadowSize"
  | "inputPlaceholder"
  | "suggestions"
  | "hideSuggestionsOnInteract"
  | "previewMessages"
  | "autoShowPreviewDelay"
  | "showBranding"
  | "privacyPolicyUrl"
  | "enableLeadCapture"
  | "leadCaptureKeywords"
  | "leadCaptureMinutesThreshold"
  | "leadCaptureMessageThreshold"
  | "enableBrochure"
  | "brochureSuggestionText"
  | "allowedDomains"
  | "instructions"
  | "escalationKeywords"
  | "borderColor"
  | "fontFamily"
  | "fontSize"
> & {
  workspaceId: string;
  secondaryTextColor: string;
  linkColor: string;
};

const LEGACY_TAB_MAP: Record<string, WidgetSettingsTab> = {
  general: "agent",
  appearance: "appearance",
  content: "conversation-starter",
  "lead-capture": "behaviour",
  embed: "installation",
};

const NAV_ITEMS: {
  id: WidgetSettingsTab;
  label: string;
  icon: typeof Sparkles;
}[] = [
  { id: "appearance", label: "Appearance", icon: Sparkles },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "behaviour", label: "Behaviour", icon: Sliders },
  { id: "conversation-starter", label: "Conversation Starter", icon: MessageCircle },
  { id: "suggested-questions", label: "Suggested Questions", icon: MessageSquare },
  { id: "installation", label: "Installation", icon: Code },
];

const WIDGET_CARD_CLASS = "rounded-xl border border-border";

const WIDGET_SETTINGS_CARD_CLASS = `${WIDGET_CARD_CLASS} overflow-hidden`;

function resolveInitialTab(initialSubtab?: string | null): WidgetSettingsTab {
  if (!initialSubtab) return "appearance";
  if (WIDGET_SETTINGS_TABS.includes(initialSubtab as WidgetSettingsTab)) {
    return initialSubtab as WidgetSettingsTab;
  }
  return LEGACY_TAB_MAP[initialSubtab] ?? "appearance";
}

function mergeWidgetConfig(
  server: DashboardWidgetConfig,
  overrides: Partial<WidgetCustomizerConfig>,
  workspaceId: string,
): WidgetCustomizerConfig {
  const merged = {
    ...server,
    workspaceId,
    ...overrides,
  };

  return {
    ...merged,
    logoUrl: normalizeLogoUrl(merged.logoUrl) ?? null,
    secondaryTextColor: overrides.secondaryTextColor ?? server.botBubbleTextColor,
    linkColor: overrides.linkColor ?? merged.primaryColor,
    borderColor: merged.borderColor || APPEARANCE_DEFAULTS.borderColor,
    fontFamily: normalizeFontFamily(merged.fontFamily || APPEARANCE_DEFAULTS.fontFamily),
    fontSize: normalizeFontSize(merged.fontSize || APPEARANCE_DEFAULTS.fontSize),
  };
}

function valuesEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getPendingConfigOverrides(
  current: Partial<WidgetCustomizerConfig>,
  saved: Partial<WidgetCustomizerConfig>,
): Partial<WidgetCustomizerConfig> {
  const next: Partial<WidgetCustomizerConfig> = {};

  for (const key of Object.keys(current) as (keyof WidgetCustomizerConfig)[]) {
    const savedValue = saved[key];
    const currentValue = current[key];

    if (savedValue === undefined || !valuesEqual(currentValue, savedValue)) {
      setConfigOverride(next, key, currentValue);
    }
  }

  return next;
}

function setConfigOverride<K extends keyof WidgetCustomizerConfig>(
  target: Partial<WidgetCustomizerConfig>,
  key: K,
  value: WidgetCustomizerConfig[K] | undefined,
) {
  target[key] = value;
}

function toSavePayload(config: WidgetCustomizerConfig) {
  return {
    agentName: config.agentName,
    welcomeMessage: config.welcomeMessage,
    logoUrl: normalizeLogoUrl(config.logoUrl?.trim() ? config.logoUrl.trim() : null),
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    userBubbleColor: config.userBubbleColor,
    userBubbleTextColor: config.userBubbleTextColor,
    botBubbleColor: config.botBubbleColor,
    botBubbleTextColor: config.secondaryTextColor,
    headerGradientFrom: config.headerGradientFrom,
    headerGradientTo: config.headerGradientFrom,
    theme: config.theme,
    position: config.position,
    launcherSize: config.launcherSize,
    borderRadius: config.borderRadius,
    shadowSize: config.shadowSize,
    inputPlaceholder: config.inputPlaceholder,
    suggestions: config.suggestions.filter((item) => item.trim()),
    previewMessages: config.previewMessages.filter((item) => item.trim()),
    hideSuggestionsOnInteract: config.hideSuggestionsOnInteract,
    autoShowPreviewDelay: config.autoShowPreviewDelay,
    showBranding: config.showBranding,
    privacyPolicyUrl: config.privacyPolicyUrl,
    enableLeadCapture: config.enableLeadCapture,
    leadCaptureKeywords: config.leadCaptureKeywords.filter((item) => item.trim()),
    leadCaptureMinutesThreshold: config.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: config.leadCaptureMessageThreshold,
    enableBrochure: config.enableBrochure,
    brochureSuggestionText: config.brochureSuggestionText,
    allowedDomains: config.allowedDomains || [],
    instructions: config.instructions,
    escalationKeywords: config.escalationKeywords,
    borderColor: config.borderColor,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
  };
}

function WidgetSettingsMenu({
  activeTab,
  isOpen,
  onClose,
  onTabChange,
  menuRef,
}: {
  activeTab: WidgetSettingsTab;
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: WidgetSettingsTab) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        WIDGET_CARD_CLASS,
        "absolute top-full left-0 z-50 mt-2 flex w-[248px] flex-col bg-popover shadow-md",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Widget</p>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            Customize your AI assistant
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <ul className="flex flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--widget-accent-muted)] text-[var(--widget-accent)]"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-[var(--widget-accent)]" : "text-muted-foreground",
                  )}
                />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">Need help?</p>
        <a
          href="https://docs.widget.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--widget-accent)] hover:opacity-80"
        >
          View documentation
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function WidgetCustomizerSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-2 sm:p-3 lg:flex-row"
      style={getWidgetAccentVars(WIDGET_BRAND_COLOR)}
    >
      <Skeleton className="size-9 shrink-0 rounded-lg" />

      <div
        className={cn(
          WIDGET_SETTINGS_CARD_CLASS,
          "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="mt-2 h-4 w-56 rounded" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          WIDGET_CARD_CLASS,
          "hidden h-[360px] min-h-0 w-full shrink-0 flex-col overflow-hidden sm:h-[420px] lg:flex lg:h-full lg:w-[380px] xl:w-[420px]",
        )}
      >
        <div className="flex shrink-0 gap-2 px-4 py-3">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden p-4">
          <Skeleton className="h-full min-h-0 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function WidgetCustomizer({
  workspaceId,
  initialSubtab,
  showPreviewModeToggle = true,
}: {
  workspaceId?: string | null;
  initialSubtab?: string | null;
  showPreviewModeToggle?: boolean;
}) {
  const activeWorkspaceId = workspaceId || "";
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WidgetSettingsTab>(() =>
    resolveInitialTab(initialSubtab),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [configOverrides, setConfigOverrides] = useState<Partial<WidgetCustomizerConfig>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const savedOverridesRef = useRef<Partial<WidgetCustomizerConfig>>({});
  const configOverridesRef = useRef(configOverrides);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  configOverridesRef.current = configOverrides;

  const { data: widgetConfigData, isLoading } = useWidgetConfig(activeWorkspaceId);
  const saveWidgetConfigMutation = useSaveWidgetConfig();

  const isReady = Boolean(activeWorkspaceId) && Boolean(widgetConfigData) && !isLoading;

  const config = useMemo(() => {
    if (!isReady || !widgetConfigData) return null;
    return mergeWidgetConfig(widgetConfigData, configOverrides, activeWorkspaceId);
  }, [activeWorkspaceId, configOverrides, isReady, widgetConfigData]);

  const updateConfig = useCallback(
    <Key extends keyof WidgetCustomizerConfig>(key: Key, value: WidgetCustomizerConfig[Key]) => {
      setConfigOverrides((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const updateConfigBatch = useCallback((updates: Partial<WidgetCustomizerConfig>) => {
    setConfigOverrides((current) => ({ ...current, ...updates }));
  }, []);

  const handleSubTabChange = (value: WidgetSettingsTab) => {
    setActiveTab(value);
    setMenuOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("subtab", value);
    router.push(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuContainerRef.current?.contains(target) || menuPanelRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const handleArrayChange = (
    key: "suggestions" | "previewMessages" | "leadCaptureKeywords",
    value: string,
  ) => {
    updateConfig(key, value.split("\n"));
  };

  const handleBehaviourUpdate = (
    key:
      | "inputPlaceholder"
      | "autoShowPreviewDelay"
      | "hideSuggestionsOnInteract"
      | "enableLeadCapture"
      | "leadCaptureMinutesThreshold"
      | "leadCaptureMessageThreshold"
      | "enableBrochure"
      | "brochureSuggestionText"
      | "privacyPolicyUrl",
    value: string | number | boolean,
  ) => {
    updateConfig(key, value as WidgetCustomizerConfig[typeof key]);
  };

  const buildSavePayload = useCallback(() => {
    if (!widgetConfigData) return {};
    const merged = mergeWidgetConfig(widgetConfigData, configOverrides, activeWorkspaceId);
    return toSavePayload(merged);
  }, [activeWorkspaceId, configOverrides, widgetConfigData]);

  const persistConfig = useCallback(
    (options?: { silent?: boolean }) => {
      if (!activeWorkspaceId || !widgetConfigData) {
        if (!activeWorkspaceId && !options?.silent) {
          toast({
            title: "Error",
            description: "Workspace ID is required to save configuration.",
            variant: "destructive",
          });
        }
        return;
      }

      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      savedOverridesRef.current = { ...configOverridesRef.current };
      isSavingRef.current = true;

      saveWidgetConfigMutation.mutate(
        {
          workspaceId: activeWorkspaceId,
          body: buildSavePayload(),
        },
        {
          onSuccess: () => {
            isSavingRef.current = false;
            setConfigOverrides((current) =>
              getPendingConfigOverrides(current, savedOverridesRef.current),
            );
            if (pendingSaveRef.current) {
              pendingSaveRef.current = false;
              persistConfig({ silent: true });
            }
            if (!options?.silent) {
              toast({
                title: "Configuration saved",
                description: "Your widget configuration has been published.",
              });
            }
          },
          onError: (error) => {
            isSavingRef.current = false;
            pendingSaveRef.current = false;
            if (!options?.silent) {
              toast({
                title: "Error saving configuration",
                description: error.message || "Failed to save configuration. Please try again.",
                variant: "destructive",
              });
            }
          },
        },
      );
    },
    [activeWorkspaceId, buildSavePayload, saveWidgetConfigMutation, toast, widgetConfigData],
  );

  useEffect(() => {
    if (!isReady) return;
    if (Object.keys(configOverrides).length === 0) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      persistConfig({ silent: true });
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [configOverrides, isReady, persistConfig]);

  const handleResetAppearance = () => {
    const defaults = getAppearanceDefaults();
    setConfigOverrides((current) => ({
      ...current,
      ...defaults,
      userBubbleTextColor: APPEARANCE_DEFAULTS.userBubbleTextColor,
      headerGradientTo: defaults.headerGradientFrom,
    }));
  };

  const liveConfig = useMemo(() => {
    if (!config) return null;

    return {
      workspaceId: config.workspaceId,
      publicKey: config.publicKey,
      agentName: config.agentName,
      welcomeMessage: config.welcomeMessage,
      logoUrl: normalizeLogoUrl(config.logoUrl),
      primaryColor: config.primaryColor,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      userBubbleColor: config.userBubbleColor,
      userBubbleTextColor: config.userBubbleTextColor,
      botBubbleColor: config.botBubbleColor,
      botBubbleTextColor: config.secondaryTextColor,
      headerGradientFrom: config.headerGradientFrom,
      headerGradientTo: config.headerGradientTo,
      position: config.position,
      theme: config.theme,
      launcherSize: config.launcherSize,
      borderRadius: config.borderRadius,
      shadowSize: config.shadowSize,
      borderColor: config.borderColor,
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      inputPlaceholder: config.inputPlaceholder,
      suggestions: config.suggestions,
      hideSuggestionsOnInteract: config.hideSuggestionsOnInteract,
      previewMessages: config.previewMessages,
      autoShowPreviewDelay: config.autoShowPreviewDelay,
      showBranding: config.showBranding,
      privacyPolicyUrl: config.privacyPolicyUrl,
      enableLeadCapture: config.enableLeadCapture,
      leadCaptureKeywords: config.leadCaptureKeywords,
      leadCaptureMinutesThreshold: config.leadCaptureMinutesThreshold,
      leadCaptureMessageThreshold: config.leadCaptureMessageThreshold,
      enableBrochure: config.enableBrochure,
      brochureSuggestionText: config.brochureSuggestionText,
      allowedDomains: config.allowedDomains,
    };
  }, [config]);

  if (!isReady || !config || !liveConfig) {
    return <WidgetCustomizerSkeleton />;
  }

  const handleAddDomain = () => {
    const sanitized = sanitizeDomain(domainInput);
    if (!sanitized || !isValidDomain(domainInput)) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain name (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }

    const existingDomains = config.allowedDomains || [];
    if (existingDomains.includes(sanitized)) {
      toast({
        title: "Domain already exists",
        description: "This domain is already in your allowed list",
        variant: "destructive",
      });
      return;
    }

    updateConfig("allowedDomains", [...existingDomains, sanitized]);
    setDomainInput("");
  };

  const handleRemoveDomain = (domain: string) => {
    updateConfig(
      "allowedDomains",
      config.allowedDomains.filter((item) => item !== domain),
    );
  };

  const generateScript = () => {
    const publicKey = config.publicKey ?? "";
    return `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.bundle.js" data-widget-key="${publicKey}" async></script>`;
  };

  const copyScript = () => {
    navigator.clipboard.writeText(generateScript());
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Embed code has been copied to your clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const appearanceConfig: AppearanceConfig = {
    logoUrl: config.logoUrl ?? "",
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    headerGradientFrom: config.headerGradientFrom,
    userBubbleColor: config.userBubbleColor,
    botBubbleColor: config.botBubbleColor,
    textColor: config.textColor,
    secondaryTextColor: config.secondaryTextColor,
    borderColor: config.borderColor,
    linkColor: config.linkColor,
    position: config.position,
    theme: config.theme,
    showBranding: config.showBranding,
    welcomeMessage: config.welcomeMessage,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
  };

  const handleAppearanceUpdate = <K extends keyof AppearanceConfig>(
    key: K,
    value: AppearanceConfig[K],
  ) => {
    if (key === "secondaryTextColor") {
      updateConfigBatch({
        secondaryTextColor: value as string,
        botBubbleTextColor: value as string,
      });
      return;
    }
    updateConfig(
      key as keyof WidgetCustomizerConfig,
      value as WidgetCustomizerConfig[keyof WidgetCustomizerConfig],
    );
  };

  const handleAppearanceBatchUpdate = (updates: Partial<AppearanceConfig>) => {
    const batch: Partial<WidgetCustomizerConfig> = { ...updates };
    if (updates.headerGradientFrom) {
      batch.headerGradientTo = updates.headerGradientFrom;
    }
    updateConfigBatch(batch);
  };

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 lg:flex-row lg:items-stretch"
      style={getWidgetAccentVars(WIDGET_BRAND_COLOR)}
    >
      <div className="flex shrink-0 items-center gap-2 lg:block lg:self-start lg:pt-1">
        <div ref={menuContainerRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Open widget settings menu"
            aria-expanded={menuOpen}
          >
            <Menu className="size-5" />
          </button>

          <WidgetSettingsMenu
            activeTab={activeTab}
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            onTabChange={handleSubTabChange}
            menuRef={menuPanelRef}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowMobilePreview((open) => !open)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground lg:hidden",
            showMobilePreview && "border-[var(--widget-accent)] text-[var(--widget-accent)]",
          )}
          aria-label={showMobilePreview ? "Hide preview" : "Show preview"}
          aria-pressed={showMobilePreview}
        >
          <Eye className="size-4" />
          Preview
        </button>
      </div>

      <div
        className={cn(
          WIDGET_SETTINGS_CARD_CLASS,
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          showMobilePreview ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? "Widget"}
            </p>
            <p className="text-xs text-muted-foreground">Customize your assistant</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            onClick={() => setMobilePreviewOpen(true)}
          >
            <MessageCircle className="size-4" />
            Preview
          </Button>
        </div>

        <div className="border-b border-border/60 px-3 py-2 lg:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSubTabChange(item.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-[var(--widget-accent-border)] bg-[var(--widget-accent-muted)] text-[var(--widget-accent)]"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {activeTab === "appearance" ? (
            <WidgetAppearancePanel
              config={appearanceConfig}
              onUpdate={handleAppearanceUpdate}
              onBatchUpdate={handleAppearanceBatchUpdate}
              onReset={handleResetAppearance}
            />
          ) : null}

          {activeTab === "agent" ? (
            <WidgetAgentPanel
              agentName={config.agentName}
              instructions={config.instructions}
              escalationKeywords={config.escalationKeywords}
              onUpdate={(key, value) => updateConfig(key, value)}
            />
          ) : null}

          {activeTab === "behaviour" ? (
            <WidgetBehaviourPanel
              inputPlaceholder={config.inputPlaceholder}
              autoShowPreviewDelay={config.autoShowPreviewDelay}
              hideSuggestionsOnInteract={config.hideSuggestionsOnInteract}
              enableLeadCapture={config.enableLeadCapture}
              leadCaptureMinutesThreshold={config.leadCaptureMinutesThreshold}
              leadCaptureMessageThreshold={config.leadCaptureMessageThreshold}
              leadCaptureKeywords={config.leadCaptureKeywords}
              enableBrochure={config.enableBrochure}
              brochureSuggestionText={config.brochureSuggestionText}
              privacyPolicyUrl={config.privacyPolicyUrl}
              onUpdate={handleBehaviourUpdate}
              onKeywordsChange={(value) => handleArrayChange("leadCaptureKeywords", value)}
            />
          ) : null}

          {activeTab === "conversation-starter" ? (
            <WidgetConversationStarterPanel
              welcomeMessage={config.welcomeMessage}
              previewMessages={config.previewMessages}
              onUpdateWelcome={(value) => updateConfig("welcomeMessage", value)}
              onPreviewMessagesChange={(value) => handleArrayChange("previewMessages", value)}
            />
          ) : null}

          {activeTab === "suggested-questions" ? (
            <WidgetSuggestedQuestionsPanel
              suggestions={config.suggestions}
              onChange={(value) => handleArrayChange("suggestions", value)}
            />
          ) : null}

          {activeTab === "installation" ? (
            <WidgetInstallationPanel
              allowedDomains={config.allowedDomains}
              domainInput={domainInput}
              copied={copied}
              embedScript={generateScript()}
              onDomainInputChange={setDomainInput}
              onAddDomain={handleAddDomain}
              onRemoveDomain={handleRemoveDomain}
              onCopyScript={copyScript}
            />
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          WIDGET_CARD_CLASS,
          "flex min-h-0 w-full shrink-0 flex-col overflow-hidden",
          showMobilePreview
            ? "h-[min(70vh,520px)] flex-1 lg:h-full lg:flex-1 lg:w-[380px] xl:w-[420px]"
            : "hidden lg:flex lg:h-full lg:w-[380px] xl:w-[420px]",
        )}
      >
        <WidgetPreviewPanel liveConfig={liveConfig} showModeToggle={showPreviewModeToggle} />
      </div>

      <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <SheetContent side="bottom" className="h-[min(88dvh,760px)] rounded-t-2xl p-0 lg:hidden">
          <SheetHeader className="border-b border-border/70 px-5 py-4 text-left">
            <SheetTitle>Widget preview</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-4rem)]">
            <WidgetPreviewPanel liveConfig={liveConfig} showModeToggle={showPreviewModeToggle} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
