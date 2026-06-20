"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { api, requireData } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { authClient } from "@/lib/auth/client";

type AuthMeResponse = {
  session?: {
    user?: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
    activeWorkspaceId?: string;
  };
};

export function useAuthMe() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const { data, error } = await api.GET<AuthMeResponse>("/api/auth/me");
      return requireData(data, error, "Failed to load session");
    },
  });
}

export function useActiveWorkspaceId() {
  const { data } = useAuthMe();
  return data?.session?.activeWorkspaceId ?? null;
}

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.list(),
    queryFn: async () => {
      const { data, error } = await api.GET<{ workspaces: Array<{ id: string; name: string }> }>(
        "/api/workspaces",
      );
      return requireData(data, error, "Failed to load workspaces");
    },
  });
}

export function useSwitchWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { data, error } = await api.POST("/api/workspaces/{workspace_id}/switch", {
        params: { path: { workspace_id: workspaceId } },
        body: { workspaceId },
      });
      return requireData(data, error, "Failed to switch workspace");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      router.refresh();
    },
  });
}

export function useCreateWorkspaceWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_body: { name: string }) => {
      throw new Error("Create workspace is not available in this version.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await authClient.signOut();
      return { ok: true };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      router.push("/");
    },
  });
}
