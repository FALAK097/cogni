"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Bot, Code, Eye, MessageCircle, Sparkles } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import type { DashboardWidgetConfig } from "@/hooks/query";
import { useWidgetConfig, useSaveWidgetConfig } from "@/hooks/query";
import { isValidDomain, sanitizeDomain } from "@/lib/domain-validation";
import { getWidgetAccentVars, WIDGET_BRAND_COLOR } from "@/lib/widget-accent";
import { normalizeFontFamily, normalizeFontSize, normalizeLogoUrl } from "@/features/widget/domain";
import { BookingSettingsCard } from "@/features/integrations/components/booking-settings-card";
import { cn } from "@/lib/utils";

import { toSavePayload, type WidgetCustomizerConfig } from "./widget-settings-payload";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { WidgetPreviewPanel } from "./widget-preview-panel";
import { WidgetTestPanel, type WidgetPreviewEvidence } from "./widget-test-panel";
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

const AGENT_SECTIONS = ["build", "test", "customize", "deploy"] as const;
type AgentSection = (typeof AGENT_SECTIONS)[number];

const NAV_ITEMS: {
  id: AgentSection;
  label: string;
  icon: typeof Sparkles;
}[] = [
  { id: "build", label: "Build", icon: Bot },
  { id: "test", label: "Test", icon: MessageCircle },
  { id: "customize", label: "Customize", icon: Sparkles },
  { id: "deploy", label: "Deploy", icon: Code },
];

const LEGACY_TAB_MAP: Record<string, AgentSection> = {
  general: "build",
  agent: "build",
  behaviour: "build",
  appearance: "customize",
  "conversation-starter": "customize",
  "suggested-questions": "customize",
  content: "customize",
  "lead-capture": "build",
  installation: "deploy",
  embed: "deploy",
};

const WIDGET_CARD_CLASS = "rounded-xl border border-border";

const WIDGET_SETTINGS_CARD_CLASS = `${WIDGET_CARD_CLASS} overflow-hidden`;

function resolveInitialSection(initialSubtab?: string | null): AgentSection {
  if (!initialSubtab) return "build";
  if (AGENT_SECTIONS.includes(initialSubtab as AgentSection)) return initialSubtab as AgentSection;
  return LEGACY_TAB_MAP[initialSubtab] ?? "build";
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
  canManage,
}: {
  workspaceId?: string | null;
  initialSubtab?: string | null;
  canManage: boolean;
}) {
  const activeWorkspaceId = workspaceId || "";
  const { toast } = useToast();
  const router = useRouter();
  const activeSection = resolveInitialSection(initialSubtab);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState<WidgetPreviewEvidence | null>(null);
  const [sendingTestPrompt, setSendingTestPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [configOverrides, setConfigOverrides] = useState<Partial<WidgetCustomizerConfig>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const savedOverridesRef = useRef<Partial<WidgetCustomizerConfig>>({});
  const configOverridesRef = useRef(configOverrides);
  const widgetConfigRef = useRef<DashboardWidgetConfig | undefined>(undefined);

  useEffect(() => {
    configOverridesRef.current = configOverrides;
  }, [configOverrides]);

  const widgetConfigQuery = useWidgetConfig(activeWorkspaceId);
  const { data: widgetConfigData, isLoading } = widgetConfigQuery;
  const saveWidgetConfigMutation = useSaveWidgetConfig();
  const saveWidgetConfig = saveWidgetConfigMutation.mutateAsync;

  const tryPreviewPrompt = useCallback(async (prompt: string) => {
    setSendingTestPrompt(prompt);
    setShowMobilePreview(true);
    try {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const sendPreviewMessage = window.Widget?.sendPreviewMessage;
        if (sendPreviewMessage) return await sendPreviewMessage(prompt);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
      }
      return false;
    } finally {
      setSendingTestPrompt(null);
    }
  }, []);

  useEffect(() => {
    widgetConfigRef.current = widgetConfigData;
  }, [widgetConfigData]);

  const isReady = Boolean(activeWorkspaceId) && Boolean(widgetConfigData) && !isLoading;

  const config = useMemo(() => {
    if (!isReady || !widgetConfigData) return null;
    return mergeWidgetConfig(widgetConfigData, configOverrides, activeWorkspaceId);
  }, [activeWorkspaceId, configOverrides, isReady, widgetConfigData]);

  const updateConfig = useCallback(
    <Key extends keyof WidgetCustomizerConfig>(key: Key, value: WidgetCustomizerConfig[Key]) => {
      if (!canManage) return;
      const next = { ...configOverridesRef.current, [key]: value };
      configOverridesRef.current = next;
      setConfigOverrides(next);
    },
    [canManage],
  );

  const updateConfigBatch = useCallback(
    (updates: Partial<WidgetCustomizerConfig>) => {
      if (!canManage) return;
      const next = { ...configOverridesRef.current, ...updates };
      configOverridesRef.current = next;
      setConfigOverrides(next);
    },
    [canManage],
  );

  const handleSubTabChange = (value: string | number) => {
    if (typeof value !== "string" || !AGENT_SECTIONS.includes(value as AgentSection)) return;
    const url = new URL(window.location.href);
    url.searchParams.set("subtab", value);
    router.push(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
  };

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
    const savedConfig = widgetConfigRef.current;
    if (!savedConfig) return {};
    const merged = mergeWidgetConfig(savedConfig, configOverridesRef.current, activeWorkspaceId);
    return toSavePayload(merged);
  }, [activeWorkspaceId]);

  const persistConfigRef = useRef<(options?: { silent?: boolean }) => void>(() => {});

  const persistConfig = useCallback(
    (options?: { silent?: boolean }) => {
      if (!canManage) return;
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

      const submittedOverrides = { ...configOverridesRef.current };
      savedOverridesRef.current = submittedOverrides;
      isSavingRef.current = true;

      void saveWidgetConfig({
        workspaceId: activeWorkspaceId,
        body: buildSavePayload(),
      }).then(
        (savedConfig) => {
          widgetConfigRef.current = savedConfig;
          isSavingRef.current = false;
          const pendingOverrides = getPendingConfigOverrides(
            configOverridesRef.current,
            submittedOverrides,
          );
          configOverridesRef.current = pendingOverrides;
          if (Object.keys(pendingOverrides).length === 0) {
            savedOverridesRef.current = {};
          }
          setConfigOverrides(pendingOverrides);
          if (pendingSaveRef.current) {
            pendingSaveRef.current = false;
            persistConfigRef.current({ silent: true });
          }
          if (!options?.silent) {
            toast({
              title: "Configuration saved",
              description: "Your widget configuration has been saved.",
            });
          }
        },
        (error: unknown) => {
          isSavingRef.current = false;
          pendingSaveRef.current = false;
          savedOverridesRef.current = {};
          if (!options?.silent) {
            toast({
              title: "Error saving configuration",
              description:
                error instanceof Error
                  ? error.message
                  : "Failed to save configuration. Please try again.",
              variant: "destructive",
            });
          }
        },
      );
    },
    [activeWorkspaceId, buildSavePayload, canManage, saveWidgetConfig, toast, widgetConfigData],
  );

  useEffect(() => {
    persistConfigRef.current = persistConfig;
  }, [persistConfig]);

  useEffect(() => {
    if (!isReady) return;
    if (Object.keys(configOverrides).length === 0) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      persistConfig({ silent: true });
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [configOverrides, isReady, persistConfig]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (valuesEqual(configOverridesRef.current, savedOverridesRef.current)) return;
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }
      persistConfigRef.current({ silent: true });
    },
    [],
  );

  const handleResetAppearance = () => {
    if (!canManage) return;
    const defaults = getAppearanceDefaults();
    const next = {
      ...configOverridesRef.current,
      ...defaults,
      userBubbleTextColor: APPEARANCE_DEFAULTS.userBubbleTextColor,
      headerGradientTo: defaults.headerGradientFrom,
    };
    configOverridesRef.current = next;
    setConfigOverrides(next);
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

  if (widgetConfigQuery.isError) {
    return (
      <div className="m-3 rounded-xl border border-border bg-card p-6" role="alert">
        <h2 className="text-base font-semibold">Couldn't load agent settings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again to load your workspace's configuration.
        </p>
        <Button
          className="mt-4"
          disabled={widgetConfigQuery.isFetching}
          onClick={() => void widgetConfigQuery.refetch()}
        >
          {widgetConfigQuery.isFetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

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

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(generateScript());
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Embed code has been copied to your clipboard.",
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      toast({
        title: "Couldn't copy embed code",
        description: "Select and copy the code manually if clipboard access is blocked.",
        variant: "destructive",
      });
    }
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
      className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3"
      style={getWidgetAccentVars(WIDGET_BRAND_COLOR)}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMobilePreview((open) => !open)}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-xs transition-[transform,color,background-color] duration-150 active:scale-[0.96] hover:bg-muted hover:text-foreground motion-reduce:transition-none motion-reduce:active:scale-100 lg:hidden",
            showMobilePreview && "border-[var(--widget-accent)] text-[var(--widget-accent)]",
          )}
          aria-label={showMobilePreview ? "Hide preview" : "Show preview"}
          aria-pressed={showMobilePreview}
        >
          <Eye className="size-4" strokeWidth={2} />
          Preview
        </button>
        <output
          className="ml-auto flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span>
            {saveWidgetConfigMutation.isPending
              ? "Saving…"
              : saveWidgetConfigMutation.isError
                ? "Changes not saved"
                : Object.keys(configOverrides).length > 0
                  ? "Unsaved changes"
                  : "Saved"}
          </span>
          {saveWidgetConfigMutation.isError && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 lg:min-h-10"
              onClick={() => persistConfig()}
            >
              Retry save
            </Button>
          )}
        </output>
      </div>
      {!canManage ? (
        <output className="shrink-0 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          You can preview the agent. Only workspace owners can change settings or authorized
          domains.
        </output>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
        <div
          className={cn(
            WIDGET_SETTINGS_CARD_CLASS,
            "@container flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            showMobilePreview ? "hidden lg:flex" : "flex",
          )}
        >
          <Tabs
            value={activeSection}
            onValueChange={handleSubTabChange}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-0"
          >
            <TabsList
              variant="line"
              aria-label="Agent setup steps"
              className="mx-4 h-12 w-auto shrink-0 justify-start gap-1 rounded-none border-b border-border bg-transparent px-0 sm:mx-6"
            >
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger key={id} value={id} className="h-11 gap-2 px-3 sm:h-10">
                  <Icon className="size-4" strokeWidth={2} />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <TabsContent value="build" keepMounted={false} className="space-y-8">
                <fieldset disabled={!canManage} className="min-w-0 space-y-8 border-0 p-0">
                  <legend className="sr-only">Agent behavior settings</legend>
                  <WidgetAgentPanel
                    agentName={config.agentName}
                    instructions={config.instructions}
                    escalationKeywords={config.escalationKeywords}
                    modelProvider={config.modelProvider}
                    modelName={config.modelName}
                    onUpdate={(key, value) => updateConfig(key, value)}
                  />
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
                  <BookingSettingsCard />
                </fieldset>
              </TabsContent>

              <TabsContent value="test" keepMounted={false}>
                <WidgetTestPanel
                  escalationKeywords={config.escalationKeywords}
                  suggestions={config.suggestions}
                  evidence={previewEvidence}
                  sendingPrompt={sendingTestPrompt}
                  onTryPrompt={tryPreviewPrompt}
                />
              </TabsContent>

              <TabsContent value="customize" keepMounted={false} className="space-y-8">
                <fieldset disabled={!canManage} className="min-w-0 space-y-8 border-0 p-0">
                  <legend className="sr-only">Widget appearance settings</legend>
                  <WidgetAppearancePanel
                    config={appearanceConfig}
                    onUpdate={handleAppearanceUpdate}
                    onBatchUpdate={handleAppearanceBatchUpdate}
                    onReset={handleResetAppearance}
                  />
                  <WidgetConversationStarterPanel
                    welcomeMessage={config.welcomeMessage}
                    previewMessages={config.previewMessages}
                    onUpdateWelcome={(value) => updateConfig("welcomeMessage", value)}
                    onPreviewMessagesChange={(value) => handleArrayChange("previewMessages", value)}
                  />
                  <WidgetSuggestedQuestionsPanel
                    suggestions={config.suggestions}
                    onChange={(value) => handleArrayChange("suggestions", value)}
                  />
                </fieldset>
              </TabsContent>

              <TabsContent value="deploy" keepMounted={false}>
                <WidgetInstallationPanel
                  allowedDomains={config.allowedDomains}
                  domainInput={domainInput}
                  copied={copied}
                  embedScript={generateScript()}
                  onDomainInputChange={setDomainInput}
                  onAddDomain={handleAddDomain}
                  onRemoveDomain={handleRemoveDomain}
                  onCopyScript={copyScript}
                  canManage={canManage}
                />
              </TabsContent>
            </div>
          </Tabs>
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
          <WidgetPreviewPanel
            liveConfig={liveConfig}
            testMode={activeSection === "test"}
            onEvidenceChange={setPreviewEvidence}
          />
        </div>
      </div>
    </div>
  );
}
