import { getDocsHref } from "@/lib/deployment-urls";
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
      setupGuideUrl: getDocsHref("/integrations/gmail"),
    },
    docsUrl: getDocsHref("/integrations/gmail"),
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
      setupGuideUrl: getDocsHref("/integrations/google-calendar"),
    },
    docsUrl: getDocsHref("/integrations/google-calendar"),
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
      setupGuideUrl: getDocsHref("/integrations/slack"),
    },
    docsUrl: getDocsHref("/integrations/slack"),
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
