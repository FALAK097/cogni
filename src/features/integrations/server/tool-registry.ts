import "server-only";

import { z } from "zod";

const conversationAssignSchema = z.object({
  conversationId: z.string().min(1),
  membershipId: z.string().min(1),
});

const conversationNoteSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(10_000),
});

const contactUpdateSchema = z
  .object({
    conversationId: z.string().min(1),
    name: z.string().trim().min(1).max(120).optional(),
    email: z.email().optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: "Provide a name or email to update.",
  });

const emailSendSchema = z.object({
  conversationId: z.string().min(1),
  to: z.email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(100_000),
});

const calendarCreateSchema = z.object({
  conversationId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  attendeeEmail: z.email(),
  timezone: z.string().trim().min(1).max(80),
});

const slackNotifySchema = z.object({
  conversationId: z.string().min(1),
  channel: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(10_000),
});

const toolSchemas = {
  "conversation.assign": conversationAssignSchema,
  "conversation.note": conversationNoteSchema,
  "contact.update": contactUpdateSchema,
  "email.send": emailSendSchema,
  "calendar.create": calendarCreateSchema,
  "slack.notify": slackNotifySchema,
} as const;

export type ToolActionType = keyof typeof toolSchemas;

export type IntegrationToolDefinition = {
  actionType: ToolActionType;
  provider: "INTERNAL" | "RESEND" | "GOOGLE_CALENDAR" | "SLACK";
  label: string;
  description: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  requiresConnection: boolean;
  inputSchema: z.ZodType;
};

export const integrationTools: IntegrationToolDefinition[] = [
  {
    actionType: "conversation.assign",
    provider: "INTERNAL",
    label: "Assign conversation",
    description: "Assign this conversation to a workspace teammate.",
    riskLevel: "LOW",
    requiresConnection: false,
    inputSchema: conversationAssignSchema,
  },
  {
    actionType: "conversation.note",
    provider: "INTERNAL",
    label: "Add internal note",
    description: "Add a private note to the conversation timeline.",
    riskLevel: "LOW",
    requiresConnection: false,
    inputSchema: conversationNoteSchema,
  },
  {
    actionType: "contact.update",
    provider: "INTERNAL",
    label: "Update contact",
    description: "Update customer identity details.",
    riskLevel: "MEDIUM",
    requiresConnection: false,
    inputSchema: contactUpdateSchema,
  },
  {
    actionType: "email.send",
    provider: "RESEND",
    label: "Send email",
    description: "Send a customer email through Resend.",
    riskLevel: "HIGH",
    requiresConnection: true,
    inputSchema: emailSendSchema,
  },
  {
    actionType: "calendar.create",
    provider: "GOOGLE_CALENDAR",
    label: "Create meeting",
    description: "Schedule a calendar event through Composio.",
    riskLevel: "HIGH",
    requiresConnection: true,
    inputSchema: calendarCreateSchema,
  },
  {
    actionType: "slack.notify",
    provider: "SLACK",
    label: "Notify Slack",
    description: "Post a workspace notification through Composio.",
    riskLevel: "MEDIUM",
    requiresConnection: true,
    inputSchema: slackNotifySchema,
  },
];

export function getIntegrationTool(actionType: string) {
  return integrationTools.find((tool) => tool.actionType === actionType) ?? null;
}

export function parseToolInput(actionType: string, input: unknown) {
  const tool = getIntegrationTool(actionType);
  if (!tool) throw new Error("Unknown tool action.");
  return { tool, input: tool.inputSchema.parse(input) as Record<string, unknown> };
}
