"use client";

import { useEffect, useRef } from "react";

import { getBackendOrigin } from "@/lib/api/client";

const WIDGET_SCRIPT_ID = "widget-widget-preview";
const REMOUNT_DEBOUNCE_MS = 300;

export type WidgetLivePreviewConfig = Record<string, unknown> & {
  workspaceId?: string;
  publicKey?: string;
  position?: "bottom-left" | "bottom-right";
  agentName?: string;
  displayName?: string;
  suggestions?: string[];
  previewMessages?: string[];
  allowedDomains?: string[];
  authorizedDomains?: string[];
};

export type PreviewMode = "widget" | "full-chat";
export type DeviceMode = "desktop" | "tablet" | "mobile";

declare global {
  interface Window {
    Widget?: {
      init: (config: WidgetLivePreviewConfig) => Promise<void>;
      destroy: () => void;
      show: () => void;
      hide: () => void;
      open: () => void;
      close: () => void;
    };
  }
}

function loadWidgetScript(): Promise<void> {
  if (window.Widget?.init) {
    return Promise.resolve();
  }

  const existing = document.getElementById(WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "true" && window.Widget?.init) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = WIDGET_SCRIPT_ID;
    script.src = `${window.location.origin}/widget.bundle.js`;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load widget"));
    document.body.appendChild(script);
  });
}

function buildWidgetConfig(config: WidgetLivePreviewConfig) {
  return {
    ...config,
    preview: true,
    apiBaseUrl: getBackendOrigin(),
    publicKey: config.publicKey,
    agentName: config.agentName ?? config.displayName,
    allowedDomains: config.allowedDomains ?? config.authorizedDomains,
    suggestions: (config.suggestions || []).filter((item) => item.trim()),
    previewMessages: (config.previewMessages || []).filter((item) => item.trim()),
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

function syncOpenState(open: boolean) {
  const windowEl = document.querySelector(".widget-preview-host #widget-container .oc-window");
  const launcher = document.querySelector(".widget-preview-host #widget-container .oc-launcher");
  if (open) {
    window.Widget?.show();
    windowEl?.classList.add("is-open");
    launcher?.classList.add("is-open");
  } else {
    window.Widget?.hide();
    windowEl?.classList.remove("is-open");
    launcher?.classList.remove("is-open");
  }
}

function applyPreviewMode(mode: PreviewMode) {
  if (mode === "full-chat") {
    syncOpenState(true);
    return;
  }

  const windowEl = document.querySelector(".widget-preview-host #widget-container .oc-window");
  if (!windowEl?.classList.contains("is-open")) {
    syncOpenState(true);
  }
}

export function WidgetLiveWidgetPreview({
  config,
  mountRef,
  previewMode = "widget",
  deviceMode = "desktop",
}: {
  config: WidgetLivePreviewConfig;
  mountRef: React.RefObject<HTMLDivElement | null>;
  previewMode?: PreviewMode;
  deviceMode?: DeviceMode;
}) {
  const mountedRef = useRef(false);
  const configSnapshotRef = useRef("");
  const previewModeRef = useRef(previewMode);

  previewModeRef.current = previewMode;

  useEffect(() => {
    const host = mountRef.current;
    if (host) {
      host.dataset.position = config.position ?? "bottom-right";
      host.dataset.device = deviceMode;
    }
  }, [config.position, deviceMode, mountRef]);

  useEffect(() => {
    const workspaceId = config.workspaceId;
    const publicKey = config.publicKey;
    if (!workspaceId || !publicKey || workspaceId === "your-workspace-id") {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
      return;
    }

    const snapshot = JSON.stringify(buildWidgetConfig(config));

    const finalizeMount = () => {
      if (!mountWidgetInHost(mountRef.current)) return false;
      applyPreviewMode(previewModeRef.current);
      return true;
    };

    if (snapshot === configSnapshotRef.current && mountedRef.current) {
      finalizeMount();
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await loadWidgetScript();
          if (cancelled) return;

          window.Widget?.destroy?.();
          await window.Widget?.init(buildWidgetConfig(config));
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
  }, [config, mountRef]);

  useEffect(() => {
    if (!document.getElementById("widget-container")) return;
    mountWidgetInHost(mountRef.current);
    applyPreviewMode(previewMode);
  }, [previewMode, deviceMode, mountRef]);

  useEffect(() => {
    return () => {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
    };
  }, []);

  return null;
}
