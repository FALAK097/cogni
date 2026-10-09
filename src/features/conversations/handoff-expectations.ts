export type ConversationHandoffStatus = {
  state: "bot" | "queued" | "assigned" | "closed";
  label: string;
  description: string;
  isEscalated: boolean;
  isAiPaused: boolean;
  assigneeName: string | null;
};

export type HandoffBrief = {
  customerIntent: string;
  verifiedDetails: string[];
  sourcesConsulted: string[];
  unresolvedIssue: string;
  recommendedNextStep: string;
};

export function getConversationHandoffStatus(conversation: {
  status?: string | null;
  aiPaused?: boolean | null;
  assigneeName?: string | null;
}): ConversationHandoffStatus {
  if (conversation.status === "CLOSED") {
    return {
      state: "closed",
      label: "Resolved",
      description: "Conversation has been closed.",
      isEscalated: false,
      isAiPaused: Boolean(conversation.aiPaused),
      assigneeName: conversation.assigneeName ?? null,
    };
  }

  const isEscalated = conversation.status === "ESCALATED";
  const isAiPaused = Boolean(conversation.aiPaused);

  if (isEscalated || isAiPaused) {
    if (conversation.assigneeName) {
      return {
        state: "assigned",
        label: `Assigned to ${conversation.assigneeName}`,
        description: `${conversation.assigneeName} is reviewing this conversation. AI replies are paused.`,
        isEscalated,
        isAiPaused,
        assigneeName: conversation.assigneeName,
      };
    }
    return {
      state: "queued",
      label: "Human handoff requested",
      description: "Visitor requested a human teammate. Unassigned in queue.",
      isEscalated,
      isAiPaused,
      assigneeName: null,
    };
  }

  return {
    state: "bot",
    label: "AI agent active",
    description: "AI is responding to visitor inquiries using published knowledge.",
    isEscalated: false,
    isAiPaused: false,
    assigneeName: conversation.assigneeName ?? null,
  };
}

export function generateHandoffBrief(params: {
  firstQuestion?: string | null;
  lastVisitorMessage?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  sources?: string[];
  isAssigned?: boolean;
  assigneeName?: string | null;
}): HandoffBrief {
  const verifiedDetails: string[] = [];
  if (params.visitorName) verifiedDetails.push(`Name: ${params.visitorName}`);
  if (params.visitorEmail) verifiedDetails.push(`Email: ${params.visitorEmail}`);
  if (params.visitorPhone) verifiedDetails.push(`Phone: ${params.visitorPhone}`);

  const customerIntent =
    params.firstQuestion?.trim() || "Inquiry started without specific question";
  const unresolvedIssue =
    params.lastVisitorMessage?.trim() || params.firstQuestion?.trim() || "Awaiting human review";

  const sourcesConsulted = (params.sources ?? []).filter(Boolean);

  let recommendedNextStep = "Assign a teammate to take over this conversation and reply directly.";
  if (params.isAssigned && params.assigneeName) {
    recommendedNextStep = `${params.assigneeName} should review recent messages and provide a direct response.`;
  }

  return {
    customerIntent,
    verifiedDetails,
    sourcesConsulted,
    unresolvedIssue,
    recommendedNextStep,
  };
}

export function formatHandoffBriefAsNote(brief: HandoffBrief): string {
  const lines: string[] = [
    "📋 **Handoff Brief**",
    "",
    `**Customer Intent:** ${brief.customerIntent}`,
  ];

  if (brief.verifiedDetails.length > 0) {
    lines.push(`**Contact Details:** ${brief.verifiedDetails.join(", ")}`);
  }

  if (brief.sourcesConsulted.length > 0) {
    lines.push(`**Sources Consulted:** ${brief.sourcesConsulted.join(", ")}`);
  }

  lines.push(`**Unresolved Issue:** ${brief.unresolvedIssue}`);
  lines.push(`**Recommended Action:** ${brief.recommendedNextStep}`);

  return lines.join("\n");
}
