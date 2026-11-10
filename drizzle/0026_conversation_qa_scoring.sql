CREATE TABLE "conversation_qa_evaluation" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"conversationId" text NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"trigger" text NOT NULL,
	"publicMessageAt" timestamp with time zone NOT NULL,
	"helpfulness" integer,
	"grounding" integer,
	"sentiment" text,
	"topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"escalationOutcome" text,
	"reasonCodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lowScore" boolean,
	"modelProvider" text,
	"modelName" text,
	"inputTokens" integer,
	"outputTokens" integer,
	"errorCode" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "conversation_qa_evaluation_version_check" CHECK ("conversation_qa_evaluation"."version" > 0),
	CONSTRAINT "conversation_qa_evaluation_status_check" CHECK ("conversation_qa_evaluation"."status" in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'STALE')),
	CONSTRAINT "conversation_qa_evaluation_trigger_check" CHECK ("conversation_qa_evaluation"."trigger" in ('CLOSED', 'INACTIVE')),
	CONSTRAINT "conversation_qa_evaluation_scores_check" CHECK (("conversation_qa_evaluation"."helpfulness" is null or "conversation_qa_evaluation"."helpfulness" between 1 and 5) and ("conversation_qa_evaluation"."grounding" is null or "conversation_qa_evaluation"."grounding" between 1 and 5)),
	CONSTRAINT "conversation_qa_evaluation_result_check" CHECK (("conversation_qa_evaluation"."status" <> 'COMPLETED' or ("conversation_qa_evaluation"."helpfulness" is not null and "conversation_qa_evaluation"."grounding" is not null and "conversation_qa_evaluation"."sentiment" is not null and "conversation_qa_evaluation"."escalationOutcome" is not null and "conversation_qa_evaluation"."lowScore" is not null)))
);
--> statement-breakpoint
CREATE TABLE "conversation_qa_state" (
	"workspaceId" text NOT NULL,
	"conversationId" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "conversation_qa_state_workspaceId_conversationId_pk" PRIMARY KEY("workspaceId","conversationId"),
	CONSTRAINT "conversation_qa_state_version_check" CHECK ("conversation_qa_state"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "conversation_qa_evaluation" ADD CONSTRAINT "conversation_qa_evaluation_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation_qa_evaluation" ADD CONSTRAINT "conversation_qa_evaluation_workspace_conversation_fk" FOREIGN KEY ("workspaceId","conversationId") REFERENCES "public"."conversation"("workspaceId","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation_qa_state" ADD CONSTRAINT "conversation_qa_state_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "conversation_qa_state" ADD CONSTRAINT "conversation_qa_state_workspace_conversation_fk" FOREIGN KEY ("workspaceId","conversationId") REFERENCES "public"."conversation"("workspaceId","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_qa_evaluation_workspace_conversation_version_key" ON "conversation_qa_evaluation" USING btree ("workspaceId","conversationId","version");--> statement-breakpoint
CREATE INDEX "conversation_qa_evaluation_workspace_createdAt_idx" ON "conversation_qa_evaluation" USING btree ("workspaceId","createdAt");--> statement-breakpoint
CREATE INDEX "conversation_qa_evaluation_workspace_status_createdAt_idx" ON "conversation_qa_evaluation" USING btree ("workspaceId","status","createdAt");