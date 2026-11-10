CREATE TYPE "public"."knowledge_gap_review_status" AS ENUM('OPEN', 'RESOLVED', 'IGNORED');--> statement-breakpoint
CREATE TABLE "knowledge_gap_review" (
	"workspaceId" text NOT NULL,
	"questionHash" text NOT NULL,
	"status" "knowledge_gap_review_status" DEFAULT 'OPEN' NOT NULL,
	"reviewedByUserId" text,
	"createdAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT "knowledge_gap_review_workspaceId_questionHash_pk" PRIMARY KEY("workspaceId","questionHash"),
	CONSTRAINT "knowledge_gap_review_questionHash_check" CHECK ("knowledge_gap_review"."questionHash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "knowledge_gap_review" ADD CONSTRAINT "knowledge_gap_review_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "knowledge_gap_review" ADD CONSTRAINT "knowledge_gap_review_reviewedByUserId_user_id_fk" FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "knowledge_gap_review_workspace_status_updatedAt_idx" ON "knowledge_gap_review" USING btree ("workspaceId","status","updatedAt");