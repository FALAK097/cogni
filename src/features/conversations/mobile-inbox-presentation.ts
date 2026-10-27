export type TranscriptMessageAlignment = "incoming" | "outgoing" | "internal";

export function getTranscriptMessageAlignment(
  role: "user" | "assistant",
  isInternal: boolean,
): TranscriptMessageAlignment {
  if (isInternal) return "internal";
  return role === "user" ? "incoming" : "outgoing";
}

export function getTranscriptMessageRowClassName(alignment: TranscriptMessageAlignment) {
  return alignment === "outgoing" ? "flex w-full flex-row justify-end gap-3" : "flex w-full gap-3";
}

export function canCreateTestFromMessage(role: "user" | "assistant", canManage: boolean) {
  return role === "user" && canManage;
}

export function getReplyContextLabel(displayName: string, channelLabel: string) {
  return `To ${displayName} · ${channelLabel}`;
}
