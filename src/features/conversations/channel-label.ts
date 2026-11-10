export const CONVERSATION_CHANNELS = [
  { value: "WIDGET", label: "Website widget" },
  { value: "DISCORD", label: "Discord" },
  { value: "GCHAT", label: "Google Chat" },
  { value: "SLACK", label: "Slack" },
  { value: "TEAMS", label: "Microsoft Teams" },
  { value: "WHATSAPP", label: "WhatsApp" },
] as const;

const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  CONVERSATION_CHANNELS.map((channel) => [channel.value, channel.label]),
);

export function getConversationChannelLabel(channel?: string | null) {
  if (!channel) return "Website widget";
  return (
    CHANNEL_LABELS[channel] ??
    channel
      .toLowerCase()
      .split(/[_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
