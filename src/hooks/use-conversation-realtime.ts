"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

export function useConversationRealtime(conversationId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;
    let stopped = false;

    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(
        `${protocol}//${window.location.host}/api/dashboard/conversations/${conversationId}/realtime`,
      );
      socket.onmessage = () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(conversationId),
        });
      };
      socket.onclose = () => {
        if (!stopped) retryTimer = setTimeout(connect, 2_000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [conversationId, queryClient]);
}
