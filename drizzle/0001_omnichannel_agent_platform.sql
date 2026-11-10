CREATE TABLE "approval_request" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"actionType" text NOT NULL,
	"riskLevel" text DEFAULT 'MEDIUM' NOT NULL,
	"summary" text NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"decidedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"workspaceId" text NOT NULL,
	"conversationId" text,
	"workflowRunId" text,
	"workflowStepId" text,
	"requestedByAgentRunId" text,
	"decidedByUserId" text
);
--> statement-breakpoint
CREATE TABLE "workflow_step" (
	"id" text PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"input" text DEFAULT '{}' NOT NULL,
	"output" text,
	"errorMessage" text,
	"startedAt" timestamp with time zone,
	"finishedAt" timestamp with time zone,
	"workflowRunId" text NOT NULL,
	"workspaceId" text NOT NULL
);
--> statement-breakpoint
DROP TABLE "lead" CASCADE;--> statement-breakpoint
DROP TABLE "widget_lead_capture" CASCADE;--> statement-breakpoint
DROP INDEX "integration_action_idempotencyKey_key";--> statement-breakpoint
DROP INDEX "workflow_run_idempotencyKey_key";--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "source" text DEFAULT 'WIDGET' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "capturedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "captureContext" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "externalThreadId" text;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "connectedAccountId" text;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "externalAccountId" text;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "toolkitVersion" text;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "config" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "credentials" text;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "lastHealthCheckAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "integration" ADD COLUMN "lastError" text;--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "bookingEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "bookingTimezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "bookingDurationMinutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "bookingMinimumNoticeMinutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "widget" ADD COLUMN "bookingWorkingHours" text DEFAULT '{"start":"09:00","end":"17:00","weekdays":[1,2,3,4,5]}' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_run" ADD COLUMN "conversationId" text;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_workflowRunId_workflow_run_id_fk" FOREIGN KEY ("workflowRunId") REFERENCES "public"."workflow_run"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_workflowStepId_workflow_step_id_fk" FOREIGN KEY ("workflowStepId") REFERENCES "public"."workflow_step"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_requestedByAgentRunId_agent_run_id_fk" FOREIGN KEY ("requestedByAgentRunId") REFERENCES "public"."agent_run"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_decidedByUserId_user_id_fk" FOREIGN KEY ("decidedByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_workflowRunId_workflow_run_id_fk" FOREIGN KEY ("workflowRunId") REFERENCES "public"."workflow_run"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "approval_request_tokenHash_key" ON "approval_request" USING btree ("tokenHash");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_request_workflowStepId_key" ON "approval_request" USING btree ("workflowStepId");--> statement-breakpoint
CREATE INDEX "approval_request_workspaceId_status_createdAt_idx" ON "approval_request" USING btree ("workspaceId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_step_run_position_key" ON "workflow_step" USING btree ("workflowRunId","position");--> statement-breakpoint
CREATE INDEX "workflow_step_workspaceId_status_idx" ON "workflow_step" USING btree ("workspaceId","status");--> statement-breakpoint
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_workspaceId_channel_externalThreadId_key" ON "conversation" USING btree ("workspaceId","channel","externalThreadId");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_action_workspaceId_idempotencyKey_key" ON "integration_action" USING btree ("workspaceId","idempotencyKey");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_run_workspaceId_idempotencyKey_key" ON "workflow_run" USING btree ("workspaceId","idempotencyKey");
