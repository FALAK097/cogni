import { sqliteTable, text, numeric, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const user = sqliteTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
    image: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
  },
  (table) => [uniqueIndex("user_email_key").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    expiresAt: numeric().notNull(),
    token: text().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
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

export const account = sqliteTable(
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
    accessTokenExpiresAt: numeric(),
    refreshTokenExpiresAt: numeric(),
    scope: text(),
    password: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: numeric().notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspace = sqliteTable(
  "workspace",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    brandColor: text().default("#14805e").notNull(),
    timezone: text().default("UTC").notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
  },
  (table) => [uniqueIndex("workspace_slug_key").on(table.slug)],
);

export const workspaceMember = sqliteTable(
  "workspace_member",
  {
    id: text().primaryKey().notNull(),
    role: text().default("MEMBER").notNull(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
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

export const contact = sqliteTable(
  "contact",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text(),
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

export const contactNote = sqliteTable(
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

export const conversation = sqliteTable(
  "conversation",
  {
    id: text().primaryKey().notNull(),
    subject: text().notNull(),
    status: text().default("OPEN").notNull(),
    channel: text().default("WIDGET").notNull(),
    aiPaused: integer({ mode: "boolean" }).default(false).notNull(),
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
    index("conversation_workspaceId_status_lastMessageAt_idx").on(
      table.workspaceId,
      table.status,
      table.lastMessageAt,
    ),
  ],
);

export const widget = sqliteTable(
  "widget",
  {
    id: text().primaryKey().notNull(),
    publicKey: text().notNull(),
    displayName: text().default("Support").notNull(),
    welcomeMessage: text().default("Hi! How can we help?").notNull(),
    inputPlaceholder: text().default("Ask a question…").notNull(),
    primaryColor: text().default("#14805e").notNull(),
    backgroundColor: text().default("#ffffff").notNull(),
    textColor: text().default("#171717").notNull(),
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
    modelName: text().default("gpt-5-mini").notNull(),
    isEnabled: integer({ mode: "boolean" }).default(true).notNull(),
    theme: text().default("light").notNull(),
    userBubbleColor: text().default("#14805e").notNull(),
    userBubbleTextColor: text().default("#ffffff").notNull(),
    botBubbleColor: text().default("#f2f2f8").notNull(),
    botBubbleTextColor: text().default("#171717").notNull(),
    headerGradientFrom: text().default("#14805e").notNull(),
    headerGradientTo: text().default("#0f6b4e").notNull(),
    shadowSize: text().default("md").notNull(),
    suggestions: text()
      .default(
        '["What services do you offer?","How can I get started?","Tell me more about pricing"]',
      )
      .notNull(),
    hideSuggestionsOnInteract: integer({ mode: "boolean" }).default(true).notNull(),
    previewMessages: text().default('["Hi there! 👋","Need help with anything?"]').notNull(),
    autoShowPreviewDelay: integer().default(3000).notNull(),
    showBranding: integer({ mode: "boolean" }).default(true).notNull(),
    privacyPolicyUrl: text().default("/privacy-policy").notNull(),
    enableLeadCapture: integer({ mode: "boolean" }).default(false).notNull(),
    leadCaptureKeywords: text()
      .default('["contact","contact me","call me","reach me","get in touch"]')
      .notNull(),
    leadCaptureMinutesThreshold: integer().default(5).notNull(),
    leadCaptureMessageThreshold: integer().default(4).notNull(),
    enableBrochure: integer({ mode: "boolean" }).default(false).notNull(),
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

export const visitorSession = sqliteTable(
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

export const lead = sqliteTable(
  "lead",
  {
    id: text().primaryKey().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    contactId: text().references(() => contact.id, { onDelete: "set null", onUpdate: "cascade" }),
    name: text().notNull(),
    email: text(),
    phone: text(),
    source: text().default("WIDGET").notNull(),
    status: text().default("new").notNull(),
    capturedFromChat: integer({ mode: "boolean" }).default(false).notNull(),
    chatSessionId: text(),
    chatSummary: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
  },
  (table) => [
    index("lead_workspaceId_phone_idx").on(table.workspaceId, table.phone),
    index("lead_workspaceId_email_idx").on(table.workspaceId, table.email),
  ],
);

export const widgetLeadCapture = sqliteTable(
  "widget_lead_capture",
  {
    id: text().primaryKey().notNull(),
    visitorSessionId: text()
      .notNull()
      .references(() => visitorSession.id, { onDelete: "cascade", onUpdate: "cascade" }),
    leadId: text().references(() => lead.id, { onDelete: "set null", onUpdate: "cascade" }),
    triggerType: text().notNull(),
    triggerValue: text(),
    formShownAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    formSubmittedAt: numeric(),
    abandoned: integer({ mode: "boolean" }).default(false).notNull(),
    messageCountAtCapture: integer().default(0).notNull(),
    conversationSummary: text(),
    createdAt: numeric()
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    updatedAt: numeric().notNull(),
  },
  (table) => [
    index("widget_lead_capture_leadId_idx").on(table.leadId),
    uniqueIndex("widget_lead_capture_leadId_key").on(table.leadId),
    uniqueIndex("widget_lead_capture_visitorSessionId_key").on(table.visitorSessionId),
  ],
);

export const attachment = sqliteTable(
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

export const document = sqliteTable(
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

export const documentChunk = sqliteTable(
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

export const workspaceInvite = sqliteTable(
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

export const integration = sqliteTable(
  "integration",
  {
    id: text().primaryKey().notNull(),
    provider: text().notNull(),
    status: text().default("DISCONNECTED").notNull(),
    displayName: text(),
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

export const notification = sqliteTable(
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

export const domainEvent = sqliteTable(
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

export const workflowRun = sqliteTable(
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
    uniqueIndex("workflow_run_idempotencyKey_key").on(table.idempotencyKey),
  ],
);

export const integrationAction = sqliteTable(
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
    uniqueIndex("integration_action_idempotencyKey_key").on(table.idempotencyKey),
  ],
);
