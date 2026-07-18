import "server-only";

import { z } from "zod";

export const toolRiskLevels = ["LOW", "MEDIUM", "HIGH"] as const;
export type ToolRiskLevel = (typeof toolRiskLevels)[number];

export const toolProviders = [
  "INTERNAL",
  "RESEND",
  "GMAIL",
  "GOOGLE_CALENDAR",
  "SLACK",
  "WHATSAPP",
  "DISCORD_BOT",
] as const;
export type ToolProvider = (typeof toolProviders)[number];

const conversationIdSchema = z.string().uuid();
const messageSchema = z.string().trim().min(1).max(10_000);

const conversationAssignSchema = z.object({
  conversationId: conversationIdSchema,
  membershipId: z.string().uuid(),
});

const conversationNoteSchema = z.object({
  conversationId: conversationIdSchema,
  message: messageSchema,
});

const conversationStatusSchema = z.object({
  conversationId: conversationIdSchema,
  status: z.enum(["OPEN", "ASSIGNED", "RESOLVED", "CLOSED"]),
});

const conversationAiStateSchema = z.object({
  conversationId: conversationIdSchema,
  paused: z.boolean(),
});

const contactUpdateSchema = z
  .object({
    conversationId: conversationIdSchema,
    name: z.string().trim().min(1).max(120).optional(),
    email: z.email().optional(),
    phone: z.string().trim().min(6).max(30).optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.email !== undefined || value.phone !== undefined,
    { message: "Provide a name, email, or phone number to update." },
  );

const contactTagSchema = z.object({
  conversationId: conversationIdSchema,
  tag: z.string().trim().min(1).max(50),
});

const emailSchema = z.object({
  conversationId: conversationIdSchema,
  to: z.email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(100_000),
});

const calendarAvailabilitySchema = z
  .object({
    conversationId: conversationIdSchema,
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    timezone: z.string().trim().min(1).max(80),
    calendarIds: z.array(z.string().trim().min(1)).min(1).max(10).default(["primary"]),
  })
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    message: "The availability end time must be after the start time.",
  });

const calendarCreateSchema = z
  .object({
    conversationId: conversationIdSchema,
    title: z.string().trim().min(1).max(200),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    attendeeEmail: z.email(),
    timezone: z.string().trim().min(1).max(80),
    description: z.string().trim().max(5_000).optional(),
    createMeetingRoom: z.boolean().default(true),
  })
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    message: "The event end time must be after the start time.",
  });

const slackNotifySchema = z.object({
  conversationId: conversationIdSchema,
  channel: z.string().trim().min(1).max(100),
  message: messageSchema,
  threadId: z.string().trim().min(1).max(100).optional(),
});

const whatsappSendSchema = z.object({
  conversationId: conversationIdSchema,
  phoneNumberId: z.string().trim().min(1).max(100),
  to: z.string().regex(/^\d{7,15}$/, "Use an international phone number without '+'."),
  message: z.string().trim().min(1).max(4_096),
  replyToMessageId: z.string().trim().min(1).max(500).optional(),
});

const whatsappTemplateParameterSchema = z.object({
  type: z.literal("text"),
  text: z.string().trim().min(1).max(1_024),
});

const whatsappTemplateSchema = z.object({
  conversationId: conversationIdSchema,
  phoneNumberId: z.string().trim().min(1).max(100),
  to: z.string().regex(/^\d{7,15}$/, "Use an international phone number without '+'."),
  templateName: z.string().trim().min(1).max(512),
  languageCode: z.string().trim().min(2).max(10).default("en_US"),
  bodyParameters: z.array(whatsappTemplateParameterSchema).max(20).default([]),
});

const discordMessageSchema = z.object({
  conversationId: conversationIdSchema,
  channelId: z.string().trim().regex(/^\d+$/, "Discord channel ID must be numeric."),
  message: z.string().trim().min(1).max(2_000),
  replyToMessageId: z.string().trim().regex(/^\d+$/).optional(),
});

const toolSchemas = {
  "conversation.assign": conversationAssignSchema,
  "conversation.note": conversationNoteSchema,
  "conversation.set_status": conversationStatusSchema,
  "conversation.set_ai_paused": conversationAiStateSchema,
  "contact.update": contactUpdateSchema,
  "contact.add_tag": contactTagSchema,
  "email.send": emailSchema,
  "gmail.create_draft": emailSchema,
  "gmail.send_email": emailSchema,
  "calendar.find_availability": calendarAvailabilitySchema,
  "calendar.create": calendarCreateSchema,
  "slack.notify": slackNotifySchema,
  "whatsapp.send_message": whatsappSendSchema,
  "whatsapp.send_template": whatsappTemplateSchema,
  "discord_bot.send_message": discordMessageSchema,
} as const;

export type ToolActionType = keyof typeof toolSchemas;

export type IntegrationToolDefinition = {
  actionType: ToolActionType;
  provider: ToolProvider;
  label: string;
  description: string;
  riskLevel: ToolRiskLevel;
  requiresConnection: boolean;
  requiresApproval: boolean;
  composioToolSlug: string | null;
  inputSchema: z.ZodType<Record<string, unknown>>;
};

function defineTool(
  definition: Omit<IntegrationToolDefinition, "inputSchema"> & {
    inputSchema: z.ZodType;
  },
): IntegrationToolDefinition {
  return definition as IntegrationToolDefinition;
}

export const integrationTools: IntegrationToolDefinition[] = [
  defineTool({
    actionType: "conversation.assign",
    provider: "INTERNAL",
    label: "Assign conversation",
    description: "Assign this conversation to a workspace teammate.",
    riskLevel: "LOW",
    requiresConnection: false,
    requiresApproval: false,
    composioToolSlug: null,
    inputSchema: conversationAssignSchema,
  }),
  defineTool({
    actionType: "conversation.note",
    provider: "INTERNAL",
    label: "Add internal note",
    description: "Add a private note to the conversation timeline.",
    riskLevel: "LOW",
    requiresConnection: false,
    requiresApproval: false,
    composioToolSlug: null,
    inputSchema: conversationNoteSchema,
  }),
  defineTool({
    actionType: "conversation.set_status",
    provider: "INTERNAL",
    label: "Update conversation status",
    description: "Open, assign, resolve, or close a conversation.",
    riskLevel: "MEDIUM",
    requiresConnection: false,
    requiresApproval: true,
    composioToolSlug: null,
    inputSchema: conversationStatusSchema,
  }),
  defineTool({
    actionType: "conversation.set_ai_paused",
    provider: "INTERNAL",
    label: "Control AI replies",
    description: "Pause or resume automatic AI replies for a conversation.",
    riskLevel: "MEDIUM",
    requiresConnection: false,
    requiresApproval: true,
    composioToolSlug: null,
    inputSchema: conversationAiStateSchema,
  }),
  defineTool({
    actionType: "contact.update",
    provider: "INTERNAL",
    label: "Update contact",
    description: "Update customer identity details.",
    riskLevel: "MEDIUM",
    requiresConnection: false,
    requiresApproval: true,
    composioToolSlug: null,
    inputSchema: contactUpdateSchema,
  }),
  defineTool({
    actionType: "contact.add_tag",
    provider: "INTERNAL",
    label: "Tag contact",
    description: "Add a normalized tag to the customer profile.",
    riskLevel: "LOW",
    requiresConnection: false,
    requiresApproval: false,
    composioToolSlug: null,
    inputSchema: contactTagSchema,
  }),
  defineTool({
    actionType: "email.send",
    provider: "RESEND",
    label: "Send support email",
    description: "Send a customer email through the workspace Resend configuration.",
    riskLevel: "HIGH",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: null,
    inputSchema: emailSchema,
  }),
  defineTool({
    actionType: "gmail.create_draft",
    provider: "GMAIL",
    label: "Create Gmail draft",
    description: "Create an editable Gmail draft for a customer follow-up.",
    riskLevel: "MEDIUM",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: "GMAIL_CREATE_EMAIL_DRAFT",
    inputSchema: emailSchema,
  }),
  defineTool({
    actionType: "gmail.send_email",
    provider: "GMAIL",
    label: "Send Gmail message",
    description: "Send a customer email using the connected Gmail account.",
    riskLevel: "HIGH",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: "GMAIL_SEND_EMAIL",
    inputSchema: emailSchema,
  }),
  defineTool({
    actionType: "calendar.find_availability",
    provider: "GOOGLE_CALENDAR",
    label: "Check calendar availability",
    description: "Read busy periods from connected Google calendars.",
    riskLevel: "LOW",
    requiresConnection: true,
    requiresApproval: false,
    composioToolSlug: "GOOGLECALENDAR_FIND_FREE_SLOTS",
    inputSchema: calendarAvailabilitySchema,
  }),
  defineTool({
    actionType: "calendar.create",
    provider: "GOOGLE_CALENDAR",
    label: "Create meeting",
    description: "Create a Google Calendar event and optionally a Meet room.",
    riskLevel: "HIGH",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: "GOOGLECALENDAR_CREATE_EVENT",
    inputSchema: calendarCreateSchema,
  }),
  defineTool({
    actionType: "slack.notify",
    provider: "SLACK",
    label: "Notify Slack",
    description: "Post a workspace notification to Slack.",
    riskLevel: "MEDIUM",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: "SLACK_SEND_MESSAGE",
    inputSchema: slackNotifySchema,
  }),
  defineTool({
    actionType: "whatsapp.send_message",
    provider: "WHATSAPP",
    label: "Send WhatsApp message",
    description: "Send a text message inside WhatsApp's customer-service window.",
    riskLevel: "HIGH",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: "WHATSAPP_SEND_MESSAGE",
    inputSchema: whatsappSendSchema,
  }),
  defineTool({
    actionType: "whatsapp.send_template",
    provider: "WHATSAPP",
    label: "Send WhatsApp template",
    description: "Send an approved WhatsApp template outside the customer-service window.",
    riskLevel: "HIGH",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: "WHATSAPP_SEND_TEMPLATE_MESSAGE",
    inputSchema: whatsappTemplateSchema,
  }),
  defineTool({
    actionType: "discord_bot.send_message",
    provider: "DISCORD_BOT",
    label: "Send Discord message",
    description: "Post a message through the connected Discord Bot without triggering mentions.",
    riskLevel: "HIGH",
    requiresConnection: true,
    requiresApproval: true,
    composioToolSlug: "DISCORDBOT_CREATE_MESSAGE",
    inputSchema: discordMessageSchema,
  }),
];

export function getIntegrationTool(actionType: string) {
  return integrationTools.find((tool) => tool.actionType === actionType) ?? null;
}

export function parseToolInput(actionType: string, input: unknown) {
  const tool = getIntegrationTool(actionType);
  if (!tool) throw new Error("Unknown tool action.");
  return { tool, input: tool.inputSchema.parse(input) };
}

export function toComposioArguments(actionType: ToolActionType, input: Record<string, unknown>) {
  if (actionType === "calendar.find_availability") {
    return {
      time_min: input.startAt,
      time_max: input.endAt,
      timezone: input.timezone,
      items: input.calendarIds,
    };
  }
  if (actionType === "calendar.create") {
    return {
      summary: input.title,
      start_datetime: input.startAt,
      end_datetime: input.endAt,
      timezone: input.timezone,
      attendees: [input.attendeeEmail],
      description: input.description,
      create_meeting_room: input.createMeetingRoom,
      calendar_id: "primary",
      send_updates: "all",
    };
  }
  if (actionType === "gmail.create_draft" || actionType === "gmail.send_email") {
    return {
      recipient_email: input.to,
      subject: input.subject,
      body: input.text,
      is_html: false,
      user_id: "me",
    };
  }
  if (actionType === "slack.notify") {
    return { channel: input.channel, markdown_text: input.message, thread_ts: input.threadId };
  }
  if (actionType === "whatsapp.send_message") {
    return {
      phone_number_id: input.phoneNumberId,
      to_number: input.to,
      text: input.message,
      message_id: input.replyToMessageId,
      preview_url: false,
    };
  }
  if (actionType === "whatsapp.send_template") {
    const parameters = input.bodyParameters as Array<Record<string, unknown>>;
    return {
      phone_number_id: input.phoneNumberId,
      to_number: input.to,
      template_name: input.templateName,
      language_code: input.languageCode,
      components: parameters.length > 0 ? [{ type: "body", parameters }] : [],
    };
  }
  if (actionType === "discord_bot.send_message") {
    return {
      channel_id: input.channelId,
      content: input.message,
      allowed_mentions: { parse: [] },
      message_reference: input.replyToMessageId
        ? {
            message_id: input.replyToMessageId,
            channel_id: input.channelId,
            fail_if_not_exists: false,
          }
        : null,
    };
  }
  throw new Error(`${actionType} is not a Composio tool.`);
}
