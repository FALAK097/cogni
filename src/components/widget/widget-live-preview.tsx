"use client";

import { useEffect, useMemo, useRef } from "react";

import { getBackendOrigin } from "@/lib/api/client";

const WIDGET_SCRIPT_ID = "widget-widget-preview";
const WIDGET_BUNDLE_VERSION = "9";
const REMOUNT_DEBOUNCE_MS = 300;

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

function buildWidgetConfig(config: WidgetLivePreviewConfig) {
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

function keepPreviewOpen() {
  window.Widget?.show();
}

function appearanceSnapshot(config: WidgetLivePreviewConfig) {
  const built = buildWidgetConfig(config);
  return JSON.stringify({
    fontFamily: built.fontFamily,
    fontSize: built.fontSize,
    primaryColor: built.primaryColor,
    backgroundColor: built.backgroundColor,
    textColor: built.textColor,
    borderColor: built.borderColor,
    userBubbleColor: built.userBubbleColor,
    userBubbleTextColor: built.userBubbleTextColor,
    botBubbleColor: built.botBubbleColor,
    botBubbleTextColor: built.botBubbleTextColor,
    headerGradientFrom: built.headerGradientFrom,
    headerGradientTo: built.headerGradientTo,
    theme: built.theme,
    position: built.position,
    launcherSize: built.launcherSize,
    borderRadius: built.borderRadius,
    shadowSize: built.shadowSize,
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
  const mountedRef = useRef(false);
  const configSnapshotRef = useRef("");
  const appearanceSnapshotRef = useRef("");
  const previewModeRef = useRef(previewMode);

  previewModeRef.current = previewMode;

  const builtConfig = useMemo(() => buildWidgetConfig(config), [config]);
  const appearanceKey = useMemo(() => appearanceSnapshot(config), [config]);

  useEffect(() => {
    const host = mountRef.current;
    if (host) {
      host.dataset.position = config.position ?? "bottom-right";
    }
  }, [config.position, mountRef]);

  useEffect(() => {
    if (!mountedRef.current || !window.Widget?.updateAppearance) return;
    if (appearanceKey === appearanceSnapshotRef.current) return;

    appearanceSnapshotRef.current = appearanceKey;
    void window.Widget.updateAppearance(builtConfig).then(() => {
      keepPreviewOpen();
    });
  }, [appearanceKey, builtConfig]);

  useEffect(() => {
    const workspaceId = config.workspaceId;
    const publicKey = config.publicKey;
    if (!workspaceId || !publicKey || workspaceId === "your-workspace-id") {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
      appearanceSnapshotRef.current = "";
      return;
    }

    const snapshot = JSON.stringify(builtConfig);

    const finalizeMount = () => {
      if (!mountWidgetInHost(mountRef.current)) return false;
      keepPreviewOpen();
      return true;
    };

    if (snapshot === configSnapshotRef.current && mountedRef.current) {
      finalizeMount();
      return;
    }

    if (mountedRef.current && window.Widget?.updateAppearance) {
      void window.Widget.updateAppearance(builtConfig).then(() => {
        configSnapshotRef.current = snapshot;
        appearanceSnapshotRef.current = appearanceKey;
        finalizeMount();
      });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await loadWidgetScript();
          if (cancelled) return;

          window.Widget?.destroy?.();
          await window.Widget?.init(builtConfig);
          if (cancelled) return;

          let attempts = 0;
          const tryMount = () => {
            if (cancelled) return;
            const mounted = finalizeMount();
            if (!mounted && attempts < 10) {
              attempts += 1;
              requestAnimationFrame(tryMount);
            } else if (mounted) {
              mountedRef.current = true;
              configSnapshotRef.current = snapshot;
              appearanceSnapshotRef.current = appearanceKey;
            }
          };
          tryMount();
        } catch (error) {
          console.error("Widget preview failed to load", error);
        }
      })();
    }, REMOUNT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [builtConfig, appearanceKey, config, mountRef]);

  useEffect(() => {
    if (!document.getElementById("widget-container")) return;
    mountWidgetInHost(mountRef.current);
    keepPreviewOpen();
  }, [previewMode, mountRef]);

  useEffect(() => {
    return () => {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
      appearanceSnapshotRef.current = "";
    };
  }, []);

  return null;
}
