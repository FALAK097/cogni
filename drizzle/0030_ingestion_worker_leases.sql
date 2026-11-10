ALTER TABLE "workflow_run" ADD COLUMN IF NOT EXISTS "leaseToken" text;--> statement-breakpoint
ALTER TABLE "workflow_run" ADD COLUMN IF NOT EXISTS "leaseExpiresAt" timestamp with time zone;
