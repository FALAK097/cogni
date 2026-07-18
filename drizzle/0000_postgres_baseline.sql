CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_run" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"trigger" text NOT NULL,
	"modelProvider" text NOT NULL,
	"modelName" text NOT NULL,
	"channel" text NOT NULL,
	"runtimeContext" text DEFAULT '{}' NOT NULL,
	"sourceRefs" text DEFAULT '[]' NOT NULL,
	"usage" text DEFAULT '{}' NOT NULL,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"latencyMs" integer,
	"finishReason" text,
	"errorMessage" text,
	"startedAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"finishedAt" timestamp with time zone,
	"workspaceId" text NOT NULL,
	"widgetId" text,
	"conversationId" text,
	"contactId" text,
	"visitorSessionId" text
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mimeType" text NOT NULL,
	"size" integer NOT NULL,
	"storageKey" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"workspaceId" text NOT NULL,
	"conversationId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"externalId" text,
	"avatarUrl" text,
	"tags" text DEFAULT '[]' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"lastSeenAt" timestamp with time zone,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_note" (
	"id" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"contactId" text NOT NULL,
	"authorUserId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"channel" text DEFAULT 'WIDGET' NOT NULL,
	"aiPaused" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"lastMessageAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"messages" text DEFAULT '[]' NOT NULL,
	"workspaceId" text NOT NULL,
	"contactId" text NOT NULL,
	"assignedMemberId" text,
	"widgetId" text,
	"visitorSessionId" text
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sourceType" text NOT NULL,
	"sourceUrl" text,
	"storageKey" text,
	"mimeType" text,
	"status" text DEFAULT 'PROCESSING' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"documentId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"entityId" text,
	"payload" text DEFAULT '{}' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'DISCONNECTED' NOT NULL,
	"displayName" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_action" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"actionType" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"idempotencyKey" text NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"result" text,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL,
	"requestedById" text
);
--> statement-breakpoint
CREATE TABLE "lead" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"contactId" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" text DEFAULT 'WIDGET' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"capturedFromChat" boolean DEFAULT false NOT NULL,
	"chatSessionId" text,
	"chatSummary" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"workspaceId" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_session" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"browserSessionId" text,
	"visitorId" text,
	"hostname" text NOT NULL,
	"externalId" text,
	"pageUrl" text,
	"referrer" text,
	"browser" text,
	"deviceType" text,
	"os" text,
	"country" text,
	"city" text,
	"timezone" text,
	"language" text,
	"screenSize" text,
	"ipData" text,
	"status" text DEFAULT 'active' NOT NULL,
	"messageCount" integer DEFAULT 0 NOT NULL,
	"name" text,
	"email" text,
	"phone" text,
	"leadCapturedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"lastSeenAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"widgetId" text NOT NULL,
	"contactId" text
);
--> statement-breakpoint
CREATE TABLE "widget" (
	"id" text PRIMARY KEY NOT NULL,
	"publicKey" text NOT NULL,
	"displayName" text DEFAULT 'Support' NOT NULL,
	"welcomeMessage" text DEFAULT 'Hi! How can we help?' NOT NULL,
	"inputPlaceholder" text DEFAULT 'Ask a question…' NOT NULL,
	"primaryColor" text DEFAULT '#7c3aed' NOT NULL,
	"backgroundColor" text DEFAULT '#ffffff' NOT NULL,
	"textColor" text DEFAULT '#171717' NOT NULL,
	"borderColor" text DEFAULT '#EAECF0' NOT NULL,
	"fontFamily" text DEFAULT 'Inter' NOT NULL,
	"fontSize" text DEFAULT '14px' NOT NULL,
	"position" text DEFAULT 'bottom-right' NOT NULL,
	"launcherSize" text DEFAULT 'md' NOT NULL,
	"panelWidth" integer DEFAULT 380 NOT NULL,
	"panelHeight" integer DEFAULT 640 NOT NULL,
	"borderRadius" integer DEFAULT 20 NOT NULL,
	"borderRadiusStyle" text DEFAULT 'default' NOT NULL,
	"logoUrl" text,
	"instructions" text DEFAULT 'Answer clearly and only use information you know is reliable. If you are unsure, say so.' NOT NULL,
	"escalationKeywords" text DEFAULT 'human,agent,person,representative,support team' NOT NULL,
	"modelProvider" text DEFAULT 'OPENAI' NOT NULL,
	"modelName" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"userBubbleColor" text DEFAULT '#7c3aed' NOT NULL,
	"userBubbleTextColor" text DEFAULT '#ffffff' NOT NULL,
	"botBubbleColor" text DEFAULT '#f2f2f8' NOT NULL,
	"botBubbleTextColor" text DEFAULT '#171717' NOT NULL,
	"headerGradientFrom" text DEFAULT '#7c3aed' NOT NULL,
	"headerGradientTo" text DEFAULT '#7c3aed' NOT NULL,
	"shadowSize" text DEFAULT 'md' NOT NULL,
	"suggestions" text DEFAULT '["What services do you offer?","How can I get started?","Tell me more about pricing"]' NOT NULL,
	"hideSuggestionsOnInteract" boolean DEFAULT true NOT NULL,
	"previewMessages" text DEFAULT '["Hi there! 👋","Need help with anything?"]' NOT NULL,
	"autoShowPreviewDelay" integer DEFAULT 3000 NOT NULL,
	"showBranding" boolean DEFAULT true NOT NULL,
	"privacyPolicyUrl" text DEFAULT '/privacy-policy' NOT NULL,
	"enableLeadCapture" boolean DEFAULT false NOT NULL,
	"leadCaptureKeywords" text DEFAULT '["contact","contact me","call me","reach me","get in touch"]' NOT NULL,
	"leadCaptureMinutesThreshold" integer DEFAULT 5 NOT NULL,
	"leadCaptureMessageThreshold" integer DEFAULT 4 NOT NULL,
	"enableBrochure" boolean DEFAULT false NOT NULL,
	"brochureSuggestionText" text DEFAULT 'Receive Brochure' NOT NULL,
	"authorizedDomains" text DEFAULT '[]' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_lead_capture" (
	"id" text PRIMARY KEY NOT NULL,
	"visitorSessionId" text NOT NULL,
	"leadId" text,
	"triggerType" text NOT NULL,
	"triggerValue" text,
	"formShownAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"formSubmittedAt" timestamp with time zone,
	"abandoned" boolean DEFAULT false NOT NULL,
	"messageCountAtCapture" integer DEFAULT 0 NOT NULL,
	"conversationSummary" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_run" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"idempotencyKey" text,
	"input" text DEFAULT '{}' NOT NULL,
	"output" text,
	"errorMessage" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 3 NOT NULL,
	"startedAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"finishedAt" timestamp with time zone,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"brandColor" text DEFAULT '#7c3aed' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"acceptedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"userId" text NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_widgetId_widget_id_fk" FOREIGN KEY ("widgetId") REFERENCES "public"."widget"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_visitorSessionId_visitor_session_id_fk" FOREIGN KEY ("visitorSessionId") REFERENCES "public"."visitor_session"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contact_note" ADD CONSTRAINT "contact_note_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "contact_note" ADD CONSTRAINT "contact_note_authorUserId_user_id_fk" FOREIGN KEY ("authorUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_assignedMemberId_workspace_member_id_fk" FOREIGN KEY ("assignedMemberId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_widgetId_widget_id_fk" FOREIGN KEY ("widgetId") REFERENCES "public"."widget"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_visitorSessionId_visitor_session_id_fk" FOREIGN KEY ("visitorSessionId") REFERENCES "public"."visitor_session"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_documentId_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "domain_event" ADD CONSTRAINT "domain_event_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integration" ADD CONSTRAINT "integration_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "integration_action" ADD CONSTRAINT "integration_action_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visitor_session" ADD CONSTRAINT "visitor_session_widgetId_widget_id_fk" FOREIGN KEY ("widgetId") REFERENCES "public"."widget"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visitor_session" ADD CONSTRAINT "visitor_session_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "widget" ADD CONSTRAINT "widget_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "widget_lead_capture" ADD CONSTRAINT "widget_lead_capture_visitorSessionId_visitor_session_id_fk" FOREIGN KEY ("visitorSessionId") REFERENCES "public"."visitor_session"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "widget_lead_capture" ADD CONSTRAINT "widget_lead_capture_leadId_lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "agent_run_workspaceId_status_startedAt_idx" ON "agent_run" USING btree ("workspaceId","status","startedAt");--> statement-breakpoint
CREATE INDEX "agent_run_conversationId_startedAt_idx" ON "agent_run" USING btree ("conversationId","startedAt");--> statement-breakpoint
CREATE INDEX "attachment_conversationId_idx" ON "attachment" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX "attachment_workspaceId_idx" ON "attachment" USING btree ("workspaceId");--> statement-breakpoint
CREATE UNIQUE INDEX "attachment_storageKey_key" ON "attachment" USING btree ("storageKey");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_workspaceId_externalId_key" ON "contact" USING btree ("workspaceId","externalId");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_workspaceId_email_key" ON "contact" USING btree ("workspaceId","email");--> statement-breakpoint
CREATE INDEX "contact_workspaceId_updatedAt_idx" ON "contact" USING btree ("workspaceId","updatedAt");--> statement-breakpoint
CREATE INDEX "contact_note_authorUserId_idx" ON "contact_note" USING btree ("authorUserId");--> statement-breakpoint
CREATE INDEX "contact_note_contactId_createdAt_idx" ON "contact_note" USING btree ("contactId","createdAt");--> statement-breakpoint
CREATE INDEX "conversation_visitorSessionId_idx" ON "conversation" USING btree ("visitorSessionId");--> statement-breakpoint
CREATE INDEX "conversation_widgetId_idx" ON "conversation" USING btree ("widgetId");--> statement-breakpoint
CREATE INDEX "conversation_assignedMemberId_idx" ON "conversation" USING btree ("assignedMemberId");--> statement-breakpoint
CREATE INDEX "conversation_workspaceId_contactId_idx" ON "conversation" USING btree ("workspaceId","contactId");--> statement-breakpoint
CREATE INDEX "conversation_workspaceId_status_lastMessageAt_idx" ON "conversation" USING btree ("workspaceId","status","lastMessageAt");--> statement-breakpoint
CREATE INDEX "document_workspaceId_status_updatedAt_idx" ON "document" USING btree ("workspaceId","status","updatedAt");--> statement-breakpoint
CREATE INDEX "document_chunk_documentId_position_idx" ON "document_chunk" USING btree ("documentId","position");--> statement-breakpoint
CREATE INDEX "domain_event_workspaceId_type_createdAt_idx" ON "domain_event" USING btree ("workspaceId","type","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_workspaceId_provider_key" ON "integration" USING btree ("workspaceId","provider");--> statement-breakpoint
CREATE INDEX "integration_action_workspaceId_status_createdAt_idx" ON "integration_action" USING btree ("workspaceId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_action_idempotencyKey_key" ON "integration_action" USING btree ("idempotencyKey");--> statement-breakpoint
CREATE INDEX "lead_workspaceId_phone_idx" ON "lead" USING btree ("workspaceId","phone");--> statement-breakpoint
CREATE INDEX "lead_workspaceId_email_idx" ON "lead" USING btree ("workspaceId","email");--> statement-breakpoint
CREATE INDEX "notification_workspaceId_createdAt_idx" ON "notification" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "notification_userId_readAt_createdAt_idx" ON "notification" USING btree ("userId","readAt","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_key" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_session_widgetId_browserSessionId_key" ON "visitor_session" USING btree ("widgetId","browserSessionId");--> statement-breakpoint
CREATE INDEX "visitor_session_contactId_idx" ON "visitor_session" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "visitor_session_widgetId_visitorId_idx" ON "visitor_session" USING btree ("widgetId","visitorId");--> statement-breakpoint
CREATE INDEX "visitor_session_widgetId_lastSeenAt_idx" ON "visitor_session" USING btree ("widgetId","lastSeenAt");--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_session_token_key" ON "visitor_session" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_workspaceId_key" ON "widget" USING btree ("workspaceId");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_publicKey_key" ON "widget" USING btree ("publicKey");--> statement-breakpoint
CREATE INDEX "widget_lead_capture_leadId_idx" ON "widget_lead_capture" USING btree ("leadId");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_lead_capture_leadId_key" ON "widget_lead_capture" USING btree ("leadId");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_lead_capture_visitorSessionId_key" ON "widget_lead_capture" USING btree ("visitorSessionId");--> statement-breakpoint
CREATE INDEX "workflow_run_workspaceId_status_startedAt_idx" ON "workflow_run" USING btree ("workspaceId","status","startedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_run_idempotencyKey_key" ON "workflow_run" USING btree ("idempotencyKey");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invite_workspaceId_email_key" ON "workspace_invite" USING btree ("workspaceId","email");--> statement-breakpoint
CREATE INDEX "workspace_invite_token_idx" ON "workspace_invite" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invite_token_key" ON "workspace_invite" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_userId_workspaceId_key" ON "workspace_member" USING btree ("userId","workspaceId");--> statement-breakpoint
CREATE INDEX "workspace_member_workspaceId_idx" ON "workspace_member" USING btree ("workspaceId");