export * from "../use-auth";
export * from "./use-campaigns";
export * from "./use-echo";
export * from "./use-integrations";
export * from "./use-knowledge-base";

import { useQuery } from "@tanstack/react-query";

export function useAgent(_agentId: string) {
  return useQuery({ queryKey: ["agent", _agentId], queryFn: async () => null, enabled: false });
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: async () => ({ agents: [] }),
  });
}

export function useLatestChangelog() {
  return useQuery({
    queryKey: ["changelog"],
    queryFn: async () => null,
    enabled: false,
  });
}

export function useWorkspaceNumbers() {
  return useQuery({
    queryKey: ["workspace-numbers"],
    queryFn: async () => ({ numbers: [] }),
  });
}

export function useCloneCampaign() {
  return {
    mutateAsync: async (_campaignId: string) => {
      throw new Error("Clone campaign is not supported.");
    },
    isPending: false,
  };
}

export function useCampaignLeads(_campaignId: string) {
  return useQuery({
    queryKey: ["campaign-leads", _campaignId],
    queryFn: async () => ({
      leads: [],
      pagination: { total: 0, totalPages: 1, totalCount: 0 },
    }),
  });
}

export function useCreateCampaignLead() {
  return { mutateAsync: async () => null, isPending: false };
}

export function useImportCampaignLeads() {
  return { mutateAsync: async () => null, isPending: false };
}

export function useBulkDeleteCampaignLeads() {
  return { mutateAsync: async () => null, isPending: false };
}

export function useInitiateCall() {
  return { mutateAsync: async () => null, isPending: false };
}

export function useCall(_callId: string) {
  return useQuery({ queryKey: ["call", _callId], queryFn: async () => null, enabled: false });
}

export function useRecentCalls() {
  return useQuery({ queryKey: ["recent-calls"], queryFn: async () => ({ calls: [] }) });
}

export function useWhatsAppResponses() {
  return useQuery({ queryKey: ["whatsapp"], queryFn: async () => ({ messages: [] }) });
}
