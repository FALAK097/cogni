CREATE TYPE "public"."agent_test_publish_check_status" AS ENUM('PENDING_BASELINE', 'PENDING_DRAFT', 'COMPLETE', 'ERROR');--> statement-breakpoint
CREATE TABLE "agent_test_publish_check" (
	"id" text PRIMARY KEY NOT NULL,
	"workspaceId" text NOT NULL,
	"widgetId" text NOT NULL,
	"createdByMembershipId" text,
	"suiteDigest" text NOT NULL,
	"basePublishedVersion" integer NOT NULL,
	"candidateFingerprint" text NOT NULL,
	"baselineReferences" jsonb,
	"candidateReferences" jsonb,
	"status" "agent_test_publish_check_status" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"completedAt" timestamp with time zone,
	CONSTRAINT "agent_test_publish_check_suite_digest_check" CHECK ("agent_test_publish_check"."suiteDigest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "agent_test_publish_check_candidate_fingerprint_check" CHECK ("agent_test_publish_check"."candidateFingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "agent_test_publish_check_version_nonnegative_check" CHECK ("agent_test_publish_check"."basePublishedVersion" >= 0),
	CONSTRAINT "agent_test_publish_check_result_state_check" CHECK (("agent_test_publish_check"."status" = 'PENDING_BASELINE' and "agent_test_publish_check"."baselineReferences" is null and "agent_test_publish_check"."candidateReferences" is null and "agent_test_publish_check"."completedAt" is null) or ("agent_test_publish_check"."status" = 'PENDING_DRAFT' and "agent_test_publish_check"."candidateReferences" is null and "agent_test_publish_check"."completedAt" is null) or ("agent_test_publish_check"."status" = 'COMPLETE' and "agent_test_publish_check"."candidateReferences" is not null and "agent_test_publish_check"."completedAt" is not null) or ("agent_test_publish_check"."status" = 'ERROR' and "agent_test_publish_check"."completedAt" is not null))
);
--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ADD CONSTRAINT "agent_test_publish_check_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ADD CONSTRAINT "agent_test_publish_check_widgetId_widget_id_fk" FOREIGN KEY ("widgetId") REFERENCES "public"."widget"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_test_publish_check" ADD CONSTRAINT "agent_test_publish_check_createdByMembershipId_workspace_member_id_fk" FOREIGN KEY ("createdByMembershipId") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_test_publish_check_workspace_id_key" ON "agent_test_publish_check" USING btree ("workspaceId","id");--> statement-breakpoint
CREATE INDEX "agent_test_publish_check_workspace_createdAt_idx" ON "agent_test_publish_check" USING btree ("workspaceId","createdAt");