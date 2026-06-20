import { create } from "zustand";

import type { WorkspaceIntegration } from "@/lib/integrations/types";

type TabFilter = "all" | "connected" | "available";

const INTEGRATIONS_ACTIVE_TAB_STORAGE_KEY = "outcaller.integrations.activeTab";
const TAB_FILTERS = new Set<TabFilter>(["all", "connected", "available"]);

const getStoredActiveTab = (): TabFilter => {
  if (typeof window === "undefined") return "all";
  const value = window.localStorage.getItem(INTEGRATIONS_ACTIVE_TAB_STORAGE_KEY);
  return TAB_FILTERS.has(value as TabFilter) ? (value as TabFilter) : "all";
};

const storeActiveTab = (tab: TabFilter) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTEGRATIONS_ACTIVE_TAB_STORAGE_KEY, tab);
};

type IntegrationsStore = {
  // UI state
  selectedSlug: string | null;
  isDetailDrawerOpen: boolean;
  activeTab: TabFilter;
  searchQuery: string;

  // Mocked workspace integrations (until backend wired up)
  workspaceIntegrations: WorkspaceIntegration[];

  // Actions
  openDetail: (slug: string) => void;
  closeDetail: () => void;
  setActiveTab: (tab: TabFilter) => void;
  setSearchQuery: (query: string) => void;
  setWorkspaceIntegrations: (items: WorkspaceIntegration[]) => void;

  // Mocked actions
  connectIntegration: (slug: string) => void;
  disconnectIntegration: (slug: string) => void;
  isConnected: (slug: string) => boolean;
};

export const useIntegrationsStore = create<IntegrationsStore>((set, get) => ({
  selectedSlug: null,
  isDetailDrawerOpen: false,
  activeTab: getStoredActiveTab(),
  searchQuery: "",
  workspaceIntegrations: [
    {
      id: "wi_1",
      integrationId: "google-workspace",
      slug: "google-workspace",
      isConnected: true,
      status: "CONNECTED",
      connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      connectedAccount: "acme@outcaller.ai",
      metadata: { spreadsheet: "OutCallerAI Data", worksheet: "Leads" },
    },
    {
      id: "wi_2",
      integrationId: "whatsapp_business",
      slug: "whatsapp-business",
      isConnected: true,
      status: "CONNECTED",
      connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      connectedAccount: "+1 (555) 123-4567",
    },
  ],

  openDetail: (slug) => set({ selectedSlug: slug, isDetailDrawerOpen: true }),
  closeDetail: () => set({ isDetailDrawerOpen: false }),
  setActiveTab: (tab) => {
    storeActiveTab(tab);
    set({ activeTab: tab });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setWorkspaceIntegrations: (items) => set({ workspaceIntegrations: items }),

  connectIntegration: (slug) => {
    const existing = get().workspaceIntegrations.find((w) => w.slug === slug);
    if (existing) {
      set({
        workspaceIntegrations: get().workspaceIntegrations.map((w) =>
          w.slug === slug
            ? {
                ...w,
                isConnected: true,
                status: "CONNECTED",
                connectedAt: new Date().toISOString(),
              }
            : w,
        ),
      });
    } else {
      set({
        workspaceIntegrations: [
          ...get().workspaceIntegrations,
          {
            id: `wi_${Date.now()}`,
            integrationId: slug,
            slug,
            isConnected: true,
            status: "CONNECTED",
            connectedAt: new Date().toISOString(),
          },
        ],
      });
    }
  },

  disconnectIntegration: (slug) => {
    set({
      workspaceIntegrations: get().workspaceIntegrations.map((w) =>
        w.slug === slug ? { ...w, isConnected: false, status: "DISCONNECTED" } : w,
      ),
    });
  },

  isConnected: (slug) => {
    return get().workspaceIntegrations.some((w) => w.slug === slug && w.isConnected);
  },
}));
