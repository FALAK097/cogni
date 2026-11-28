import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import * as orm from "drizzle-orm";

import { BRAND_COLOR } from "@/lib/widget-accent";
import type { WidgetPublicationSnapshot } from "@/features/widget/publication";

const { sql } = orm;

const isoNowDefault = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;
const epochMsDefault = sql`(cast((julianday('now') - 2440587.5) * 86400000 as integer))`;

const timestampString = () => text();
const numeric = timestampString;

export const user = sqliteTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: integer({ mode: "boolean" }).default(false).notNull(),
    image: text(),
    createdAt: integer({ mode: "timestamp_ms" }).default(epochMsDefault).notNull(),
    updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("user_email_key").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
    token: text().notNull(),
    createdAt: integer({ mode: "timestamp_ms" }).default(epochMsDefault).notNull(),
    updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
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
    accessTokenExpiresAt: integer({ mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer({ mode: "timestamp_ms" }),
    scope: text(),
    password: text(),
    createdAt: integer({ mode: "timestamp_ms" }).default(epochMsDefault).notNull(),
    updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
    createdAt: integer({ mode: "timestamp_ms" }).default(epochMsDefault).notNull(),
    updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
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
    brandColor: text().default(BRAND_COLOR).notNull(),
    timezone: text().default("UTC").notNull(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    updatedAt: timestampString().notNull(),
  },
  (table) => [uniqueIndex("workspace_slug_key").on(table.slug)],
);

export const workspaceMember = sqliteTable(
  "workspace_member",
  {
    id: text().primaryKey().notNull(),
    role: text().default("MEMBER").notNull(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
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

export const contact = sqliteTable(
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
    createdAt: numeric().default(isoNowDefault).notNull(),
    updatedAt: numeric().notNull(),
    lastSeenAt: numeric(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("contact_workspaceId_id_key").on(table.workspaceId, table.id),
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
    createdAt: numeric().default(isoNowDefault).notNull(),
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
    snoozedUntil: timestampString(),
    channel: text().default("WIDGET").notNull(),
    externalThreadId: text(),
    aiPaused: integer({ mode: "boolean" }).default(false).notNull(),
    createdAt: numeric().default(isoNowDefault).notNull(),
    updatedAt: numeric().notNull(),
    lastMessageAt: numeric().default(isoNowDefault).notNull(),
    messages: text().default("[]").notNull(),
    labels: text().default("[]").notNull(),
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
    uniqueIndex("conversation_workspaceId_id_key").on(table.workspaceId, table.id),
    index("conversation_workspaceId_status_lastMessageAt_idx").on(
      table.workspaceId,
      table.status,
      table.lastMessageAt,
    ),
    index("conversation_workspaceId_snoozedUntil_idx").on(table.workspaceId, table.snoozedUntil),
    index("conversation_workspaceId_lastMessageAt_id_idx").on(
      table.workspaceId,
      table.lastMessageAt,
      table.id,
    ),
  ],
);

export const conversationQaState = sqliteTable(
  "conversation_qa_state",
  {
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    conversationId: text().notNull(),
    version: integer().default(1).notNull(),
    lastObservedMessageAt: timestampString(),
    nextEligibleAt: timestampString(),
    updatedAt: timestampString().default(isoNowDefault).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.conversationId] }),
    foreignKey({
      columns: [table.workspaceId, table.conversationId],
      foreignColumns: [conversation.workspaceId, conversation.id],
      name: "conversation_qa_state_workspace_conversation_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    check("conversation_qa_state_version_check", sql`${table.version} > 0`),
  ],
);

/** Stores only bounded evaluator labels and usage; never transcript or evaluator prose. */
export const conversationQaEvaluation = sqliteTable(
  "conversation_qa_evaluation",
  {
    id: text().primaryKey().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    conversationId: text().notNull(),
    version: integer().notNull(),
    status: text().default("QUEUED").notNull(),
    trigger: text().notNull(),
    publicMessageAt: timestampString().notNull(),
    helpfulness: integer(),
    grounding: integer(),
    sentiment: text(),
    topics: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    escalationOutcome: text(),
    reasonCodes: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    lowScore: integer({ mode: "boolean" }),
    modelProvider: text(),
    modelName: text(),
    inputTokens: integer(),
    outputTokens: integer(),
    errorCode: text(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    completedAt: timestampString(),
  },
  (table) => [
    foreignKey({
      columns: [table.workspaceId, table.conversationId],
      foreignColumns: [conversation.workspaceId, conversation.id],
      name: "conversation_qa_evaluation_workspace_conversation_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    uniqueIndex("conversation_qa_evaluation_workspace_conversation_version_key").on(
      table.workspaceId,
      table.conversationId,
      table.version,
    ),
    index("conversation_qa_evaluation_workspace_createdAt_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("conversation_qa_evaluation_workspace_status_createdAt_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
    check("conversation_qa_evaluation_version_check", sql`${table.version} > 0`),
    check(
      "conversation_qa_evaluation_status_check",
      sql`${table.status} in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'STALE')`,
    ),
    check(
      "conversation_qa_evaluation_trigger_check",
      sql`${table.trigger} in ('CLOSED', 'INACTIVE')`,
    ),
    check(
      "conversation_qa_evaluation_scores_check",
      sql`(${table.helpfulness} is null or ${table.helpfulness} between 1 and 5) and (${table.grounding} is null or ${table.grounding} between 1 and 5)`,
    ),
    check(
      "conversation_qa_evaluation_result_check",
      sql`(${table.status} <> 'COMPLETED' or (${table.helpfulness} is not null and ${table.grounding} is not null and ${table.sentiment} is not null and ${table.escalationOutcome} is not null and ${table.lowScore} in (0, 1) and ${table.lowScore} = (case when ${table.grounding} < 3 or ${table.escalationOutcome} = 'MISSED' or ${table.helpfulness} + ${table.grounding} < 6 then 1 else 0 end)))`,
    ),
    check(
      "conversation_qa_evaluation_sentiment_check",
      sql`${table.sentiment} is null or ${table.sentiment} in ('positive', 'neutral', 'negative', 'mixed')`,
    ),
    check(
      "conversation_qa_evaluation_escalation_check",
      sql`${table.escalationOutcome} is null or ${table.escalationOutcome} in ('NONE', 'RESOLVED', 'PENDING', 'MISSED', 'NOT_APPLICABLE')`,
    ),
    check(
      "conversation_qa_evaluation_topics_check",
      sql`json_valid(${table.topics}) = 1 and json_type(${table.topics}) = 'array' and json_array_length(${table.topics}) <= 3`,
    ),
    check(
      "conversation_qa_evaluation_reason_codes_check",
      sql`json_valid(${table.reasonCodes}) = 1 and json_type(${table.reasonCodes}) = 'array' and json_array_length(${table.reasonCodes}) <= 4`,
    ),
    check(
      "conversation_qa_evaluation_model_check",
      sql`(${table.modelProvider} is null or ${table.modelProvider} in ('OPENAI', 'GOOGLE')) and (${table.modelName} is null or length(${table.modelName}) between 1 and 256)`,
    ),
    check(
      "conversation_qa_evaluation_usage_check",
      sql`(${table.inputTokens} is null or ${table.inputTokens} >= 0) and (${table.outputTokens} is null or ${table.outputTokens} >= 0)`,
    ),
    check(
      "conversation_qa_evaluation_error_code_check",
      sql`${table.errorCode} is null or ${table.errorCode} = 'EVALUATION_FAILED'`,
    ),
  ],
);

export const ticket = sqliteTable(
  "ticket",
  {
    id: text().primaryKey().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    conversationId: text()
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade", onUpdate: "cascade" }),
    contactId: text()
      .notNull()
      .references(() => contact.id, { onDelete: "cascade", onUpdate: "cascade" }),
    title: text().notNull(),
    status: text({ enum: ["OPEN", "PENDING", "RESOLVED"] })
      .default("OPEN")
      .notNull(),
    priority: text({ enum: ["LOW", "NORMAL", "HIGH", "URGENT"] })
      .default("NORMAL")
      .notNull(),
    assignedMemberId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    dueAt: timestampString(),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    updatedAt: timestampString().default(isoNowDefault).notNull(),
  },
  (table) => [
    foreignKey({
      name: "ticket_workspace_conversation_fk",
      columns: [table.workspaceId, table.conversationId],
      foreignColumns: [conversation.workspaceId, conversation.id],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      name: "ticket_workspace_contact_fk",
      columns: [table.workspaceId, table.contactId],
      foreignColumns: [contact.workspaceId, contact.id],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    uniqueIndex("ticket_workspace_conversation_key").on(table.workspaceId, table.conversationId),
    index("ticket_workspace_status_updated_idx").on(
      table.workspaceId,
      table.status,
      table.updatedAt,
    ),
    index("ticket_workspace_assignee_status_idx").on(
      table.workspaceId,
      table.assignedMemberId,
      table.status,
    ),
    index("ticket_workspace_due_idx").on(table.workspaceId, table.dueAt),
    check("ticket_title_check", sql`length(trim(${table.title})) BETWEEN 1 AND 240`),
  ],
);

export const conversationEvent = sqliteTable(
  "conversation_event",
  {
    cursor: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    conversationId: text().notNull(),
    type: text({ enum: ["message", "state", "read"] }).notNull(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
  },
  (table) => [
    check("conversation_event_type_check", sql`${table.type} IN ('message', 'state', 'read')`),
    index("conversation_event_workspaceId_cursor_idx").on(table.workspaceId, table.cursor),
    index("conversation_event_createdAt_idx").on(table.createdAt),
    index("conversation_event_workspaceId_conversationId_cursor_idx").on(
      table.workspaceId,
      table.conversationId,
      table.cursor,
    ),
  ],
);

export const inboxSavedView = sqliteTable(
  "inbox_saved_view",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    filter: text().default("all").notNull(),
    channel: text(),
    assigneeFilter: text().default("all").notNull(),
    labelFilter: text(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    updatedAt: timestampString().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("inbox_saved_view_workspace_name_key").on(
      table.workspaceId,
      sql`lower(${table.name})`,
    ),
    index("inbox_saved_view_workspace_createdAt_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const inboxMacro = sqliteTable(
  "inbox_macro",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    content: text().notNull(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    updatedAt: timestampString().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("inbox_macro_workspace_name_key").on(table.workspaceId, sql`lower(${table.name})`),
    index("inbox_macro_workspace_createdAt_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const agentTestCase = sqliteTable(
  "agent_test_case",
  {
    id: text().primaryKey().notNull(),
    title: text().notNull(),
    prompt: text().notNull(),
    expectedOutcome: text({ enum: ["grounded_answer", "no_evidence", "human_handoff"] }).notNull(),
    expectedSourceIds: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    updatedAt: timestampString().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("agent_test_case_workspace_id_key").on(table.workspaceId, table.id),
    uniqueIndex("agent_test_case_workspace_title_key").on(
      table.workspaceId,
      sql`lower(${table.title})`,
    ),
    index("agent_test_case_workspace_createdAt_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const agentTestRun = sqliteTable(
  "agent_test_run",
  {
    id: text().primaryKey().notNull(),
    resultDigest: text().notNull(),
    suiteDigest: text(),
    evaluationContext: text({ mode: "json" }).$type<{
      version: 1;
      configFingerprint: string;
      configBasis: "widget-draft-revision-v1";
      modelProvider: "OPENAI" | "GOOGLE";
      modelName: string;
      cases: {
        id: string;
        status: "passed" | "mismatch" | "error" | "not_run";
        caseUpdatedAt: string;
        sources: { documentId: string; revisionId: string | null; revisionNumber: number | null }[];
      }[];
    } | null>(),
    caseCount: integer().notNull(),
    passedCount: integer().notNull(),
    mismatchCount: integer().notNull(),
    errorCount: integer().notNull(),
    notRunCount: integer().notNull(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("agent_test_run_workspace_id_key").on(table.workspaceId, table.id),
    index("agent_test_run_workspace_createdAt_idx").on(table.workspaceId, table.createdAt),
    check(
      "agent_test_run_counts_nonnegative_check",
      sql`${table.caseCount} > 0 and ${table.passedCount} >= 0 and ${table.mismatchCount} >= 0 and ${table.errorCount} >= 0 and ${table.notRunCount} >= 0`,
    ),
    check(
      "agent_test_run_counts_match_check",
      sql`${table.caseCount} = ${table.passedCount} + ${table.mismatchCount} + ${table.errorCount} + ${table.notRunCount}`,
    ),
  ],
);

export const agentTestImprovement = sqliteTable(
  "agent_test_improvement",
  {
    id: text().primaryKey().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    runId: text().notNull(),
    caseId: text().notNull(),
    caseSnapshot: text({ mode: "json" })
      .$type<{
        title: string;
        prompt: string;
        expectedOutcome: "grounded_answer" | "no_evidence" | "human_handoff";
        expectedSourceIds: string[];
      }>()
      .notNull(),
    evaluationReferences: text({ mode: "json" })
      .$type<{
        configBasis: "widget-draft-revision-v1";
        configFingerprint: string;
        modelProvider: "OPENAI" | "GOOGLE";
        modelName: string;
        sources: { documentId: string; revisionId: string | null; revisionNumber: number | null }[];
      }>()
      .notNull(),
    failureSourceIds: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    rationale: text().notNull(),
    status: text({ enum: ["OPEN", "RESOLVED", "DISMISSED"] })
      .default("OPEN")
      .notNull(),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    reviewedByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    reviewedAt: timestampString(),
    reviewNote: text(),
    updatedAt: timestampString().default(isoNowDefault).notNull(),
  },
  (table) => [
    uniqueIndex("agent_test_improvement_workspace_id_key").on(table.workspaceId, table.id),
    foreignKey({
      columns: [table.workspaceId, table.runId],
      foreignColumns: [agentTestRun.workspaceId, agentTestRun.id],
      name: "agent_test_improvement_workspace_run_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    index("agent_test_improvement_workspace_status_createdAt_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
    uniqueIndex("agent_test_improvement_workspace_run_case_key").on(
      table.workspaceId,
      table.runId,
      table.caseId,
    ),
    check(
      "agent_test_improvement_review_state_check",
      sql`(${table.status} = 'OPEN' and ${table.reviewedAt} is null) or (${table.status} <> 'OPEN' and ${table.reviewedAt} is not null)`,
    ),
  ],
);

export const agentTestComparison = sqliteTable(
  "agent_test_comparison",
  {
    id: text().primaryKey().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    improvementId: text().notNull(),
    idempotencyKey: text().notNull(),
    caseSnapshot: text({ mode: "json" })
      .$type<{
        title: string;
        prompt: string;
        expectedOutcome: "grounded_answer" | "no_evidence" | "human_handoff";
        expectedSourceIds: string[];
      }>()
      .notNull(),
    baselineReferences: text({ mode: "json" }).$type<{
      configBasis: "widget-draft-revision-v1";
      configFingerprint: string;
      modelProvider: "OPENAI" | "GOOGLE";
      modelName: string;
      sources: { documentId: string; revisionId: string | null; revisionNumber: number | null }[];
    } | null>(),
    replayReferences: text({ mode: "json" }).$type<{
      configFingerprint: string;
      modelProvider: "OPENAI" | "GOOGLE";
      modelName: string;
      sources: { documentId: string; revisionId: string | null; revisionNumber: number | null }[];
    } | null>(),
    baselineOutcome: text(),
    replayOutcome: text(),
    replayStatus: text(),
    status: text({ enum: ["PENDING", "COMPLETE", "ERROR"] })
      .default("PENDING")
      .notNull(),
    errorCode: text(),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    completedAt: timestampString(),
  },
  (table) => [
    uniqueIndex("agent_test_comparison_workspace_id_key").on(table.workspaceId, table.id),
    uniqueIndex("agent_test_comparison_workspace_idempotency_key").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    foreignKey({
      columns: [table.workspaceId, table.improvementId],
      foreignColumns: [agentTestImprovement.workspaceId, agentTestImprovement.id],
      name: "agent_test_comparison_workspace_improvement_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    index("agent_test_comparison_workspace_createdAt_idx").on(table.workspaceId, table.createdAt),
    check(
      "agent_test_comparison_status_result_check",
      sql`(${table.status} = 'PENDING' and ${table.completedAt} is null) or (${table.status} <> 'PENDING' and ${table.completedAt} is not null)`,
    ),
  ],
);

/** A text-free, owner-created receipt binding full-suite outcomes to exact publish inputs. */
export const agentTestPublishCheck = sqliteTable(
  "agent_test_publish_check",
  {
    id: text().primaryKey().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    widgetId: text()
      .notNull()
      .references(() => widget.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdByMembershipId: text().references(() => workspaceMember.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    suiteDigest: text().notNull(),
    sourceBasisDigest: text().notNull(),
    basePublishedVersion: integer().notNull(),
    candidateFingerprint: text().notNull(),
    baselineRequestDigest: text(),
    candidateRequestDigest: text(),
    baselineReferences: text({ mode: "json" }).$type<{
      configFingerprint: string;
      modelProvider: "OPENAI" | "GOOGLE";
      modelName: string;
      results: {
        caseId: string;
        status: "passed" | "mismatch";
        sources: { documentId: string; revisionId: string; revisionNumber: number }[];
      }[];
    } | null>(),
    candidateReferences: text({ mode: "json" }).$type<{
      configFingerprint: string;
      modelProvider: "OPENAI" | "GOOGLE";
      modelName: string;
      results: {
        caseId: string;
        status: "passed" | "mismatch";
        sources: { documentId: string; revisionId: string; revisionNumber: number }[];
      }[];
    } | null>(),
    status: text({ enum: ["PENDING_BASELINE", "PENDING_DRAFT", "COMPLETE", "ERROR"] }).notNull(),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    completedAt: timestampString(),
  },
  (table) => [
    uniqueIndex("agent_test_publish_check_workspace_id_key").on(table.workspaceId, table.id),
    index("agent_test_publish_check_workspace_createdAt_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    check(
      "agent_test_publish_check_suite_digest_check",
      sql`typeof(${table.suiteDigest}) = 'text' and length(${table.suiteDigest}) = 64 and ${table.suiteDigest} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "agent_test_publish_check_candidate_fingerprint_check",
      sql`typeof(${table.candidateFingerprint}) = 'text' and length(${table.candidateFingerprint}) = 64 and ${table.candidateFingerprint} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "agent_test_publish_check_source_basis_digest_check",
      sql`typeof(${table.sourceBasisDigest}) = 'text' and length(${table.sourceBasisDigest}) = 64 and ${table.sourceBasisDigest} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "agent_test_publish_check_request_digest_check",
      sql`(${table.baselineRequestDigest} is null or (typeof(${table.baselineRequestDigest}) = 'text' and length(${table.baselineRequestDigest}) = 64 and ${table.baselineRequestDigest} not glob '*[^0-9a-f]*')) and (${table.candidateRequestDigest} is null or (typeof(${table.candidateRequestDigest}) = 'text' and length(${table.candidateRequestDigest}) = 64 and ${table.candidateRequestDigest} not glob '*[^0-9a-f]*'))`,
    ),
    check(
      "agent_test_publish_check_version_nonnegative_check",
      sql`${table.basePublishedVersion} >= 0`,
    ),
    check(
      "agent_test_publish_check_result_state_check",
      sql`(${table.status} = 'PENDING_BASELINE' and ${table.baselineReferences} is null and ${table.candidateReferences} is null and ${table.completedAt} is null) or (${table.status} = 'PENDING_DRAFT' and ${table.candidateReferences} is null and ${table.completedAt} is null) or (${table.status} = 'COMPLETE' and ${table.candidateReferences} is not null and ${table.completedAt} is not null) or (${table.status} = 'ERROR' and ${table.completedAt} is not null)`,
    ),
  ],
);

export const knowledgeGapReview = sqliteTable(
  "knowledge_gap_review",
  {
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
    questionHash: text().notNull(),
    status: text({ enum: ["OPEN", "RESOLVED", "IGNORED"] })
      .default("OPEN")
      .notNull(),
    reviewedByUserId: text().references(() => user.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestampString().default(isoNowDefault).notNull(),
    updatedAt: timestampString().default(isoNowDefault).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.questionHash] }),
    check(
      "knowledge_gap_review_questionHash_check",
      sql`typeof(${table.questionHash}) = 'text' and length(${table.questionHash}) = 64 and ${table.questionHash} not glob '*[^0-9a-f]*'`,
    ),
    index("knowledge_gap_review_workspace_status_updatedAt_idx").on(
      table.workspaceId,
      table.status,
      table.updatedAt,
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
    bookingEnabled: integer({ mode: "boolean" }).default(false).notNull(),
    bookingTimezone: text().default("UTC").notNull(),
    bookingDurationMinutes: integer().default(30).notNull(),
    bookingMinimumNoticeMinutes: integer().default(60).notNull(),
    bookingWorkingHours: text()
      .default('{"start":"09:00","end":"17:00","weekdays":[1,2,3,4,5]}')
      .notNull(),
    isEnabled: integer({ mode: "boolean" }).default(true).notNull(),
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
    publishedVersion: integer().default(0).notNull(),
    createdAt: numeric().default(isoNowDefault).notNull(),
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

export const widgetPublication = sqliteTable(
  "widget_publication",
  {
    id: text().primaryKey().notNull(),
    version: integer().notNull(),
    config: text({ mode: "json" }).$type<WidgetPublicationSnapshot>().notNull(),
    publishedAt: timestampString().default(isoNowDefault).notNull(),
    widgetId: text()
      .notNull()
      .references(() => widget.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdByUserId: text().references(() => user.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("widget_publication_widgetId_version_key").on(table.widgetId, table.version),
    index("widget_publication_widgetId_publishedAt_idx").on(table.widgetId, table.publishedAt),
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
    name: text(),
    email: text(),
    phone: text(),
    leadCapturedAt: numeric(),
    createdAt: numeric().default(isoNowDefault).notNull(),
    updatedAt: numeric().notNull(),
    lastSeenAt: numeric().default(isoNowDefault).notNull(),
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

export const attachment = sqliteTable(
  "attachment",
  {
    id: text().primaryKey().notNull(),
    filename: text().notNull(),
    mimeType: text().notNull(),
    size: integer().notNull(),
    storageKey: text().notNull(),
    createdAt: numeric().default(isoNowDefault).notNull(),
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
    createdAt: numeric().default(isoNowDefault).notNull(),
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

/**
 * Content identities for successfully indexed knowledge sources. This table intentionally keeps
 * documentId as an opaque value instead of a foreign key: deleting a source removes its content,
 * but retains a minimal tombstone so later evaluations can report that a cited revision was
 * deleted. No source text, URL, filename, or provider response is stored here.
 */
export const documentRevision = sqliteTable(
  "document_revision",
  {
    id: text().primaryKey().notNull(),
    documentId: text().notNull(),
    revisionNumber: integer().notNull(),
    contentSha256: text().notNull(),
    sourceType: text().notNull(),
    providerItemId: text(),
    providerItemKey: text(),
    status: text().default("CURRENT").notNull(),
    createdAt: numeric().default(isoNowDefault).notNull(),
    retiredAt: numeric(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    uniqueIndex("document_revision_workspace_document_number_key").on(
      table.workspaceId,
      table.documentId,
      table.revisionNumber,
    ),
    uniqueIndex("document_revision_current_key")
      .on(table.workspaceId, table.documentId)
      .where(sql`${table.status} = 'CURRENT'`),
    index("document_revision_workspace_document_createdAt_idx").on(
      table.workspaceId,
      table.documentId,
      table.createdAt,
    ),
    check("document_revision_number_positive_check", sql`${table.revisionNumber} > 0`),
    check(
      "document_revision_hash_sha256_check",
      sql`typeof(${table.contentSha256}) = 'text' and length(${table.contentSha256}) = 64 and ${table.contentSha256} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "document_revision_status_check",
      sql`${table.status} in ('CURRENT', 'SUPERSEDED', 'DELETED')`,
    ),
  ],
);

/** Retryable provider erasure records; these contain item identity only, never indexed content. */
export const searchItemCleanup = sqliteTable(
  "search_item_cleanup",
  {
    id: text().primaryKey().notNull(),
    itemId: text(),
    itemKey: text().notNull(),
    documentId: text().notNull(),
    attempts: integer().default(0).notNull(),
    nextAttemptAt: numeric().default(isoNowDefault).notNull(),
    claimedUntil: numeric(),
    createdAt: numeric().default(isoNowDefault).notNull(),
    updatedAt: numeric().notNull(),
    workspaceId: text()
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    index("search_item_cleanup_due_idx").on(table.nextAttemptAt, table.claimedUntil),
    index("search_item_cleanup_workspace_due_idx").on(
      table.workspaceId,
      table.nextAttemptAt,
      table.claimedUntil,
    ),
  ],
);

export const documentChunk = sqliteTable(
  "document_chunk",
  {
    id: text().primaryKey().notNull(),
    content: text().notNull(),
    position: integer().notNull(),
    createdAt: numeric().default(isoNowDefault).notNull(),
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
    createdAt: numeric().default(isoNowDefault).notNull(),
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
    connectedAccountId: text(),
    externalAccountId: text(),
    toolkitVersion: text(),
    config: text().default("{}").notNull(),
    credentials: text(),
    lastHealthCheckAt: numeric(),
    lastError: text(),
    createdAt: numeric().default(isoNowDefault).notNull(),
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
    createdAt: numeric().default(isoNowDefault).notNull(),
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
    createdAt: numeric().default(isoNowDefault).notNull(),
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
    leaseToken: text(),
    leaseExpiresAt: numeric(),
    startedAt: numeric().default(isoNowDefault).notNull(),
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

export const agentRun = sqliteTable(
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
    startedAt: numeric().default(isoNowDefault).notNull(),
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
    createdAt: numeric().default(isoNowDefault).notNull(),
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

export const workflowStep = sqliteTable(
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

export const approvalRequest = sqliteTable(
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
    createdAt: numeric().default(isoNowDefault).notNull(),
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

export const rateLimitBucket = sqliteTable(
  "rate_limit_bucket",
  {
    keyHash: text().primaryKey().notNull(),
    count: integer().notNull(),
    resetAt: timestampString().notNull(),
  },
  (table) => [index("rate_limit_bucket_resetAt_idx").on(table.resetAt)],
);

export const documentLock = sqliteTable(
  "document_lock",
  {
    lockKey: text().primaryKey().notNull(),
    ownerToken: text().notNull(),
    expiresAt: timestampString().notNull(),
    updatedAt: timestampString().notNull(),
  },
  (table) => [index("document_lock_expiresAt_idx").on(table.expiresAt)],
);

export const chatStateSubscription = sqliteTable(
  "chat_state_subscriptions",
  {
    keyPrefix: text("key_prefix").notNull(),
    threadId: text("thread_id").notNull(),
    createdAt: text("created_at").default(isoNowDefault).notNull(),
  },
  (table) => [primaryKey({ columns: [table.keyPrefix, table.threadId] })],
);

export const chatStateLock = sqliteTable(
  "chat_state_locks",
  {
    keyPrefix: text("key_prefix").notNull(),
    threadId: text("thread_id").notNull(),
    token: text("token").notNull(),
    expiresAt: integer("expires_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.keyPrefix, table.threadId] }),
    index("chat_state_locks_expires_idx").on(table.expiresAt),
  ],
);

export const chatStateCache = sqliteTable(
  "chat_state_cache",
  {
    keyPrefix: text("key_prefix").notNull(),
    cacheKey: text("cache_key").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.keyPrefix, table.cacheKey] }),
    index("chat_state_cache_expires_idx").on(table.expiresAt),
  ],
);

export const chatStateList = sqliteTable(
  "chat_state_lists",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    keyPrefix: text("key_prefix").notNull(),
    listKey: text("list_key").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at"),
  },
  (table) => [
    index("chat_state_lists_key_seq_idx").on(table.keyPrefix, table.listKey, table.seq),
    index("chat_state_lists_expires_idx").on(table.expiresAt),
  ],
);

export const chatStateQueue = sqliteTable(
  "chat_state_queues",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    keyPrefix: text("key_prefix").notNull(),
    threadId: text("thread_id").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("chat_state_queues_key_seq_idx").on(table.keyPrefix, table.threadId, table.seq),
    index("chat_state_queues_expires_idx").on(table.expiresAt),
  ],
);
