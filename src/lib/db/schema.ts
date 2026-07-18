import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { BRAND_COLOR } from "@/lib/widget-accent";

const timestampString = () => timestamp({ mode: "string", withTimezone: true });
const numeric = timestampString;

export const user = pgTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().default(false).notNull(),
    image: text(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [uniqueIndex("user_email_key").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
    token: text().notNull(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_key").on(table.token),
    index("session_userId_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey().notNull(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ mode: "date", withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ mode: "date", withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
    createdAt: timestamp({ mode: "date", withTimezone: true })
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspace = pgTable(
  "workspace",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    brandColor: text().default(BRAND_COLOR).notNull(),
    timezone: text().default("UTC").notNull(),
    createdAt: timestampString()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: timestampString().notNull(),
  },
  (table) => [uniqueIndex("workspace_slug_key").on(table.slug)],
);

export const workspaceMember = pgTable(
  "workspace_member",
  {
    id: text().primaryKey().notNull(),
    role: text().default("MEMBER").notNull(),
    createdAt: timestampString()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: timestampString().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("workspace_member_userId_workspaceId_key").on(table.userId, table.workspaceId),
    index("workspace_member_workspaceId_idx").on(table.workspaceId),
  ],
);

export const contact = pgTable(
  "contact",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text(),
    phone: text(),
    source: text().default("WIDGET").notNull(),
    capturedAt: numeric(),
    captureContext: text().default("{}").notNull(),
    externalId: text(),
    avatarUrl: text(),
    tags: text().default("[]").notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
    lastSeenAt: numeric(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("contact_workspaceId_externalId_key").on(table.workspaceId, table.externalId),
    uniqueIndex("contact_workspaceId_email_key").on(table.workspaceId, table.email),
    index("contact_workspaceId_updatedAt_idx").on(table.workspaceId, table.updatedAt),
  ],
);

export const contactNote = pgTable(
  "contact_note",
  {
    id: text().primaryKey().notNull(),
    body: text().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    contactId: text()
      .notNull()
      .references(() => contact.id, { onDelete: "cascade", onUpdate: "cascade" }),
    authorUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("contact_note_authorUserId_idx").on(table.authorUserId),
    index("contact_note_contactId_createdAt_idx").on(table.contactId, table.createdAt),
  ],
);

export const conversation = pgTable(
  "conversation",
  {
    id: text().primaryKey().notNull(),
    subject: text().notNull(),
    status: text().default("OPEN").notNull(),
    channel: text().default("WIDGET").notNull(),
    externalThreadId: text(),
    aiPaused: boolean().default(false).notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
    lastMessageAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    messages: text().default("[]").notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    contactId: text()
      .notNull()
      .references(() => contact.id, { onDelete: "cascade", onUpdate: "cascade" }),
    assignedMemberId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    widgetId: text().references(() => widget.id, { onDelete: "set null", onUpdate: "cascade" }),
    visitorSessionId: text().references(() => visitorSession.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    index("conversation_visitorSessionId_idx").on(table.visitorSessionId),
    index("conversation_widgetId_idx").on(table.widgetId),
    index("conversation_assignedMemberId_idx").on(table.assignedMemberId),
    index("conversation_workspaceId_contactId_idx").on(table.workspaceId, table.contactId),
    uniqueIndex("conversation_workspaceId_channel_externalThreadId_key").on(
      table.workspaceId,
      table.channel,
      table.externalThreadId,
    ),
    index("conversation_workspaceId_status_lastMessageAt_idx").on(
      table.workspaceId,
      table.status,
      table.lastMessageAt,
    ),
  ],
);

export const widget = pgTable(
  "widget",
  {
    id: text().primaryKey().notNull(),
    publicKey: text().notNull(),
    displayName: text().default("Support").notNull(),
    welcomeMessage: text().default("Hi! How can we help?").notNull(),
    inputPlaceholder: text().default("Ask a question…").notNull(),
    primaryColor: text().default(BRAND_COLOR).notNull(),
    backgroundColor: text().default("#ffffff").notNull(),
    textColor: text().default("#171717").notNull(),
    borderColor: text().default("#EAECF0").notNull(),
    fontFamily: text().default("Inter").notNull(),
    fontSize: text().default("14px").notNull(),
    position: text().default("bottom-right").notNull(),
    launcherSize: text().default("md").notNull(),
    panelWidth: integer().default(380).notNull(),
    panelHeight: integer().default(640).notNull(),
    borderRadius: integer().default(20).notNull(),
    borderRadiusStyle: text().default("default").notNull(),
    logoUrl: text(),
    instructions: text()
      .default(
        "Answer clearly and only use information you know is reliable. If you are unsure, say so.",
      )
      .notNull(),
    escalationKeywords: text().default("human,agent,person,representative,support team").notNull(),
    modelProvider: text().default("OPENAI").notNull(),
    modelName: text().default("gpt-4o-mini").notNull(),
    bookingEnabled: boolean().default(false).notNull(),
    bookingTimezone: text().default("UTC").notNull(),
    bookingDurationMinutes: integer().default(30).notNull(),
    bookingMinimumNoticeMinutes: integer().default(60).notNull(),
    bookingWorkingHours: text()
      .default('{"start":"09:00","end":"17:00","weekdays":[1,2,3,4,5]}')
      .notNull(),
    isEnabled: boolean().default(true).notNull(),
    theme: text().default("light").notNull(),
    userBubbleColor: text().default(BRAND_COLOR).notNull(),
    userBubbleTextColor: text().default("#ffffff").notNull(),
    botBubbleColor: text().default("#f2f2f8").notNull(),
    botBubbleTextColor: text().default("#171717").notNull(),
    headerGradientFrom: text().default(BRAND_COLOR).notNull(),
    headerGradientTo: text().default(BRAND_COLOR).notNull(),
    shadowSize: text().default("md").notNull(),
    suggestions: text()
      .default(
        '["What services do you offer?","How can I get started?","Tell me more about pricing"]',
      )
      .notNull(),
    hideSuggestionsOnInteract: boolean().default(true).notNull(),
    previewMessages: text().default('["Hi there! 👋","Need help with anything?"]').notNull(),
    autoShowPreviewDelay: integer().default(3000).notNull(),
    showBranding: boolean().default(true).notNull(),
    privacyPolicyUrl: text().default("/privacy-policy").notNull(),
    enableLeadCapture: boolean().default(false).notNull(),
    leadCaptureKeywords: text()
      .default('["contact","contact me","call me","reach me","get in touch"]')
      .notNull(),
    leadCaptureMinutesThreshold: integer().default(5).notNull(),
    leadCaptureMessageThreshold: integer().default(4).notNull(),
    enableBrochure: boolean().default(false).notNull(),
    brochureSuggestionText: text().default("Receive Brochure").notNull(),
    authorizedDomains: text().default("[]").notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("widget_workspaceId_key").on(table.workspaceId),
    uniqueIndex("widget_publicKey_key").on(table.publicKey),
  ],
);

export const visitorSession = pgTable(
  "visitor_session",
  {
    id: text().primaryKey().notNull(),
    token: text().notNull(),
    browserSessionId: text(),
    visitorId: text(),
    hostname: text().notNull(),
    externalId: text(),
    pageUrl: text(),
    referrer: text(),
    browser: text(),
    deviceType: text(),
    os: text(),
    country: text(),
    city: text(),
    timezone: text(),
    language: text(),
    screenSize: text(),
    ipData: text(),
    status: text().default("active").notNull(),
    messageCount: integer().default(0).notNull(),
    name: text(),
    email: text(),
    phone: text(),
    leadCapturedAt: numeric(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
    lastSeenAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    expiresAt: numeric().notNull(),
    widgetId: text()
      .notNull()
      .references(() => widget.id, { onDelete: "cascade", onUpdate: "cascade" }),
    contactId: text().references(() => contact.id, { onDelete: "set null", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("visitor_session_widgetId_browserSessionId_key").on(
      table.widgetId,
      table.browserSessionId,
    ),
    index("visitor_session_contactId_idx").on(table.contactId),
    index("visitor_session_widgetId_visitorId_idx").on(table.widgetId, table.visitorId),
    index("visitor_session_widgetId_lastSeenAt_idx").on(table.widgetId, table.lastSeenAt),
    uniqueIndex("visitor_session_token_key").on(table.token),
  ],
);

export const attachment = pgTable(
  "attachment",
  {
    id: text().primaryKey().notNull(),
    filename: text().notNull(),
    mimeType: text().notNull(),
    size: integer().notNull(),
    storageKey: text().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    conversationId: text()
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("attachment_conversationId_idx").on(table.conversationId),
    index("attachment_workspaceId_idx").on(table.workspaceId),
    uniqueIndex("attachment_storageKey_key").on(table.storageKey),
  ],
);

export const document = pgTable(
  "document",
  {
    id: text().primaryKey().notNull(),
    title: text().notNull(),
    sourceType: text().notNull(),
    sourceUrl: text(),
    storageKey: text(),
    mimeType: text(),
    status: text().default("PROCESSING").notNull(),
    errorMessage: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("document_workspaceId_status_updatedAt_idx").on(
      table.workspaceId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const documentChunk = pgTable(
  "document_chunk",
  {
    id: text().primaryKey().notNull(),
    content: text().notNull(),
    position: integer().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    documentId: text()
      .notNull()
      .references(() => document.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [index("document_chunk_documentId_position_idx").on(table.documentId, table.position)],
);

export const workspaceInvite = pgTable(
  "workspace_invite",
  {
    id: text().primaryKey().notNull(),
    email: text().notNull(),
    role: text().default("MEMBER").notNull(),
    token: text().notNull(),
    expiresAt: numeric().notNull(),
    acceptedAt: numeric(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("workspace_invite_workspaceId_email_key").on(table.workspaceId, table.email),
    index("workspace_invite_token_idx").on(table.token),
    uniqueIndex("workspace_invite_token_key").on(table.token),
  ],
);

export const integration = pgTable(
  "integration",
  {
    id: text().primaryKey().notNull(),
    provider: text().notNull(),
    status: text().default("DISCONNECTED").notNull(),
    displayName: text(),
    connectedAccountId: text(),
    externalAccountId: text(),
    toolkitVersion: text(),
    config: text().default("{}").notNull(),
    credentials: text(),
    lastHealthCheckAt: numeric(),
    lastError: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("integration_workspaceId_provider_key").on(table.workspaceId, table.provider),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: text().primaryKey().notNull(),
    type: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    readAt: numeric(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("notification_workspaceId_createdAt_idx").on(table.workspaceId, table.createdAt),
    index("notification_userId_readAt_createdAt_idx").on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
  ],
);

export const domainEvent = pgTable(
  "domain_event",
  {
    id: text().primaryKey().notNull(),
    type: text().notNull(),
    entityId: text(),
    payload: text().default("{}").notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("domain_event_workspaceId_type_createdAt_idx").on(
      table.workspaceId,
      table.type,
      table.createdAt,
    ),
  ],
);

export const workflowRun = pgTable(
  "workflow_run",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    status: text().default("RUNNING").notNull(),
    idempotencyKey: text(),
    input: text().default("{}").notNull(),
    output: text(),
    errorMessage: text(),
    attempts: integer().default(0).notNull(),
    maxAttempts: integer().default(3).notNull(),
    startedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    finishedAt: numeric(),
    conversationId: text().references(() => conversation.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("workflow_run_workspaceId_status_startedAt_idx").on(
      table.workspaceId,
      table.status,
      table.startedAt,
    ),
    uniqueIndex("workflow_run_workspaceId_idempotencyKey_key").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
  ],
);

export const agentRun = pgTable(
  "agent_run",
  {
    id: text().primaryKey().notNull(),
    status: text().default("RUNNING").notNull(),
    trigger: text().notNull(),
    modelProvider: text().notNull(),
    modelName: text().notNull(),
    channel: text().notNull(),
    runtimeContext: text().default("{}").notNull(),
    sourceRefs: text().default("[]").notNull(),
    usage: text().default("{}").notNull(),
    inputTokens: integer(),
    outputTokens: integer(),
    totalTokens: integer(),
    latencyMs: integer(),
    finishReason: text(),
    errorMessage: text(),
    startedAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    finishedAt: numeric(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    widgetId: text().references(() => widget.id, { onDelete: "set null", onUpdate: "cascade" }),
    conversationId: text().references(() => conversation.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    contactId: text().references(() => contact.id, { onDelete: "set null", onUpdate: "cascade" }),
    visitorSessionId: text().references(() => visitorSession.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    index("agent_run_workspaceId_status_startedAt_idx").on(
      table.workspaceId,
      table.status,
      table.startedAt,
    ),
    index("agent_run_conversationId_startedAt_idx").on(table.conversationId, table.startedAt),
  ],
);

export const integrationAction = pgTable(
  "integration_action",
  {
    id: text().primaryKey().notNull(),
    provider: text().notNull(),
    actionType: text().notNull(),
    status: text().default("PENDING").notNull(),
    idempotencyKey: text().notNull(),
    payload: text().default("{}").notNull(),
    result: text(),
    errorMessage: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    requestedById: text(),
  },
  (table) => [
    index("integration_action_workspaceId_status_createdAt_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
    uniqueIndex("integration_action_workspaceId_idempotencyKey_key").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
  ],
);

export const workflowStep = pgTable(
  "workflow_step",
  {
    id: text().primaryKey().notNull(),
    position: integer().notNull(),
    name: text().notNull(),
    kind: text().notNull(),
    status: text().default("PENDING").notNull(),
    input: text().default("{}").notNull(),
    output: text(),
    errorMessage: text(),
    startedAt: numeric(),
    finishedAt: numeric(),
    workflowRunId: text()
      .notNull()
      .references(() => workflowRun.id, { onDelete: "cascade", onUpdate: "cascade" }),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("workflow_step_run_position_key").on(table.workflowRunId, table.position),
    index("workflow_step_workspaceId_status_idx").on(table.workspaceId, table.status),
  ],
);

export const approvalRequest = pgTable(
  "approval_request",
  {
    id: text().primaryKey().notNull(),
    status: text().default("PENDING").notNull(),
    actionType: text().notNull(),
    riskLevel: text().default("MEDIUM").notNull(),
    summary: text().notNull(),
    payload: text().default("{}").notNull(),
    tokenHash: text().notNull(),
    expiresAt: numeric().notNull(),
    decidedAt: numeric(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    conversationId: text().references(() => conversation.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    workflowRunId: text().references(() => workflowRun.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    workflowStepId: text().references(() => workflowStep.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    requestedByAgentRunId: text().references(() => agentRun.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    decidedByUserId: text().references(() => user.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("approval_request_tokenHash_key").on(table.tokenHash),
    uniqueIndex("approval_request_workflowStepId_key").on(table.workflowStepId),
    index("approval_request_workspaceId_status_createdAt_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
  ],
);
