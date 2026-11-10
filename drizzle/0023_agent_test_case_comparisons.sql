CREATE TYPE "public"."agent_test_comparison_status" AS ENUM('PENDING', 'COMPLETE', 'ERROR');--> statement-breakpoint
CREATE TABLE "agent_test_comparison" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"improvementId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"caseSnapshot" jsonb NOT NULL,
	"baselineReferences" jsonb,
	"replayReferences" jsonb,
	"baselineOutcome" text,
	"replayOutcome" text,
	"replayStatus" text,
	"status" "agent_test_comparison_status" DEFAULT 'PENDING' NOT NULL,
	"errorCode" text,
	"createdByMembershipId" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "agent_test_comparison_status_result_check" CHECK (("agent_test_comparison"."status" = 'PENDING' and "agent_test_comparison"."completedAt" is null) or ("agent_test_comparison"."status" <> 'PENDING' and "agent_test_comparison"."completedAt" is not null))
);
--> statement-breakpoint
ALTER TABLE "agent_test_comparison" ADD CONSTRAINT "agent_test_comparison_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_test_comparison" ADD CONSTRAINT "agent_test_comparison_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_improvement_workspace_id_key" ON "agent_test_improvement" USING btree ("workspaceId","id");--> statement-breakpoint
ALTER TABLE "agent_test_comparison" ADD CONSTRAINT "agent_test_comparison_workspace_improvement_fk" FOREIGN KEY ("workspaceId","improvementId") REFERENCES "public"."agent_test_improvement"("workspaceId","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_comparison_workspace_id_key" ON "agent_test_comparison" USING btree ("workspaceId","id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_comparison_workspace_idempotency_key" ON "agent_test_comparison" USING btree ("workspaceId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "agent_test_comparison_workspace_createdAt_idx" ON "agent_test_comparison" USING btree ("workspaceId","createdAt");--> statement-breakpoint
