"use client";

import { useEffect, useRef } from "react";

import { getBackendOrigin } from "@/lib/api/client";

const WIDGET_SCRIPT_ID = "widget-echo-preview";
const REMOUNT_DEBOUNCE_MS = 300;

type EchoWidgetPreviewConfig = Record<string, unknown> & {
  workspaceId?: string;
  publicKey?: string;
  suggestions?: string[];
  previewMessages?: string[];
};

declare global {
  interface Window {
    Widget?: {
      init: (config: EchoWidgetPreviewConfig) => Promise<void>;
      destroy: () => void;
    };
    OutCallerWidget?: Window["Widget"];
  }
}

function loadWidgetScript(): Promise<void> {
  if (window.Widget?.init) {
    return Promise.resolve();
  }

  const existing = document.getElementById(WIDGET_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "true") {
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

function buildWidgetConfig(config: EchoWidgetPreviewConfig) {
  return {
    ...config,
    apiBaseUrl: getBackendOrigin(),
    publicKey: config.publicKey,
    agentName: config.agentName ?? config.displayName,
    allowedDomains: config.allowedDomains ?? config.authorizedDomains,
    suggestions: (config.suggestions || []).filter((item) => item.trim()),
    previewMessages: (config.previewMessages || []).filter((item) => item.trim()),
  };
}

export function EchoLiveWidgetPreview({
  config,
}: {
  config: EchoWidgetPreviewConfig;
  inboundNumber?: string;
}) {
  const mountedRef = useRef(false);
  const configSnapshotRef = useRef("");

  useEffect(() => {
    const workspaceId = config.workspaceId;
    if (!workspaceId || workspaceId === "your-workspace-id") {
      window.Widget?.destroy?.();
      return;
    }

    const snapshot = JSON.stringify(buildWidgetConfig(config));
    if (snapshot === configSnapshotRef.current && mountedRef.current) {
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

          configSnapshotRef.current = snapshot;
          mountedRef.current = true;
        } catch (error) {
          console.error("Echo preview widget failed to load", error);
        }
      })();
    }, REMOUNT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [config]);

  useEffect(() => {
    return () => {
      window.Widget?.destroy?.();
      mountedRef.current = false;
      configSnapshotRef.current = "";
    };
  }, []);

  return null;
}
