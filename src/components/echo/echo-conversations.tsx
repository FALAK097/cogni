"use client";

import { useEffect, useState } from "react";

import { ConversationDetail } from "./conversation-detail";
import { ConversationsList } from "./conversations-list";

interface EchoConversationsProps {
  initialSessionId?: string | null;
}

export function EchoConversations({ initialSessionId = null }: EchoConversationsProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] overflow-hidden">
      {selectedSessionId ? (
        <ConversationDetail
          sessionId={selectedSessionId}
          onBack={() => setSelectedSessionId(null)}
        />
      ) : (
        <ConversationsList onSelectSession={setSelectedSessionId} />
      )}
    </div>
  );
}
