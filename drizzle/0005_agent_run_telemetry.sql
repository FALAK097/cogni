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
	`startedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`finishedAt` numeric,
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
CREATE INDEX `agent_run_conversationId_startedAt_idx` ON `agent_run` (`conversationId`,`startedAt`);