const CHANNEL_LABELS: Record<string, string> = {
  WIDGET: "Website widget",
  DISCORD: "Discord",
  GCHAT: "Google Chat",
  SLACK: "Slack",
  TEAMS: "Microsoft Teams",
  WHATSAPP: "WhatsApp",
};

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
