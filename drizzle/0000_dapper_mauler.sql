CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` numeric,
	`refreshTokenExpiresAt` numeric,
	`scope` text,
	`password` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer NOT NULL,
	`storageKey` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`workspaceId` text NOT NULL,
	`conversationId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`conversationId`) REFERENCES `conversation`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `attachment_conversationId_idx` ON `attachment` (`conversationId`);--> statement-breakpoint
CREATE INDEX `attachment_workspaceId_idx` ON `attachment` (`workspaceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `attachment_storageKey_key` ON `attachment` (`storageKey`);--> statement-breakpoint
CREATE TABLE `contact` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`externalId` text,
	`avatarUrl` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`lastSeenAt` numeric,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_workspaceId_externalId_key` ON `contact` (`workspaceId`,`externalId`);--> statement-breakpoint
CREATE UNIQUE INDEX `contact_workspaceId_email_key` ON `contact` (`workspaceId`,`email`);--> statement-breakpoint
CREATE INDEX `contact_workspaceId_updatedAt_idx` ON `contact` (`workspaceId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `contact_note` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
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
	`channel` text DEFAULT 'WIDGET' NOT NULL,
	`aiPaused` integer DEFAULT false NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`lastMessageAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
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
CREATE INDEX `conversation_workspaceId_status_lastMessageAt_idx` ON `conversation` (`workspaceId`,`status`,`lastMessageAt`);--> statement-breakpoint
CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceUrl` text,
	`storageKey` text,
	`mimeType` text,
	`status` text DEFAULT 'PROCESSING' NOT NULL,
	`errorMessage` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_workspaceId_status_updatedAt_idx` ON `document` (`workspaceId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `document_chunk` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`position` integer NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`documentId` text NOT NULL,
	FOREIGN KEY (`documentId`) REFERENCES `document`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_chunk_documentId_position_idx` ON `document_chunk` (`documentId`,`position`);--> statement-breakpoint
CREATE TABLE `domain_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`entityId` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_event_workspaceId_type_createdAt_idx` ON `domain_event` (`workspaceId`,`type`,`createdAt`);--> statement-breakpoint
CREATE TABLE `integration` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'DISCONNECTED' NOT NULL,
	`displayName` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
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
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`workspaceId` text NOT NULL,
	`requestedById` text,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `integration_action_workspaceId_status_createdAt_idx` ON `integration_action` (`workspaceId`,`status`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `integration_action_idempotencyKey_key` ON `integration_action` (`idempotencyKey`);--> statement-breakpoint
CREATE TABLE `lead` (
	`id` text PRIMARY KEY NOT NULL,
	`workspaceId` text NOT NULL,
	`contactId` text,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`source` text DEFAULT 'WIDGET' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`capturedFromChat` integer DEFAULT false NOT NULL,
	`chatSessionId` text,
	`chatSummary` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `lead_workspaceId_phone_idx` ON `lead` (`workspaceId`,`phone`);--> statement-breakpoint
CREATE INDEX `lead_workspaceId_email_idx` ON `lead` (`workspaceId`,`email`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`readAt` numeric,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`workspaceId` text NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_workspaceId_createdAt_idx` ON `notification` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_userId_readAt_createdAt_idx` ON `notification` (`userId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` numeric NOT NULL,
	`token` text NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_key` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_key` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` numeric NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL
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
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`lastSeenAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`expiresAt` numeric NOT NULL,
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
	`primaryColor` text DEFAULT '#14805e' NOT NULL,
	`backgroundColor` text DEFAULT '#ffffff' NOT NULL,
	`textColor` text DEFAULT '#171717' NOT NULL,
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
	`modelName` text DEFAULT 'gpt-5-mini' NOT NULL,
	`isEnabled` integer DEFAULT true NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`userBubbleColor` text DEFAULT '#14805e' NOT NULL,
	`userBubbleTextColor` text DEFAULT '#ffffff' NOT NULL,
	`botBubbleColor` text DEFAULT '#f2f2f8' NOT NULL,
	`botBubbleTextColor` text DEFAULT '#171717' NOT NULL,
	`headerGradientFrom` text DEFAULT '#14805e' NOT NULL,
	`headerGradientTo` text DEFAULT '#0f6b4e' NOT NULL,
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
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `widget_workspaceId_key` ON `widget` (`workspaceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `widget_publicKey_key` ON `widget` (`publicKey`);--> statement-breakpoint
CREATE TABLE `widget_lead_capture` (
	`id` text PRIMARY KEY NOT NULL,
	`visitorSessionId` text NOT NULL,
	`leadId` text,
	`triggerType` text NOT NULL,
	`triggerValue` text,
	`formShownAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`formSubmittedAt` numeric,
	`abandoned` integer DEFAULT false NOT NULL,
	`messageCountAtCapture` integer DEFAULT 0 NOT NULL,
	`conversationSummary` text,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	FOREIGN KEY (`visitorSessionId`) REFERENCES `visitor_session`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`leadId`) REFERENCES `lead`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `widget_lead_capture_leadId_idx` ON `widget_lead_capture` (`leadId`);--> statement-breakpoint
CREATE UNIQUE INDEX `widget_lead_capture_leadId_key` ON `widget_lead_capture` (`leadId`);--> statement-breakpoint
CREATE UNIQUE INDEX `widget_lead_capture_visitorSessionId_key` ON `widget_lead_capture` (`visitorSessionId`);--> statement-breakpoint
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
	`startedAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`finishedAt` numeric,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflow_run_workspaceId_status_startedAt_idx` ON `workflow_run` (`workspaceId`,`status`,`startedAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_run_idempotencyKey_key` ON `workflow_run` (`idempotencyKey`);--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`brandColor` text DEFAULT '#14805e' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_slug_key` ON `workspace` (`slug`);--> statement-breakpoint
CREATE TABLE `workspace_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`token` text NOT NULL,
	`expiresAt` numeric NOT NULL,
	`acceptedAt` numeric,
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
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
	`createdAt` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` numeric NOT NULL,
	`userId` text NOT NULL,
	`workspaceId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`workspaceId`) REFERENCES `workspace`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_member_userId_workspaceId_key` ON `workspace_member` (`userId`,`workspaceId`);--> statement-breakpoint
CREATE INDEX `workspace_member_workspaceId_idx` ON `workspace_member` (`workspaceId`);