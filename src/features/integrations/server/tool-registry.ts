import "server-only";

export type IntegrationToolDefinition = {
  actionType: string;
  provider: "GMAIL" | "GOOGLE_CALENDAR" | "SLACK";
  label: string;
  description: string;
  requiresConnection: boolean;
};

export const integrationTools: IntegrationToolDefinition[] = [
  {
    actionType: "email.send",
    provider: "GMAIL",
    label: "Send email",
    description: "Send a follow-up email to the contact.",
    requiresConnection: true,
  },
  {
    actionType: "calendar.create",
    provider: "GOOGLE_CALENDAR",
    label: "Create meeting",
    description: "Schedule a calendar event with the contact.",
    requiresConnection: true,
  },
  {
    actionType: "slack.notify",
    provider: "SLACK",
    label: "Notify Slack",
    description: "Post a workspace notification to Slack.",
    requiresConnection: true,
  },
  {
    actionType: "conversation.assign",
    provider: "SLACK",
    label: "Assign conversation",
    description: "Assign this conversation to a teammate.",
    requiresConnection: false,
  },
  {
    actionType: "conversation.note",
    provider: "SLACK",
    label: "Add internal note",
    description: "Add an internal note visible only to teammates.",
    requiresConnection: false,
  },
];

export function getIntegrationTool(actionType: string) {
  return integrationTools.find((tool) => tool.actionType === actionType);
}
