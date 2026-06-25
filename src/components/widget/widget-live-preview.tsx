"use client";

import { useEffect, useRef } from "react";

import { getBackendOrigin } from "@/lib/api/client";

const WIDGET_SCRIPT_ID = "widget-widget-preview";
const PREVIEW_STYLE_ID = "widget-dashboard-preview-styles";
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

function applyPreviewContainment() {
  let style = document.getElementById(PREVIEW_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = PREVIEW_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
    .widget-preview-host {
      position: relative !important;
      isolation: isolate;
    }

    .widget-preview-host.widget-preview-mode-full-chat #widget-container .oc-preview-container {
      display: none !important;
    }

    .widget-preview-host.widget-preview-mode-widget #widget-container .oc-preview-container {
      pointer-events: auto !important;
    }

    .widget-preview-host #widget-container .oc-body {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }

    .widget-preview-host #widget-container .oc-body::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    /* Full chat — embedded open preview (default on refresh) */
    .widget-preview-host.widget-preview-mode-full-chat #widget-container {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 1 !important;
    }

    .widget-preview-host.widget-preview-mode-full-chat #widget-container .oc-launcher {
      display: none !important;
    }

    .widget-preview-host.widget-preview-mode-full-chat #widget-container .oc-window {
      position: absolute !important;
      inset: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      animation: none !important;
    }

    /* Widget — launcher + popup kept inside preview bounds */
    .widget-preview-host.widget-preview-mode-widget #widget-container {
      position: absolute !important;
      inset: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-end !important;
      align-items: flex-end !important;
      padding: 16px !important;
      gap: 12px !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 1 !important;
      pointer-events: none !important;
    }

    .widget-preview-host.widget-preview-mode-widget[data-position="bottom-left"] #widget-container {
      align-items: flex-start !important;
    }

    .widget-preview-host.widget-preview-mode-widget #widget-container .oc-launcher,
    .widget-preview-host.widget-preview-mode-widget #widget-container .oc-window,
    .widget-preview-host.widget-preview-mode-widget #widget-container .oc-preview-container {
      pointer-events: auto !important;
    }

    .widget-preview-host.widget-preview-mode-widget #widget-container .oc-launcher {
      display: flex !important;
      position: relative !important;
      flex-shrink: 0 !important;
    }

    .widget-preview-host.widget-preview-mode-widget #widget-container .oc-window {
      position: relative !important;
      inset: auto !important;
      bottom: auto !important;
      right: auto !important;
      left: auto !important;
      top: auto !important;
      flex: 1 1 auto !important;
      width: 100% !important;
      max-width: 340px !important;
      min-height: 280px !important;
      height: auto !important;
      max-height: calc(100% - 64px) !important;
      display: none !important;
      animation: none !important;
    }

    .widget-preview-host.widget-preview-mode-widget #widget-container .oc-window.is-open {
      display: flex !important;
      flex-direction: column !important;
    }

    /* Phone — fill the device frame */
    .widget-preview-host[data-device="mobile"] #widget-container,
    .widget-preview-host[data-device="tablet"] #widget-container {
      position: absolute !important;
      inset: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: stretch !important;
      align-items: stretch !important;
      padding: 0 !important;
      gap: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: auto !important;
    }

    .widget-preview-host[data-device="mobile"] #widget-container .oc-launcher,
    .widget-preview-host[data-device="tablet"] #widget-container .oc-launcher {
      display: none !important;
    }

    .widget-preview-host[data-device="mobile"] #widget-container .oc-window,
    .widget-preview-host[data-device="tablet"] #widget-container .oc-window {
      position: relative !important;
      inset: auto !important;
      flex: 1 1 auto !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 0 !important;
      height: 100% !important;
      max-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      border-radius: inherit !important;
      animation: none !important;
    }

    .widget-preview-host[data-device="mobile"] #widget-container .oc-window .oc-header {
      border-radius: 0 !important;
    }
  `;
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
  applyPreviewContainment();
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
      applyPreviewContainment();
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
    applyPreviewContainment();
    mountWidgetInHost(mountRef.current);
    applyPreviewMode(previewMode);
  }, [previewMode, deviceMode, mountRef]);

  useEffect(() => {
    return () => {
      window.Widget?.destroy?.();
      const style = document.getElementById(PREVIEW_STYLE_ID);
      style?.remove();
      mountedRef.current = false;
      configSnapshotRef.current = "";
    };
  }, []);

  return null;
}
