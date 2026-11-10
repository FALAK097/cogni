"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Bot, Code, Eye, MessageCircle, Sparkles } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import type { DashboardWidgetConfig } from "@/hooks/query";
import { useWidgetConfig, useSaveWidgetConfig, usePublishWidgetConfig } from "@/hooks/query";
import { isValidDomain, sanitizeDomain } from "@/lib/domain-validation";
import { getWidgetAccentVars, WIDGET_BRAND_COLOR } from "@/lib/widget-accent";
import { normalizeFontFamily, normalizeFontSize, normalizeLogoUrl } from "@/features/widget/domain";
import { WIDGET_PREVIEW_RESPONSE_TIMEOUT_MS } from "@/features/widget/agent-timeouts";
import { BookingSettingsCard } from "@/features/integrations/components/booking-settings-card";
import { WidgetKnowledgeManager } from "@/components/workspace/widget-knowledge-manager";
import { cn } from "@/lib/utils";
import { APP_PAGES, AGENT_TABS, agentHref, type AgentTab } from "@/features/navigation/app-routes";
import {
  getAgentPublicationReadiness,
  getAgentLaunchChecklist,
} from "@/features/widget/agent-readiness";
import { useKnowledgeBaseSources } from "@/hooks/query/use-knowledge-base";
import {
  useAgentTestCases,
  useAgentTestRunHistory,
  useWidgetSessions,
} from "@/hooks/query/use-widget";

import { toSavePayload, type WidgetCustomizerConfig } from "./widget-settings-payload";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { isPreviewEvidence, WidgetPreviewPanel } from "./widget-preview-panel";
import { WidgetTestPanel, type WidgetPreviewEvidence } from "./widget-test-panel";
import {
  APPEARANCE_DEFAULTS,
  getAppearanceDefaults,
  WidgetAgentPanel,
  WidgetAppearancePanel,
  WidgetBehaviourPanel,
  WidgetConversationStarterPanel,
  WidgetInstallationPanel,
  WidgetVersionHistory,
  WidgetSuggestedQuestionsPanel,
  type AppearanceConfig,
} from "./widget-settings-panels";

const NAV_ITEMS: {
  id: AgentTab;
  label: string;
  icon: typeof Sparkles;
}[] = [
  { id: "build", label: "Build", icon: Bot },
  { id: "test", label: "Test", icon: MessageCircle },
  { id: "deploy", label: "Deploy", icon: Code },
];

const WIDGET_CARD_CLASS = "rounded-xl border border-border";

const WIDGET_SETTINGS_CARD_CLASS = `${WIDGET_CARD_CLASS} overflow-hidden`;
async function waitForPreviewWidget(prompt: string): Promise<WidgetPreviewEvidence | null> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const sendPreviewMessage = window.Widget?.sendPreviewMessage;
    if (sendPreviewMessage) {
      return new Promise((resolve) => {
        let resolved = false;
        let sendFinished = false;
        let sendSucceeded = false;
        let receivedEvidence: WidgetPreviewEvidence | null = null;
        let timeoutId: number | null = null;

        const finish = (evidence: WidgetPreviewEvidence | null) => {
          if (resolved) return;
          resolved = true;
          window.removeEventListener("cogni:widget-preview-evidence", onEvidence);
          if (timeoutId !== null) window.clearTimeout(timeoutId);
          resolve(evidence);
        };
        const finishWhenReady = () => {
          if (!sendFinished) return;
          if (!sendSucceeded || receivedEvidence) finish(receivedEvidence);
        };
        const onEvidence = (event: Event) => {
          const detail = (event as CustomEvent<unknown>).detail;
          if (!isPreviewEvidence(detail) || detail.prompt !== prompt) return;
          receivedEvidence = detail;
          finishWhenReady();
        };

        window.addEventListener("cogni:widget-preview-evidence", onEvidence);
        timeoutId = window.setTimeout(() => finish(null), WIDGET_PREVIEW_RESPONSE_TIMEOUT_MS);
        void sendPreviewMessage(prompt).then(
          (sent) => {
            sendFinished = true;
            sendSucceeded = sent;
            finishWhenReady();
          },
          () => {
            sendFinished = true;
            finishWhenReady();
          },
        );
      });
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
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

export function WidgetCustomizerSkeleton() {
  return (
    <output
      aria-busy="true"
      aria-label="Loading Agent setup"
      className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3"
      style={getWidgetAccentVars(WIDGET_BRAND_COLOR)}
    >
      <div aria-hidden="true" className="flex shrink-0 flex-wrap items-center gap-2 px-1 py-1">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-11 w-24 rounded-lg lg:hidden" />
        <span className="ml-auto flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </span>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
        <div
          aria-hidden="true"
          className={cn(
            WIDGET_SETTINGS_CARD_CLASS,
            "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          )}
        >
          <div
            aria-hidden="true"
            className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 sm:px-6"
          >
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div aria-hidden="true" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="mt-2 h-4 w-56 max-w-full rounded" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className={cn(
            WIDGET_CARD_CLASS,
            "hidden h-[360px] min-h-0 w-full shrink-0 flex-col overflow-hidden sm:h-[420px] lg:flex lg:h-full lg:w-[380px] xl:w-[420px]",
          )}
        >
          <div aria-hidden="true" className="flex shrink-0 gap-2 px-4 py-3">
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
    </output>
  );
}

export function WidgetCustomizer({
  workspaceId,
  canManage,
}: {
  workspaceId?: string | null;
  canManage: boolean;
}) {
  const activeWorkspaceId = workspaceId || "";
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AgentTab>("build");
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState<WidgetPreviewEvidence | null>(null);
  const [sendingTestPrompt, setSendingTestPrompt] = useState<string | null>(null);
  const [previewTestFailed, setPreviewTestFailed] = useState(false);
  const [lastPreviewPrompt, setLastPreviewPrompt] = useState<string | null>(null);
  const mobileTestResultRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);
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

  useEffect(() => {
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (AGENT_TABS.includes(hash as AgentTab)) {
        setActiveTab(hash as AgentTab);
      }
    };
    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  const widgetConfigQuery = useWidgetConfig(activeWorkspaceId);
  const knowledgeSourcesQuery = useKnowledgeBaseSources(undefined, {
    enabled: Boolean(activeWorkspaceId),
  });
  const testCasesQuery = useAgentTestCases();
  const testRunsQuery = useAgentTestRunHistory("", "");
  const sessionsQuery = useWidgetSessions({ limit: 1 });
  const { data: widgetConfigData, isLoading } = widgetConfigQuery;
  const saveWidgetConfigMutation = useSaveWidgetConfig();
  const publishWidgetConfigMutation = usePublishWidgetConfig();
  const saveWidgetConfig = saveWidgetConfigMutation.mutateAsync;
  const publication = widgetConfigData?.publication;
  const hasLocalDraftChanges = Object.keys(configOverrides).length > 0;
  const isSavingDraft = saveWidgetConfigMutation.isPending || hasLocalDraftChanges;
  const draftStatus = saveWidgetConfigMutation.isPending
    ? "Saving draft…"
    : saveWidgetConfigMutation.isError
      ? "Draft not saved"
      : hasLocalDraftChanges
        ? "Unsaved draft changes"
        : publication?.current
          ? publication.hasUnpublishedChanges
            ? `Draft saved · published v${publication.current.version}`
            : `Published · v${publication.current.version}`
          : "Draft saved · not published";
  const canPublishChanges =
    canManage &&
    Boolean(publication?.hasUnpublishedChanges) &&
    !isSavingDraft &&
    !publishWidgetConfigMutation.isPending;

  const tryPreviewPrompt = useCallback((prompt: string) => {
    setPreviewEvidence(null);
    setPreviewTestFailed(false);
    setLastPreviewPrompt(prompt);
    setSendingTestPrompt(prompt);
    setShowMobilePreview(true);
    return waitForPreviewWidget(prompt)
      .then((evidence) => {
        setPreviewTestFailed(evidence === null);
        if (window.matchMedia("(max-width: 1023px)").matches) {
          window.requestAnimationFrame(() =>
            mobileTestResultRef.current?.focus({ preventScroll: true }),
          );
        }
        return evidence;
      })
      .finally(() => setSendingTestPrompt(null));
  }, []);

  const resetPreview = useCallback(async () => {
    setPreviewEvidence(null);
    setPreviewTestFailed(false);
    setLastPreviewPrompt(null);
    try {
      return Boolean(await window.Widget?.resetPreview?.());
    } catch {
      return false;
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

  const handleTabChange = (value: string | number) => {
    if (typeof value !== "string" || !AGENT_TABS.includes(value as AgentTab)) return;
    setActiveTab(value as AgentTab);
    if (window.location.hash.replace(/^#/, "") !== value) {
      window.history.replaceState(null, "", agentHref(value));
    }
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

  if (widgetConfigQuery.isError && !widgetConfigData) {
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

  const publishChanges = async (restoreVersion?: number) => {
    if (!activeWorkspaceId) return;
    setPublicationError(null);
    try {
      await publishWidgetConfigMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        ...(restoreVersion ? { restoreVersion } : {}),
      });
    } catch (error: unknown) {
      setPublicationError(
        error instanceof Error ? error.message : "Couldn't publish these agent changes.",
      );
    }
  };

  const sources = knowledgeSourcesQuery.data?.sources ?? [];
  const readySourcesCount = sources.filter((s) => s.status === "ready").length;
  const processingSourcesCount = sources.filter((s) => s.status === "processing").length;
  const testCasesCount = testCasesQuery.data?.cases?.length ?? 0;
  const hasTestRun = Boolean(testRunsQuery.data?.hasAnyRuns);
  const hasObservedSession = Boolean(
    sessionsQuery.data?.pagination?.total && sessionsQuery.data.pagination.total > 0,
  );

  const launchChecklist = getAgentLaunchChecklist({
    readySourcesCount,
    processingSourcesCount,
    testCasesCount,
    hasTestRun,
    isEnabled: config.isEnabled,
    hasPublishedVersion: Boolean(publication?.current),
    hasUnpublishedChanges: Boolean(publication?.hasUnpublishedChanges),
    authorizedDomainCount: config.allowedDomains.length,
    hasObservedSession,
    isSavingConfiguration: isSavingDraft,
  });

  const launchReadiness = getAgentPublicationReadiness({
    isEnabled: config.isEnabled,
    hasPublishedVersion: Boolean(publication?.current),
    hasUnpublishedChanges: Boolean(publication?.hasUnpublishedChanges),
    authorizedDomainCount: config.allowedDomains.length,
    isSavingConfiguration: isSavingDraft,
  });

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
      {widgetConfigQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3"
        >
          <p className="text-sm text-muted-foreground">
            Agent settings couldn’t refresh. Showing the last loaded settings.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void widgetConfigQuery.refetch()}
            disabled={widgetConfigQuery.isFetching}
          >
            {widgetConfigQuery.isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {APP_PAGES.agent.label}
        </h1>
        <button
          type="button"
          onClick={() => setShowMobilePreview((open) => !open)}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-xs transition-[transform,color,background-color] duration-150 active:scale-[0.96] hover:bg-muted hover:text-foreground motion-reduce:transition-none motion-reduce:active:scale-100 lg:hidden",
            showMobilePreview && "border-[var(--widget-accent)] text-[var(--widget-accent)]",
          )}
          aria-label={
            showMobilePreview && activeTab === "test"
              ? "Return to test scenarios"
              : showMobilePreview
                ? "Hide preview"
                : "Show preview"
          }
          aria-pressed={showMobilePreview}
        >
          <Eye className="size-4" strokeWidth={2} />
          {showMobilePreview && activeTab === "test" ? "Back to tests" : "Preview"}
        </button>
        <output
          className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground"
          aria-live="polite"
          aria-busy={isSavingDraft || publishWidgetConfigMutation.isPending}
        >
          <span>{draftStatus}</span>
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
        {canManage ? (
          <Button
            id="agent-publish"
            type="button"
            className="min-h-10 rounded-lg"
            disabled={!canPublishChanges}
            onClick={() => publishChanges()}
          >
            {publishWidgetConfigMutation.isPending &&
            !publishWidgetConfigMutation.variables?.restoreVersion
              ? "Publishing…"
              : publication?.current
                ? "Publish changes"
                : "Publish agent"}
          </Button>
        ) : null}
      </div>
      {canManage && hasLocalDraftChanges && !saveWidgetConfigMutation.isError ? (
        <p className="shrink-0 text-xs text-muted-foreground">
          Draft changes save automatically. Any installed widget continues to use the published
          version until you publish.
        </p>
      ) : null}
      {publicationError ? (
        <p role="alert" className="shrink-0 text-sm text-destructive">
          {publicationError} The published version is unchanged.
        </p>
      ) : null}
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
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-0"
          >
            <TabsList
              variant="line"
              aria-label="Agent workspace tabs"
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
                <section
                  id="knowledge"
                  aria-labelledby="knowledge-heading"
                  className="scroll-mt-4 space-y-3"
                >
                  <div>
                    <h2 id="knowledge-heading" className="text-base font-semibold tracking-tight">
                      Knowledge sources
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Give your agent trusted information to use when answering customers.
                    </p>
                  </div>
                  <WidgetKnowledgeManager canManage={canManage} />
                </section>
              </TabsContent>

              <TabsContent value="test" keepMounted={false}>
                <WidgetTestPanel
                  escalationKeywords={config.escalationKeywords}
                  suggestions={config.suggestions}
                  evidence={previewEvidence}
                  sendingPrompt={sendingTestPrompt}
                  canManage={canManage}
                  onTryPrompt={tryPreviewPrompt}
                  onResetPreview={resetPreview}
                />
              </TabsContent>

              <TabsContent value="deploy" keepMounted={false} className="space-y-8">
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
                <WidgetInstallationPanel
                  readiness={launchReadiness}
                  launchChecklist={launchChecklist}
                  onNavigateTab={(tab) => handleTabChange(tab)}
                  onReadinessAction={(action) => {
                    if (action === "resume") updateConfig("isEnabled", true);
                    if (action === "publish") {
                      setActiveTab("build");
                      window.requestAnimationFrame(() => {
                        document.getElementById("agent-publish")?.focus({ preventScroll: true });
                      });
                    }
                  }}
                  isEnabled={config.isEnabled}
                  currentPublication={publication?.current ?? null}
                  allowedDomains={config.allowedDomains}
                  domainInput={domainInput}
                  copied={copied}
                  embedScript={generateScript()}
                  onDomainInputChange={setDomainInput}
                  onAddDomain={handleAddDomain}
                  onRemoveDomain={handleRemoveDomain}
                  onCopyScript={copyScript}
                  onEnabledChange={(value) => updateConfig("isEnabled", value)}
                  canManage={canManage}
                />
                <WidgetVersionHistory
                  versions={publication?.versions ?? []}
                  currentVersion={publication?.current?.version ?? null}
                  canManage={canManage}
                  restoringVersion={
                    publishWidgetConfigMutation.isPending
                      ? (publishWidgetConfigMutation.variables?.restoreVersion ?? null)
                      : null
                  }
                  onRestore={publishChanges}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div
          className={cn(
            WIDGET_CARD_CLASS,
            "flex min-h-0 w-full shrink-0 flex-col",
            showMobilePreview && activeTab === "test"
              ? "flex-1 overflow-y-auto lg:overflow-hidden lg:h-full lg:w-[380px] xl:w-[420px]"
              : showMobilePreview
                ? "h-[min(70vh,520px)] flex-1 overflow-hidden lg:h-full lg:w-[380px] xl:w-[420px]"
                : "hidden overflow-hidden lg:flex lg:h-full lg:w-[380px] xl:w-[420px]",
          )}
        >
          <div
            className={cn(
              "min-h-0 flex-1",
              showMobilePreview && activeTab === "test"
                ? "h-[min(58vh,460px)] min-h-[320px] shrink-0 lg:h-full lg:min-h-0 lg:shrink"
                : "h-full",
            )}
          >
            <WidgetPreviewPanel
              liveConfig={liveConfig}
              testMode={activeTab === "test"}
              onEvidenceChange={setPreviewEvidence}
            />
          </div>
          {showMobilePreview && activeTab === "test" ? (
            <section
              ref={mobileTestResultRef}
              tabIndex={-1}
              aria-labelledby="mobile-latest-test-result"
              aria-live="polite"
              aria-busy={sendingTestPrompt !== null}
              className="shrink-0 border-t border-border/60 bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:hidden"
            >
              <h2 id="mobile-latest-test-result" className="text-sm font-semibold">
                Latest test result
              </h2>
              {sendingTestPrompt ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Checking “{sendingTestPrompt}”…
                </p>
              ) : previewTestFailed ? (
                <div
                  role="alert"
                  className="mt-1 flex flex-wrap items-center justify-between gap-2"
                >
                  <p className="text-sm text-destructive">
                    No result arrived. Check the preview and model connection, then retry.
                  </p>
                  {lastPreviewPrompt ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10"
                      onClick={() => void tryPreviewPrompt(lastPreviewPrompt)}
                    >
                      Retry test
                    </Button>
                  ) : null}
                </div>
              ) : previewEvidence ? (
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-foreground">
                    {previewEvidence.outcome === "handoff"
                      ? "A handoff rule matched."
                      : previewEvidence.outcome === "error"
                        ? "The agent could not complete this test."
                        : previewEvidence.grounded && previewEvidence.sources.length > 0
                          ? "Knowledge sources were retrieved."
                          : "No matching knowledge source was found."}
                  </p>
                  {previewEvidence.sources.length > 0 ? (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {previewEvidence.sources.map((source) => (
                        <li key={source.title} className="break-words">
                          {source.title}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Send a message in the preview to review its sources or handoff result.
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
