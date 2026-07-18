import type { IntegrationCategory, IntegrationManifest } from "./types";

export const INTEGRATION_MANIFESTS: IntegrationManifest[] = [
  {
    id: "gmail",
    slug: "gmail",
    name: "Gmail",
    subtitle: "Email",
    description: "Connect Gmail to send email from agent actions and workflows.",
    category: "EMAIL",
    icon: "/assets/icons/gmail.svg",
    auth: { type: "oauth" },
    metadata: {},
    features: ["EMAIL"],
    permissions: ["send_email"],
    content: {
      whatItDoes: ["Send email from approved agent actions."],
      useCases: ["Draft and send follow-up emails."],
    },
  },
  {
    id: "google_calendar",
    slug: "google-calendar",
    name: "Google Calendar",
    subtitle: "Calendar",
    description: "Create and update calendar events from approved agent actions.",
    category: "SCHEDULING",
    icon: "/assets/icons/google-calendar.svg",
    auth: { type: "oauth" },
    metadata: {},
    features: ["CALENDAR"],
    permissions: ["create_events"],
    content: {
      whatItDoes: ["Create and update calendar events."],
      useCases: ["Schedule meetings from conversations."],
    },
  },
  {
    id: "slack",
    slug: "slack",
    name: "Slack",
    subtitle: "Notifications",
    description: "Send workspace notifications to Slack channels.",
    category: "COMMUNICATION",
    icon: "/assets/icons/slack.svg",
    auth: { type: "oauth" },
    metadata: {},
    features: ["NOTIFICATIONS"],
    permissions: ["send_messages"],
    content: {
      whatItDoes: ["Notify your team in Slack."],
      useCases: ["Escalation and assignment alerts."],
    },
  },
  {
    id: "discord_bot",
    slug: "discord-bot",
    name: "Discord Bot",
    subtitle: "Omnichannel bot",
    description: "Install a bot for approved outbound Discord messages and channel replies.",
    category: "COMMUNICATION",
    icon: "/assets/icons/discord.svg",
    auth: { type: "oauth" },
    metadata: {},
    features: ["NOTIFICATIONS"],
    permissions: ["send_messages"],
    content: {
      whatItDoes: ["Send messages through a dedicated Discord bot identity."],
      useCases: ["Community support, incident updates, and team escalation."],
      setupGuideUrl: "https://docs.composio.dev/toolkits/discordbot",
    },
  },
  {
    id: "google_chat",
    slug: "google-chat",
    name: "Google Chat",
    subtitle: "Omnichannel",
    description: "Handle Google Chat messages in the shared Conversations inbox.",
    category: "COMMUNICATION",
    icon: "/assets/icons/google-chat.svg",
    auth: { type: "api_key" },
    metadata: {},
    features: ["NOTIFICATIONS"],
    permissions: ["send_messages"],
    content: {
      whatItDoes: ["Receive and answer Google Chat conversations."],
      useCases: ["Internal support and customer spaces."],
    },
  },
  {
    id: "whatsapp",
    slug: "whatsapp",
    name: "WhatsApp",
    subtitle: "Omnichannel",
    description: "Send approved WhatsApp messages and templates through Cloud API.",
    category: "COMMUNICATION",
    icon: "/assets/icons/whatsapp.svg",
    auth: { type: "api_key" },
    metadata: {},
    features: ["NOTIFICATIONS"],
    permissions: ["send_messages"],
    content: {
      whatItDoes: ["Send session messages and approved templates."],
      useCases: ["Sales and customer support."],
      setupGuideUrl: "https://docs.composio.dev/toolkits/whatsapp",
    },
  },
  {
    id: "microsoft_teams",
    slug: "microsoft-teams",
    name: "Microsoft Teams",
    subtitle: "Omnichannel",
    description: "Route Teams messages into Conversations with Adaptive Card support.",
    category: "COMMUNICATION",
    icon: "/assets/icons/microsoft-teams.svg",
    auth: { type: "oauth" },
    metadata: {},
    features: ["NOTIFICATIONS"],
    permissions: ["send_messages"],
    content: {
      whatItDoes: ["Receive and answer Teams conversations."],
      useCases: ["Workplace support and escalation."],
    },
  },
];

export function getAllIntegrations() {
  return INTEGRATION_MANIFESTS;
}

export function getIntegrationBySlug(slug: string) {
  return INTEGRATION_MANIFESTS.find((integration) => integration.slug === slug) ?? null;
}

export function getIntegrationsByCategory(category: IntegrationCategory) {
  return INTEGRATION_MANIFESTS.filter((integration) => integration.category === category);
}
