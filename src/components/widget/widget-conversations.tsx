"use client";

import { useState } from "react";

import { ConversationDetail } from "./conversation-detail";
import { ConversationsList } from "./conversations-list";

interface WidgetConversationsProps {
  initialSessionId?: string | null;
}

export function WidgetConversations({ initialSessionId = null }: WidgetConversationsProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId);

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
