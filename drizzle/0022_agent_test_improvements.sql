CREATE TYPE "public"."agent_test_improvement_status" AS ENUM('OPEN', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE "agent_test_improvement" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"runId" text NOT NULL,
	"caseId" text NOT NULL,
	"caseSnapshot" jsonb NOT NULL,
	"evaluationReferences" jsonb NOT NULL,
	"failureSourceIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rationale" text NOT NULL,
	"status" "agent_test_improvement_status" DEFAULT 'OPEN' NOT NULL,
	"createdByMembershipId" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"reviewedByMembershipId" text,
	"reviewedAt" timestamp with time zone,
	"reviewNote" text,
	"updatedAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "agent_test_improvement_review_state_check" CHECK (("agent_test_improvement"."status" = 'OPEN' and "agent_test_improvement"."reviewedAt" is null) or ("agent_test_improvement"."status" <> 'OPEN' and "agent_test_improvement"."reviewedAt" is not null))
);
--> statement-breakpoint
ALTER TABLE "agent_test_improvement" ADD CONSTRAINT "agent_test_improvement_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_test_improvement" ADD CONSTRAINT "agent_test_improvement_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_test_improvement" ADD CONSTRAINT "agent_test_improvement_reviewedByMembershipId_workspace_member_id_fk" FOREIGN KEY ("reviewedByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_case_workspace_id_key" ON "agent_test_case" USING btree ("workspaceId","id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_run_workspace_id_key" ON "agent_test_run" USING btree ("workspaceId","id");--> statement-breakpoint
ALTER TABLE "agent_test_improvement" ADD CONSTRAINT "agent_test_improvement_workspace_run_fk" FOREIGN KEY ("workspaceId","runId") REFERENCES "public"."agent_test_run"("workspaceId","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "agent_test_improvement_workspace_status_createdAt_idx" ON "agent_test_improvement" USING btree ("workspaceId","status","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_improvement_workspace_run_case_key" ON "agent_test_improvement" USING btree ("workspaceId","runId","caseId");--> statement-breakpoint
