"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AlertCircle, Loader2, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getBackendOrigin } from "@/lib/api/client";

const WIDGET_SCRIPT_ID = "widget-widget-preview";
const WIDGET_BUNDLE_VERSION = "19";
const REMOUNT_DEBOUNCE_MS = 300;
const CONFIG_SYNC_DEBOUNCE_MS = 50;

export type WidgetLivePreviewConfig = Record<string, unknown> & {
  workspaceId?: string;
  publicKey?: string;
  position?: "bottom-left" | "bottom-right";
  agentName?: string;
  displayName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  userBubbleColor?: string;
  userBubbleTextColor?: string;
  botBubbleColor?: string;
  botBubbleTextColor?: string;
  headerGradientFrom?: string;
  headerGradientTo?: string;
  theme?: string;
  launcherSize?: number | string;
  borderRadius?: number | string;
  shadowSize?: string;
  borderColor?: string;
  fontFamily?: string;
  fontSize?: string;
  suggestions?: string[];
  previewMessages?: string[];
  allowedDomains?: string[];
  authorizedDomains?: string[];
};

export type PreviewMode = "widget" | "full-chat";

declare global {
  interface Window {
    Widget?: {
      init: (config: WidgetLivePreviewConfig) => Promise<void>;
      destroy: () => void;
      updateAppearance: (config: WidgetLivePreviewConfig) => Promise<void>;
      show: () => void;
      hide: () => void;
      open: () => void;
      close: () => void;
      resetPreview: () => Promise<boolean>;
      sendPreviewMessage: (message: string) => Promise<boolean>;
      on: (event: string, listener: (event: Event) => void) => void;
      off: (event: string, listener: (event: Event) => void) => void;
    };
  }
}

function loadWidgetScript(): Promise<void> {
  const bundleUrl = `${window.location.origin}/widget.bundle.js?v=${WIDGET_BUNDLE_VERSION}`;

  const existing = document.getElementById(WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
  if (
    existing?.dataset.loaded === "true" &&
    existing.src.includes(WIDGET_BUNDLE_VERSION) &&
    window.Widget?.init
  ) {
    return Promise.resolve();
  }

  if (existing) {
    existing.remove();
    delete window.Widget;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = WIDGET_SCRIPT_ID;
    script.src = bundleUrl;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load widget"));
    document.body.appendChild(script);
  });
}

function normalizeLogoUrl(logoUrl: unknown): string | null {
  if (typeof logoUrl !== "string") return null;
  const trimmed = logoUrl.trim();
  return trimmed || null;
}

function buildWidgetConfig(config: WidgetLivePreviewConfig): Record<string, unknown> {
  const previewMessages = (config.previewMessages || []).filter((item) => item.trim());

  return {
    ...config,
    preview: true,
    apiBaseUrl: getBackendOrigin(),
    publicKey: config.publicKey,
    agentName: config.agentName ?? config.displayName,
    logoUrl: normalizeLogoUrl(config.logoUrl),
    borderColor: typeof config.borderColor === "string" ? config.borderColor : "#EAECF0",
    fontFamily: typeof config.fontFamily === "string" ? config.fontFamily : "Inter",
    fontSize: typeof config.fontSize === "string" ? config.fontSize : "14px",
    allowedDomains: config.allowedDomains ?? config.authorizedDomains,
    suggestions: (config.suggestions || []).filter((item) => item.trim()),
    previewMessages,
    autoShowPreviewDelay: previewMessages.length > 0 ? 1 : 0,
  };
}

function mountWidgetInHost(host: HTMLElement | null) {
  if (!host) return false;

  const widgetContainer = document.getElementById("widget-container");
  if (!widgetContainer) return false;

  if (widgetContainer.parentElement !== host) {
    host.appendChild(widgetContainer);
  }

  return true;
}

async function syncWidgetConfig(config: Record<string, unknown>) {
  if (!window.Widget?.updateAppearance) return;
  await window.Widget.updateAppearance(config);
}

async function ensureWidgetInitialized(config: Record<string, unknown>) {
  await loadWidgetScript();

  window.Widget?.destroy?.();
  await window.Widget?.init(config);

  if (!document.getElementById("widget-container")) {
    window.Widget?.destroy?.();
    await window.Widget?.init(config);
  }
}

function waitForWidgetContainer() {
  return new Promise<HTMLElement>((resolve) => {
    const existing = document.getElementById("widget-container");
    if (existing) {
      resolve(existing);
      return;
    }

    let attempts = 0;
    const check = () => {
      const container = document.getElementById("widget-container");
      if (container) {
        resolve(container);
        return;
      }

      attempts += 1;
      if (attempts >= 60) {
        throw new Error("Widget preview container was not created");
      }

      window.requestAnimationFrame(check);
    };

    check();
  });
}

export function WidgetLiveWidgetPreview({
  config,
  mountRef,
  previewMode = "widget",
}: {
  config: WidgetLivePreviewConfig;
  mountRef: React.RefObject<HTMLDivElement | null>;
  previewMode?: PreviewMode;
}) {
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">("loading");
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const configSnapshotRef = useRef("");
  const credentialsRef = useRef("");
  const initRunRef = useRef(0);
  const userClosedRef = useRef(false);
  const previewModeRef = useRef(previewMode);

  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);

  const builtConfig = useMemo(() => buildWidgetConfig(config), [config]);
  const configKey = useMemo(() => JSON.stringify(builtConfig), [builtConfig]);

  const openPreview = (force = false) => {
    if (!mountedRef.current || !document.getElementById("widget-container") || !window.Widget) {
      return;
    }

    if (previewModeRef.current === "full-chat") {
      window.Widget.show();
      return;
    }

    if (!force && userClosedRef.current) return;
    window.Widget.show();
  };

  useEffect(() => {
    const host = mountRef.current;
    if (host) {
      host.dataset.position = config.position ?? "bottom-right";
    }
  }, [config.position, mountRef]);

  useEffect(() => {
    const workspaceId = config.workspaceId;
    const publicKey = config.publicKey;
    const credentialsKey = `${workspaceId ?? ""}:${publicKey ?? ""}`;

    if (!workspaceId || !publicKey || workspaceId === "your-workspace-id") {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
      credentialsRef.current = "";
      userClosedRef.current = false;
      setPreviewStatus("error");
      setPreviewError(
        "Your agent preview is not ready yet. Reload the agent settings and try again.",
      );
      return;
    }

    const credentialsChanged = credentialsRef.current !== credentialsKey;
    credentialsRef.current = credentialsKey;

    if (credentialsChanged) {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
    }

    if (mountedRef.current) return;

    const runId = ++initRunRef.current;
    let disposed = false;

    const bootstrap = async () => {
      try {
        setPreviewStatus("loading");
        setPreviewError(null);
        if (!credentialsChanged) {
          userClosedRef.current = false;
        }

        await ensureWidgetInitialized(builtConfig);
        if (disposed || runId !== initRunRef.current) return;

        await waitForWidgetContainer();
        if (disposed || runId !== initRunRef.current) return;

        if (!mountWidgetInHost(mountRef.current)) {
          window.Widget?.destroy?.();
          mountedRef.current = false;
          setPreviewStatus("error");
          setPreviewError("The preview couldn't attach to its panel. Retry to load it again.");
          return;
        }
        mountedRef.current = true;
        configSnapshotRef.current = configKey;
        setPreviewStatus("ready");
        openPreview(true);
      } catch (error) {
        console.error("Widget preview failed to load", error);
        if (disposed || runId !== initRunRef.current) return;
        window.Widget?.destroy?.();
        mountedRef.current = false;
        setPreviewStatus("error");
        setPreviewError("The preview couldn't load. Check your connection and try again.");
      }
    };

    const timer = window.setTimeout(() => {
      void bootstrap();
    }, REMOUNT_DEBOUNCE_MS);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [builtConfig, config.publicKey, config.workspaceId, configKey, mountRef, previewAttempt]);

  useEffect(() => {
    if (!mountedRef.current || !window.Widget?.updateAppearance) return;
    if (configKey === configSnapshotRef.current) return;

    const timer = window.setTimeout(() => {
      void syncWidgetConfig(builtConfig)
        .then(() => {
          configSnapshotRef.current = configKey;
          mountWidgetInHost(mountRef.current);
        })
        .catch((error: unknown) => {
          console.error("Widget preview failed to update", error);
          window.Widget?.destroy?.();
          mountedRef.current = false;
          setPreviewStatus("error");
          setPreviewError("The preview couldn't update. Check your connection and retry.");
        });
    }, CONFIG_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [configKey, builtConfig, mountRef]);

  useEffect(() => {
    if (!mountedRef.current) return;

    if (previewMode === "full-chat") {
      openPreview(true);
      return;
    }

    if (!userClosedRef.current) {
      openPreview(true);
    }
  }, [previewMode]);

  useEffect(() => {
    const syncMount = () => {
      if (!document.getElementById("widget-container")) return;
      mountWidgetInHost(mountRef.current);
    };

    const trackWindowState = () => {
      const windowEl = document.querySelector("#widget-container .oc-window");
      if (!windowEl) return;

      let wasOpen = windowEl.classList.contains("is-open");

      const observer = new MutationObserver(() => {
        const isOpen = windowEl.classList.contains("is-open");
        if (wasOpen && !isOpen) {
          userClosedRef.current = true;
        }
        if (isOpen) {
          userClosedRef.current = false;
        }
        wasOpen = isOpen;
      });

      observer.observe(windowEl, { attributes: true, attributeFilter: ["class"] });
      return observer;
    };

    syncMount();

    const mountObserver = new MutationObserver(syncMount);
    mountObserver.observe(document.body, { childList: true, subtree: true });

    let windowObserver: MutationObserver | undefined;
    const windowStateTimer = window.setInterval(() => {
      if (windowObserver) return;
      windowObserver = trackWindowState();
      if (windowObserver) {
        window.clearInterval(windowStateTimer);
      }
    }, 100);

    const handleWidgetClose = () => {
      userClosedRef.current = true;
    };

    const handleWidgetOpen = () => {
      userClosedRef.current = false;
    };

    window.Widget?.on("close", handleWidgetClose);
    window.Widget?.on("open", handleWidgetOpen);

    return () => {
      mountObserver.disconnect();
      windowObserver?.disconnect();
      window.clearInterval(windowStateTimer);
      window.Widget?.off("close", handleWidgetClose);
      window.Widget?.off("open", handleWidgetOpen);
    };
  }, [mountRef]);

  useEffect(() => {
    return () => {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
      userClosedRef.current = false;
    };
  }, []);

  return previewStatus === "ready" ? null : (
    <div
      role={previewStatus === "error" ? "alert" : "status"}
      aria-live="polite"
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 p-6 text-center backdrop-blur-[2px]"
    >
      <div className="flex max-w-64 flex-col items-center gap-3">
        {previewStatus === "loading" ? (
          <Loader2
            className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <AlertCircle className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {previewStatus === "loading" ? "Loading preview" : "Preview unavailable"}
          </p>
          {previewError ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{previewError}</p>
          ) : null}
        </div>
        {previewStatus === "error" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setPreviewAttempt((attempt) => attempt + 1)}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry preview
          </Button>
        ) : null}
      </div>
    </div>
  );
}
