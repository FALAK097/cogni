CREATE TYPE "public"."agent_test_expected_outcome" AS ENUM('grounded_answer', 'no_evidence', 'human_handoff');--> statement-breakpoint
CREATE TABLE "agent_test_case" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"expectedOutcome" "agent_test_expected_outcome" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"workspaceId" text NOT NULL,
	"createdByMembershipId" text
);
--> statement-breakpoint
ALTER TABLE "agent_test_case" ADD CONSTRAINT "agent_test_case_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_test_case" ADD CONSTRAINT "agent_test_case_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_case_workspace_title_key" ON "agent_test_case" USING btree ("workspaceId",lower("title"));--> statement-breakpoint
CREATE INDEX "agent_test_case_workspace_createdAt_idx" ON "agent_test_case" USING btree ("workspaceId","createdAt");