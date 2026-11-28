CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `agent_run` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`trigger` text NOT NULL,
	`modelProvider` text NOT NULL,
	`modelName` text NOT NULL,
	`channel` text NOT NULL,
	`runtimeContext` text DEFAULT '{}' NOT NULL,
	`sourceRefs` text DEFAULT '[]' NOT NULL,
	`usage` text DEFAULT '{}' NOT NULL,
	`inputTokens` integer,
	`outputTokens` integer,
	`totalTokens` integer,
	`latencyMs` integer,
	`finishReason` text,
	`errorMessage` text,
	`startedAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`finishedAt` text,
	`workspaceId` text NOT NULL,
	`widgetId` text,
	`conversationId` text,
	`contactId` text,
	`visitorSessionId` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`widgetId`) REFERENCES `widget`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`visitorSessionId`) REFERENCES `visitor_session`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `agent_run_workspaceId_status_startedAt_idx` ON `agent_run` (`workspaceId`,`status`,`startedAt`);--> statement-breakpoint
CREATE INDEX `agent_run_conversationId_startedAt_idx` ON `agent_run` (`conversationId`,`startedAt`);--> statement-breakpoint
CREATE TABLE `agent_test_case` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`prompt` text NOT NULL,
	`expectedOutcome` text NOT NULL,
	`expectedSourceIds` text DEFAULT '[]' NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	`createdByMembershipId` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_case_workspace_id_key` ON `agent_test_case` (`workspaceId`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_case_workspace_title_key` ON `agent_test_case` (`workspaceId`,lower("title"));--> statement-breakpoint
CREATE INDEX `agent_test_case_workspace_createdAt_idx` ON `agent_test_case` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `agent_test_comparison` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`improvementId` text NOT NULL,
	`idempotencyKey` text NOT NULL,
	`caseSnapshot` text NOT NULL,
	`baselineReferences` text,
	`replayReferences` text,
	`baselineOutcome` text,
	`replayOutcome` text,
	`replayStatus` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`errorCode` text,
	`createdByMembershipId` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`completedAt` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`workspaceId`,`improvementId`) REFERENCES `agent_test_improvement`(`workspaceId`,`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "agent_test_comparison_status_result_check" CHECK(("agent_test_comparison"."status" = 'PENDING' and "agent_test_comparison"."completedAt" is null) or ("agent_test_comparison"."status" <> 'PENDING' and "agent_test_comparison"."completedAt" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_comparison_workspace_id_key` ON `agent_test_comparison` (`workspaceId`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_comparison_workspace_idempotency_key` ON `agent_test_comparison` (`workspaceId`,`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `agent_test_comparison_workspace_createdAt_idx` ON `agent_test_comparison` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `agent_test_improvement` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`runId` text NOT NULL,
	`caseId` text NOT NULL,
	`caseSnapshot` text NOT NULL,
	`evaluationReferences` text NOT NULL,
	`failureSourceIds` text DEFAULT '[]' NOT NULL,
	`rationale` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`createdByMembershipId` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`reviewedByMembershipId` text,
	`reviewedAt` text,
	`reviewNote` text,
	`updatedAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`reviewedByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`workspaceId`,`runId`) REFERENCES `agent_test_run`(`workspaceId`,`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "agent_test_improvement_review_state_check" CHECK(("agent_test_improvement"."status" = 'OPEN' and "agent_test_improvement"."reviewedAt" is null) or ("agent_test_improvement"."status" <> 'OPEN' and "agent_test_improvement"."reviewedAt" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_improvement_workspace_id_key` ON `agent_test_improvement` (`workspaceId`,`id`);--> statement-breakpoint
CREATE INDEX `agent_test_improvement_workspace_status_createdAt_idx` ON `agent_test_improvement` (`workspaceId`,`status`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_improvement_workspace_run_case_key` ON `agent_test_improvement` (`workspaceId`,`runId`,`caseId`);--> statement-breakpoint
CREATE TABLE `agent_test_publish_check` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`widgetId` text NOT NULL,
	`createdByMembershipId` text,
	`suiteDigest` text NOT NULL,
	`sourceBasisDigest` text NOT NULL,
	`basePublishedVersion` integer NOT NULL,
	`candidateFingerprint` text NOT NULL,
	`baselineRequestDigest` text,
	`candidateRequestDigest` text,
	`baselineReferences` text,
	`candidateReferences` text,
	`status` text NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`completedAt` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`widgetId`) REFERENCES `widget`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "agent_test_publish_check_suite_digest_check" CHECK(typeof("agent_test_publish_check"."suiteDigest") = 'text' and length("agent_test_publish_check"."suiteDigest") = 64 and "agent_test_publish_check"."suiteDigest" not glob '*[^0-9a-f]*'),
	CONSTRAINT "agent_test_publish_check_candidate_fingerprint_check" CHECK(typeof("agent_test_publish_check"."candidateFingerprint") = 'text' and length("agent_test_publish_check"."candidateFingerprint") = 64 and "agent_test_publish_check"."candidateFingerprint" not glob '*[^0-9a-f]*'),
	CONSTRAINT "agent_test_publish_check_source_basis_digest_check" CHECK(typeof("agent_test_publish_check"."sourceBasisDigest") = 'text' and length("agent_test_publish_check"."sourceBasisDigest") = 64 and "agent_test_publish_check"."sourceBasisDigest" not glob '*[^0-9a-f]*'),
	CONSTRAINT "agent_test_publish_check_request_digest_check" CHECK(("agent_test_publish_check"."baselineRequestDigest" is null or (typeof("agent_test_publish_check"."baselineRequestDigest") = 'text' and length("agent_test_publish_check"."baselineRequestDigest") = 64 and "agent_test_publish_check"."baselineRequestDigest" not glob '*[^0-9a-f]*')) and ("agent_test_publish_check"."candidateRequestDigest" is null or (typeof("agent_test_publish_check"."candidateRequestDigest") = 'text' and length("agent_test_publish_check"."candidateRequestDigest") = 64 and "agent_test_publish_check"."candidateRequestDigest" not glob '*[^0-9a-f]*'))),
	CONSTRAINT "agent_test_publish_check_version_nonnegative_check" CHECK("agent_test_publish_check"."basePublishedVersion" >= 0),
	CONSTRAINT "agent_test_publish_check_result_state_check" CHECK(("agent_test_publish_check"."status" = 'PENDING_BASELINE' and "agent_test_publish_check"."baselineReferences" is null and "agent_test_publish_check"."candidateReferences" is null and "agent_test_publish_check"."completedAt" is null) or ("agent_test_publish_check"."status" = 'PENDING_DRAFT' and "agent_test_publish_check"."candidateReferences" is null and "agent_test_publish_check"."completedAt" is null) or ("agent_test_publish_check"."status" = 'COMPLETE' and "agent_test_publish_check"."candidateReferences" is not null and "agent_test_publish_check"."completedAt" is not null) or ("agent_test_publish_check"."status" = 'ERROR' and "agent_test_publish_check"."completedAt" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_publish_check_workspace_id_key` ON `agent_test_publish_check` (`workspaceId`,`id`);--> statement-breakpoint
CREATE INDEX `agent_test_publish_check_workspace_createdAt_idx` ON `agent_test_publish_check` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `agent_test_run` (
	`id` text PRIMARY KEY NOT NULL,
	`resultDigest` text NOT NULL,
	`suiteDigest` text,
	`evaluationContext` text,
	`caseCount` integer NOT NULL,
	`passedCount` integer NOT NULL,
	`mismatchCount` integer NOT NULL,
	`errorCount` integer NOT NULL,
	`notRunCount` integer NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`workspaceId` text NOT NULL,
	`createdByMembershipId` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "agent_test_run_counts_nonnegative_check" CHECK("agent_test_run"."caseCount" > 0 and "agent_test_run"."passedCount" >= 0 and "agent_test_run"."mismatchCount" >= 0 and "agent_test_run"."errorCount" >= 0 and "agent_test_run"."notRunCount" >= 0),
	CONSTRAINT "agent_test_run_counts_match_check" CHECK("agent_test_run"."caseCount" = "agent_test_run"."passedCount" + "agent_test_run"."mismatchCount" + "agent_test_run"."errorCount" + "agent_test_run"."notRunCount")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_test_run_workspace_id_key` ON `agent_test_run` (`workspaceId`,`id`);--> statement-breakpoint
CREATE INDEX `agent_test_run_workspace_createdAt_idx` ON `agent_test_run` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `approval_request` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`actionType` text NOT NULL,
	`riskLevel` text DEFAULT 'MEDIUM' NOT NULL,
	`summary` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`tokenHash` text NOT NULL,
	`expiresAt` text NOT NULL,
	`decidedAt` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`workspaceId` text NOT NULL,
	`conversationId` text,
	`workflowRunId` text,
	`workflowStepId` text,
	`requestedByAgentRunId` text,
	`decidedByUserId` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`workflowRunId`) REFERENCES `workflow_run`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workflowStepId`) REFERENCES `workflow_step`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`requestedByAgentRunId`) REFERENCES `agent_run`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`decidedByUserId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approval_request_tokenHash_key` ON `approval_request` (`tokenHash`);--> statement-breakpoint
CREATE UNIQUE INDEX `approval_request_workflowStepId_key` ON `approval_request` (`workflowStepId`);--> statement-breakpoint
CREATE INDEX `approval_request_workspaceId_status_createdAt_idx` ON `approval_request` (`workspaceId`,`status`,`createdAt`);--> statement-breakpoint
CREATE TABLE `attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer NOT NULL,
	`storageKey` text NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`workspaceId` text NOT NULL,
	`conversationId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachment_conversationId_idx` ON `attachment` (`conversationId`);--> statement-breakpoint
CREATE INDEX `attachment_workspaceId_idx` ON `attachment` (`workspaceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `attachment_storageKey_key` ON `attachment` (`storageKey`);--> statement-breakpoint
CREATE TABLE `chat_state_cache` (
	`key_prefix` text NOT NULL,
	`cache_key` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`key_prefix`, `cache_key`)
);
--> statement-breakpoint
CREATE INDEX `chat_state_cache_expires_idx` ON `chat_state_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `chat_state_lists` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_prefix` text NOT NULL,
	`list_key` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE INDEX `chat_state_lists_key_seq_idx` ON `chat_state_lists` (`key_prefix`,`list_key`,`seq`);--> statement-breakpoint
CREATE INDEX `chat_state_lists_expires_idx` ON `chat_state_lists` (`expires_at`);--> statement-breakpoint
CREATE TABLE `chat_state_locks` (
	`key_prefix` text NOT NULL,
	`thread_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`key_prefix`, `thread_id`)
);
--> statement-breakpoint
CREATE INDEX `chat_state_locks_expires_idx` ON `chat_state_locks` (`expires_at`);--> statement-breakpoint
CREATE TABLE `chat_state_queues` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_prefix` text NOT NULL,
	`thread_id` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_state_queues_key_seq_idx` ON `chat_state_queues` (`key_prefix`,`thread_id`,`seq`);--> statement-breakpoint
CREATE INDEX `chat_state_queues_expires_idx` ON `chat_state_queues` (`expires_at`);--> statement-breakpoint
CREATE TABLE `chat_state_subscriptions` (
	`key_prefix` text NOT NULL,
	`thread_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`key_prefix`, `thread_id`)
);
--> statement-breakpoint
CREATE TABLE `contact` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`source` text DEFAULT 'WIDGET' NOT NULL,
	`capturedAt` text,
	`captureContext` text DEFAULT '{}' NOT NULL,
	`externalId` text,
	`avatarUrl` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`lastSeenAt` text,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_workspaceId_id_key` ON `contact` (`workspaceId`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `contact_workspaceId_externalId_key` ON `contact` (`workspaceId`,`externalId`);--> statement-breakpoint
CREATE UNIQUE INDEX `contact_workspaceId_email_key` ON `contact` (`workspaceId`,`email`);--> statement-breakpoint
CREATE INDEX `contact_workspaceId_updatedAt_idx` ON `contact` (`workspaceId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `contact_note` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`contactId` text NOT NULL,
	`authorUserId` text NOT NULL,
	FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`authorUserId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_note_authorUserId_idx` ON `contact_note` (`authorUserId`);--> statement-breakpoint
CREATE INDEX `contact_note_contactId_createdAt_idx` ON `contact_note` (`contactId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`snoozedUntil` text,
	`channel` text DEFAULT 'WIDGET' NOT NULL,
	`externalThreadId` text,
	`aiPaused` integer DEFAULT false NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`lastMessageAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`workspaceId` text NOT NULL,
	`contactId` text NOT NULL,
	`assignedMemberId` text,
	`widgetId` text,
	`visitorSessionId` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`assignedMemberId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`widgetId`) REFERENCES `widget`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`visitorSessionId`) REFERENCES `visitor_session`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `conversation_visitorSessionId_idx` ON `conversation` (`visitorSessionId`);--> statement-breakpoint
CREATE INDEX `conversation_widgetId_idx` ON `conversation` (`widgetId`);--> statement-breakpoint
CREATE INDEX `conversation_assignedMemberId_idx` ON `conversation` (`assignedMemberId`);--> statement-breakpoint
CREATE INDEX `conversation_workspaceId_contactId_idx` ON `conversation` (`workspaceId`,`contactId`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_workspaceId_channel_externalThreadId_key` ON `conversation` (`workspaceId`,`channel`,`externalThreadId`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_workspaceId_id_key` ON `conversation` (`workspaceId`,`id`);--> statement-breakpoint
CREATE INDEX `conversation_workspaceId_status_lastMessageAt_idx` ON `conversation` (`workspaceId`,`status`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `conversation_workspaceId_snoozedUntil_idx` ON `conversation` (`workspaceId`,`snoozedUntil`);--> statement-breakpoint
CREATE INDEX `conversation_workspaceId_lastMessageAt_id_idx` ON `conversation` (`workspaceId`,`lastMessageAt`,`id`);--> statement-breakpoint
CREATE TABLE `conversation_event` (
	`cursor` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspaceId` text NOT NULL,
	`conversationId` text NOT NULL,
	`type` text NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "conversation_event_type_check" CHECK("conversation_event"."type" IN ('message', 'state', 'read'))
);
--> statement-breakpoint
CREATE INDEX `conversation_event_workspaceId_cursor_idx` ON `conversation_event` (`workspaceId`,`cursor`);--> statement-breakpoint
CREATE INDEX `conversation_event_createdAt_idx` ON `conversation_event` (`createdAt`);--> statement-breakpoint
CREATE INDEX `conversation_event_workspaceId_conversationId_cursor_idx` ON `conversation_event` (`workspaceId`,`conversationId`,`cursor`);--> statement-breakpoint
CREATE TABLE `conversation_qa_evaluation` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`conversationId` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`trigger` text NOT NULL,
	`publicMessageAt` text NOT NULL,
	`helpfulness` integer,
	`grounding` integer,
	`sentiment` text,
	`topics` text DEFAULT '[]' NOT NULL,
	`escalationOutcome` text,
	`reasonCodes` text DEFAULT '[]' NOT NULL,
	`lowScore` integer,
	`modelProvider` text,
	`modelName` text,
	`inputTokens` integer,
	`outputTokens` integer,
	`errorCode` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`completedAt` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workspaceId`,`conversationId`) REFERENCES `conversation`(`workspaceId`,`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "conversation_qa_evaluation_version_check" CHECK("conversation_qa_evaluation"."version" > 0),
	CONSTRAINT "conversation_qa_evaluation_status_check" CHECK("conversation_qa_evaluation"."status" in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'STALE')),
	CONSTRAINT "conversation_qa_evaluation_trigger_check" CHECK("conversation_qa_evaluation"."trigger" in ('CLOSED', 'INACTIVE')),
	CONSTRAINT "conversation_qa_evaluation_scores_check" CHECK(("conversation_qa_evaluation"."helpfulness" is null or "conversation_qa_evaluation"."helpfulness" between 1 and 5) and ("conversation_qa_evaluation"."grounding" is null or "conversation_qa_evaluation"."grounding" between 1 and 5)),
	CONSTRAINT "conversation_qa_evaluation_result_check" CHECK(("conversation_qa_evaluation"."status" <> 'COMPLETED' or ("conversation_qa_evaluation"."helpfulness" is not null and "conversation_qa_evaluation"."grounding" is not null and "conversation_qa_evaluation"."sentiment" is not null and "conversation_qa_evaluation"."escalationOutcome" is not null and "conversation_qa_evaluation"."lowScore" in (0, 1) and "conversation_qa_evaluation"."lowScore" = (case when "conversation_qa_evaluation"."grounding" < 3 or "conversation_qa_evaluation"."escalationOutcome" = 'MISSED' or "conversation_qa_evaluation"."helpfulness" + "conversation_qa_evaluation"."grounding" < 6 then 1 else 0 end)))),
	CONSTRAINT "conversation_qa_evaluation_sentiment_check" CHECK("conversation_qa_evaluation"."sentiment" is null or "conversation_qa_evaluation"."sentiment" in ('positive', 'neutral', 'negative', 'mixed')),
	CONSTRAINT "conversation_qa_evaluation_escalation_check" CHECK("conversation_qa_evaluation"."escalationOutcome" is null or "conversation_qa_evaluation"."escalationOutcome" in ('NONE', 'RESOLVED', 'PENDING', 'MISSED', 'NOT_APPLICABLE')),
	CONSTRAINT "conversation_qa_evaluation_topics_check" CHECK(json_valid("conversation_qa_evaluation"."topics") = 1 and json_type("conversation_qa_evaluation"."topics") = 'array' and json_array_length("conversation_qa_evaluation"."topics") <= 3),
	CONSTRAINT "conversation_qa_evaluation_reason_codes_check" CHECK(json_valid("conversation_qa_evaluation"."reasonCodes") = 1 and json_type("conversation_qa_evaluation"."reasonCodes") = 'array' and json_array_length("conversation_qa_evaluation"."reasonCodes") <= 4),
	CONSTRAINT "conversation_qa_evaluation_model_check" CHECK(("conversation_qa_evaluation"."modelProvider" is null or "conversation_qa_evaluation"."modelProvider" in ('OPENAI', 'GOOGLE')) and ("conversation_qa_evaluation"."modelName" is null or length("conversation_qa_evaluation"."modelName") between 1 and 256)),
	CONSTRAINT "conversation_qa_evaluation_usage_check" CHECK(("conversation_qa_evaluation"."inputTokens" is null or "conversation_qa_evaluation"."inputTokens" >= 0) and ("conversation_qa_evaluation"."outputTokens" is null or "conversation_qa_evaluation"."outputTokens" >= 0)),
	CONSTRAINT "conversation_qa_evaluation_error_code_check" CHECK("conversation_qa_evaluation"."errorCode" is null or "conversation_qa_evaluation"."errorCode" = 'EVALUATION_FAILED')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_qa_evaluation_workspace_conversation_version_key` ON `conversation_qa_evaluation` (`workspaceId`,`conversationId`,`version`);--> statement-breakpoint
CREATE INDEX `conversation_qa_evaluation_workspace_createdAt_idx` ON `conversation_qa_evaluation` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversation_qa_evaluation_workspace_status_createdAt_idx` ON `conversation_qa_evaluation` (`workspaceId`,`status`,`createdAt`);--> statement-breakpoint
CREATE TABLE `conversation_qa_state` (
	`workspaceId` text NOT NULL,
	`conversationId` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`lastObservedMessageAt` text,
	`nextEligibleAt` text,
	`updatedAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`workspaceId`, `conversationId`),
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workspaceId`,`conversationId`) REFERENCES `conversation`(`workspaceId`,`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "conversation_qa_state_version_check" CHECK("conversation_qa_state"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceUrl` text,
	`storageKey` text,
	`mimeType` text,
	`status` text DEFAULT 'PROCESSING' NOT NULL,
	`errorMessage` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_workspaceId_status_updatedAt_idx` ON `document` (`workspaceId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `document_chunk` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`position` integer NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`documentId` text NOT NULL,
	FOREIGN KEY (`documentId`) REFERENCES `document`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_chunk_documentId_position_idx` ON `document_chunk` (`documentId`,`position`);--> statement-breakpoint
CREATE TABLE `document_lock` (
	`lockKey` text PRIMARY KEY NOT NULL,
	`ownerToken` text NOT NULL,
	`expiresAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `document_lock_expiresAt_idx` ON `document_lock` (`expiresAt`);--> statement-breakpoint
CREATE TABLE `document_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`documentId` text NOT NULL,
	`revisionNumber` integer NOT NULL,
	`contentSha256` text NOT NULL,
	`sourceType` text NOT NULL,
	`providerItemId` text,
	`providerItemKey` text,
	`status` text DEFAULT 'CURRENT' NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`retiredAt` text,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "document_revision_number_positive_check" CHECK("document_revision"."revisionNumber" > 0),
	CONSTRAINT "document_revision_hash_sha256_check" CHECK(typeof("document_revision"."contentSha256") = 'text' and length("document_revision"."contentSha256") = 64 and "document_revision"."contentSha256" not glob '*[^0-9a-f]*'),
	CONSTRAINT "document_revision_status_check" CHECK("document_revision"."status" in ('CURRENT', 'SUPERSEDED', 'DELETED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_revision_workspace_document_number_key` ON `document_revision` (`workspaceId`,`documentId`,`revisionNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_revision_current_key` ON `document_revision` (`workspaceId`,`documentId`) WHERE "document_revision"."status" = 'CURRENT';--> statement-breakpoint
CREATE INDEX `document_revision_workspace_document_createdAt_idx` ON `document_revision` (`workspaceId`,`documentId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `domain_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`entityId` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_event_workspaceId_type_createdAt_idx` ON `domain_event` (`workspaceId`,`type`,`createdAt`);--> statement-breakpoint
CREATE TABLE `inbox_macro` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	`createdByMembershipId` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbox_macro_workspace_name_key` ON `inbox_macro` (`workspaceId`,lower("name"));--> statement-breakpoint
CREATE INDEX `inbox_macro_workspace_createdAt_idx` ON `inbox_macro` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `inbox_saved_view` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`filter` text DEFAULT 'all' NOT NULL,
	`channel` text,
	`assigneeFilter` text DEFAULT 'all' NOT NULL,
	`labelFilter` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	`createdByMembershipId` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbox_saved_view_workspace_name_key` ON `inbox_saved_view` (`workspaceId`,lower("name"));--> statement-breakpoint
CREATE INDEX `inbox_saved_view_workspace_createdAt_idx` ON `inbox_saved_view` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `integration` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'DISCONNECTED' NOT NULL,
	`displayName` text,
	`connectedAccountId` text,
	`externalAccountId` text,
	`toolkitVersion` text,
	`config` text DEFAULT '{}' NOT NULL,
	`credentials` text,
	`lastHealthCheckAt` text,
	`lastError` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_workspaceId_provider_key` ON `integration` (`workspaceId`,`provider`);--> statement-breakpoint
CREATE TABLE `integration_action` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`actionType` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`idempotencyKey` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`result` text,
	`errorMessage` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	`requestedById` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `integration_action_workspaceId_status_createdAt_idx` ON `integration_action` (`workspaceId`,`status`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `integration_action_workspaceId_idempotencyKey_key` ON `integration_action` (`workspaceId`,`idempotencyKey`);--> statement-breakpoint
CREATE TABLE `knowledge_gap_review` (
	`workspaceId` text NOT NULL,
	`questionHash` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`reviewedByUserId` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`workspaceId`, `questionHash`),
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`reviewedByUserId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "knowledge_gap_review_questionHash_check" CHECK(typeof("knowledge_gap_review"."questionHash") = 'text' and length("knowledge_gap_review"."questionHash") = 64 and "knowledge_gap_review"."questionHash" not glob '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE INDEX `knowledge_gap_review_workspace_status_updatedAt_idx` ON `knowledge_gap_review` (`workspaceId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`readAt` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`workspaceId` text NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_workspaceId_createdAt_idx` ON `notification` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_userId_readAt_createdAt_idx` ON `notification` (`userId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE TABLE `rate_limit_bucket` (
	`keyHash` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`resetAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_bucket_resetAt_idx` ON `rate_limit_bucket` (`resetAt`);--> statement-breakpoint
CREATE TABLE `search_item_cleanup` (
	`id` text PRIMARY KEY NOT NULL,
	`itemId` text,
	`itemKey` text NOT NULL,
	`documentId` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`nextAttemptAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`claimedUntil` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `search_item_cleanup_due_idx` ON `search_item_cleanup` (`nextAttemptAt`,`claimedUntil`);--> statement-breakpoint
CREATE INDEX `search_item_cleanup_workspace_due_idx` ON `search_item_cleanup` (`workspaceId`,`nextAttemptAt`,`claimedUntil`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_key` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `ticket` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`conversationId` text NOT NULL,
	`contactId` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`assignedMemberId` text,
	`dueAt` text,
	`createdByMembershipId` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`assignedMemberId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`createdByMembershipId`) REFERENCES `workspace_member`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`workspaceId`,`conversationId`) REFERENCES `conversation`(`workspaceId`,`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workspaceId`,`contactId`) REFERENCES `contact`(`workspaceId`,`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "ticket_title_check" CHECK(length(trim("ticket"."title")) BETWEEN 1 AND 240)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_workspace_conversation_key` ON `ticket` (`workspaceId`,`conversationId`);--> statement-breakpoint
CREATE INDEX `ticket_workspace_status_updated_idx` ON `ticket` (`workspaceId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `ticket_workspace_assignee_status_idx` ON `ticket` (`workspaceId`,`assignedMemberId`,`status`);--> statement-breakpoint
CREATE INDEX `ticket_workspace_due_idx` ON `ticket` (`workspaceId`,`dueAt`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_key` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `visitor_session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`browserSessionId` text,
	`visitorId` text,
	`hostname` text NOT NULL,
	`externalId` text,
	`pageUrl` text,
	`referrer` text,
	`browser` text,
	`deviceType` text,
	`os` text,
	`country` text,
	`city` text,
	`timezone` text,
	`language` text,
	`screenSize` text,
	`ipData` text,
	`status` text DEFAULT 'active' NOT NULL,
	`messageCount` integer DEFAULT 0 NOT NULL,
	`name` text,
	`email` text,
	`phone` text,
	`leadCapturedAt` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`lastSeenAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`expiresAt` text NOT NULL,
	`widgetId` text NOT NULL,
	`contactId` text,
	FOREIGN KEY (`widgetId`) REFERENCES `widget`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_session_widgetId_browserSessionId_key` ON `visitor_session` (`widgetId`,`browserSessionId`);--> statement-breakpoint
CREATE INDEX `visitor_session_contactId_idx` ON `visitor_session` (`contactId`);--> statement-breakpoint
CREATE INDEX `visitor_session_widgetId_visitorId_idx` ON `visitor_session` (`widgetId`,`visitorId`);--> statement-breakpoint
CREATE INDEX `visitor_session_widgetId_lastSeenAt_idx` ON `visitor_session` (`widgetId`,`lastSeenAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_session_token_key` ON `visitor_session` (`token`);--> statement-breakpoint
CREATE TABLE `widget` (
	`id` text PRIMARY KEY NOT NULL,
	`publicKey` text NOT NULL,
	`displayName` text DEFAULT 'Support' NOT NULL,
	`welcomeMessage` text DEFAULT 'Hi! How can we help?' NOT NULL,
	`inputPlaceholder` text DEFAULT 'Ask a question…' NOT NULL,
	`primaryColor` text DEFAULT '#7c3aed' NOT NULL,
	`backgroundColor` text DEFAULT '#ffffff' NOT NULL,
	`textColor` text DEFAULT '#171717' NOT NULL,
	`borderColor` text DEFAULT '#EAECF0' NOT NULL,
	`fontFamily` text DEFAULT 'Inter' NOT NULL,
	`fontSize` text DEFAULT '14px' NOT NULL,
	`position` text DEFAULT 'bottom-right' NOT NULL,
	`launcherSize` text DEFAULT 'md' NOT NULL,
	`panelWidth` integer DEFAULT 380 NOT NULL,
	`panelHeight` integer DEFAULT 640 NOT NULL,
	`borderRadius` integer DEFAULT 20 NOT NULL,
	`borderRadiusStyle` text DEFAULT 'default' NOT NULL,
	`logoUrl` text,
	`instructions` text DEFAULT 'Answer clearly and only use information you know is reliable. If you are unsure, say so.' NOT NULL,
	`escalationKeywords` text DEFAULT 'human,agent,person,representative,support team' NOT NULL,
	`modelProvider` text DEFAULT 'OPENAI' NOT NULL,
	`modelName` text DEFAULT 'gpt-4o-mini' NOT NULL,
	`bookingEnabled` integer DEFAULT false NOT NULL,
	`bookingTimezone` text DEFAULT 'UTC' NOT NULL,
	`bookingDurationMinutes` integer DEFAULT 30 NOT NULL,
	`bookingMinimumNoticeMinutes` integer DEFAULT 60 NOT NULL,
	`bookingWorkingHours` text DEFAULT '{"start":"09:00","end":"17:00","weekdays":[1,2,3,4,5]}' NOT NULL,
	`isEnabled` integer DEFAULT true NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`userBubbleColor` text DEFAULT '#7c3aed' NOT NULL,
	`userBubbleTextColor` text DEFAULT '#ffffff' NOT NULL,
	`botBubbleColor` text DEFAULT '#f2f2f8' NOT NULL,
	`botBubbleTextColor` text DEFAULT '#171717' NOT NULL,
	`headerGradientFrom` text DEFAULT '#7c3aed' NOT NULL,
	`headerGradientTo` text DEFAULT '#7c3aed' NOT NULL,
	`shadowSize` text DEFAULT 'md' NOT NULL,
	`suggestions` text DEFAULT '["What services do you offer?","How can I get started?","Tell me more about pricing"]' NOT NULL,
	`hideSuggestionsOnInteract` integer DEFAULT true NOT NULL,
	`previewMessages` text DEFAULT '["Hi there! 👋","Need help with anything?"]' NOT NULL,
	`autoShowPreviewDelay` integer DEFAULT 3000 NOT NULL,
	`showBranding` integer DEFAULT true NOT NULL,
	`privacyPolicyUrl` text DEFAULT '/privacy-policy' NOT NULL,
	`enableLeadCapture` integer DEFAULT false NOT NULL,
	`leadCaptureKeywords` text DEFAULT '["contact","contact me","call me","reach me","get in touch"]' NOT NULL,
	`leadCaptureMinutesThreshold` integer DEFAULT 5 NOT NULL,
	`leadCaptureMessageThreshold` integer DEFAULT 4 NOT NULL,
	`enableBrochure` integer DEFAULT false NOT NULL,
	`brochureSuggestionText` text DEFAULT 'Receive Brochure' NOT NULL,
	`authorizedDomains` text DEFAULT '[]' NOT NULL,
	`publishedVersion` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `widget_workspaceId_key` ON `widget` (`workspaceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `widget_publicKey_key` ON `widget` (`publicKey`);--> statement-breakpoint
CREATE TABLE `widget_publication` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`config` text NOT NULL,
	`publishedAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`widgetId` text NOT NULL,
	`createdByUserId` text,
	FOREIGN KEY (`widgetId`) REFERENCES `widget`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `widget_publication_widgetId_version_key` ON `widget_publication` (`widgetId`,`version`);--> statement-breakpoint
CREATE INDEX `widget_publication_widgetId_publishedAt_idx` ON `widget_publication` (`widgetId`,`publishedAt`);--> statement-breakpoint
CREATE TABLE `workflow_run` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`idempotencyKey` text,
	`input` text DEFAULT '{}' NOT NULL,
	`output` text,
	`errorMessage` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`maxAttempts` integer DEFAULT 3 NOT NULL,
	`leaseToken` text,
	`leaseExpiresAt` text,
	`startedAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`finishedAt` text,
	`conversationId` text,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflow_run_workspaceId_status_startedAt_idx` ON `workflow_run` (`workspaceId`,`status`,`startedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_run_workspaceId_idempotencyKey_key` ON `workflow_run` (`workspaceId`,`idempotencyKey`);--> statement-breakpoint
CREATE TABLE `workflow_step` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`input` text DEFAULT '{}' NOT NULL,
	`output` text,
	`errorMessage` text,
	`startedAt` text,
	`finishedAt` text,
	`workflowRunId` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workflowRunId`) REFERENCES `workflow_run`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_step_run_position_key` ON `workflow_step` (`workflowRunId`,`position`);--> statement-breakpoint
CREATE INDEX `workflow_step_workspaceId_status_idx` ON `workflow_step` (`workspaceId`,`status`);--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`brandColor` text DEFAULT '#7c3aed' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_slug_key` ON `workspace` (`slug`);--> statement-breakpoint
CREATE TABLE `workspace_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`token` text NOT NULL,
	`expiresAt` text NOT NULL,
	`acceptedAt` text,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invite_workspaceId_email_key` ON `workspace_invite` (`workspaceId`,`email`);--> statement-breakpoint
CREATE INDEX `workspace_invite_token_idx` ON `workspace_invite` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invite_token_key` ON `workspace_invite` (`token`);--> statement-breakpoint
CREATE TABLE `workspace_member` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`createdAt` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updatedAt` text NOT NULL,
	`userId` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_member_userId_workspaceId_key` ON `workspace_member` (`userId`,`workspaceId`);--> statement-breakpoint
CREATE INDEX `workspace_member_workspaceId_idx` ON `workspace_member` (`workspaceId`);