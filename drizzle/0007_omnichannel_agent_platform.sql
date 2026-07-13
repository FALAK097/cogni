CREATE TABLE `approval_request` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`actionType` text NOT NULL,
	`riskLevel` text DEFAULT 'MEDIUM' NOT NULL,
	`summary` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`tokenHash` text NOT NULL,
	`expiresAt` numeric NOT NULL,
	`decidedAt` numeric,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
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
CREATE TABLE `workflow_step` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`input` text DEFAULT '{}' NOT NULL,
	`output` text,
	`errorMessage` text,
	`startedAt` numeric,
	`finishedAt` numeric,
	`workflowRunId` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workflowRunId`) REFERENCES `workflow_run`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_step_run_position_key` ON `workflow_step` (`workflowRunId`,`position`);--> statement-breakpoint
CREATE INDEX `workflow_step_workspaceId_status_idx` ON `workflow_step` (`workspaceId`,`status`);--> statement-breakpoint
DROP TABLE `widget_lead_capture`;--> statement-breakpoint
DROP TABLE `lead`;--> statement-breakpoint
DROP INDEX `integration_action_idempotencyKey_key`;--> statement-breakpoint
CREATE UNIQUE INDEX `integration_action_workspaceId_idempotencyKey_key` ON `integration_action` (`workspaceId`,`idempotencyKey`);--> statement-breakpoint
DROP INDEX `workflow_run_idempotencyKey_key`;--> statement-breakpoint
ALTER TABLE `workflow_run` ADD `conversationId` text REFERENCES conversation(id);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_run_workspaceId_idempotencyKey_key` ON `workflow_run` (`workspaceId`,`idempotencyKey`);--> statement-breakpoint
ALTER TABLE `contact` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `contact` ADD `source` text DEFAULT 'WIDGET' NOT NULL;--> statement-breakpoint
ALTER TABLE `contact` ADD `capturedAt` numeric;--> statement-breakpoint
ALTER TABLE `contact` ADD `captureContext` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversation` ADD `externalThreadId` text;--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_workspaceId_channel_externalThreadId_key` ON `conversation` (`workspaceId`,`channel`,`externalThreadId`);--> statement-breakpoint
ALTER TABLE `integration` ADD `connectedAccountId` text;--> statement-breakpoint
ALTER TABLE `integration` ADD `externalAccountId` text;--> statement-breakpoint
ALTER TABLE `integration` ADD `toolkitVersion` text;--> statement-breakpoint
ALTER TABLE `integration` ADD `config` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `integration` ADD `credentials` text;--> statement-breakpoint
ALTER TABLE `integration` ADD `lastHealthCheckAt` numeric;--> statement-breakpoint
ALTER TABLE `integration` ADD `lastError` text;--> statement-breakpoint
ALTER TABLE `widget` ADD `bookingEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `widget` ADD `bookingTimezone` text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE `widget` ADD `bookingDurationMinutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `widget` ADD `bookingMinimumNoticeMinutes` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `widget` ADD `bookingWorkingHours` text DEFAULT '{"start":"09:00","end":"17:00","weekdays":[1,2,3,4,5]}' NOT NULL;
