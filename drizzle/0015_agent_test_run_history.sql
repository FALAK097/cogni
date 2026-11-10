CREATE TABLE "agent_test_run" (
	"id" text PRIMARY KEY NOT NULL,
	"resultDigest" text NOT NULL,
	"caseCount" integer NOT NULL,
	"passedCount" integer NOT NULL,
	"mismatchCount" integer NOT NULL,
	"errorCount" integer NOT NULL,
	"notRunCount" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"workspaceId" text NOT NULL,
	"createdByMembershipId" text,
	CONSTRAINT "agent_test_run_counts_nonnegative_check" CHECK ("agent_test_run"."caseCount" > 0 and "agent_test_run"."passedCount" >= 0 and "agent_test_run"."mismatchCount" >= 0 and "agent_test_run"."errorCount" >= 0 and "agent_test_run"."notRunCount" >= 0),
	CONSTRAINT "agent_test_run_counts_match_check" CHECK ("agent_test_run"."caseCount" = "agent_test_run"."passedCount" + "agent_test_run"."mismatchCount" + "agent_test_run"."errorCount" + "agent_test_run"."notRunCount")
);
--> statement-breakpoint
ALTER TABLE "agent_test_run" ADD CONSTRAINT "agent_test_run_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_test_run" ADD CONSTRAINT "agent_test_run_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "agent_test_run_workspace_createdAt_idx" ON "agent_test_run" USING btree ("workspaceId","createdAt");