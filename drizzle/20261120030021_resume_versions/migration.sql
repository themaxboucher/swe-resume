CREATE TABLE "resume_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"resume_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"design" jsonb NOT NULL,
	"layout" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resume" ADD COLUMN "file_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "resume" ADD COLUMN "last_version_id" uuid;--> statement-breakpoint
CREATE INDEX "resume_version_resume_id_idx" ON "resume_version" ("resume_id","position");--> statement-breakpoint
CREATE INDEX "resume_version_user_id_idx" ON "resume_version" ("user_id");--> statement-breakpoint
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_resume_id_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resume"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resume_version" ADD CONSTRAINT "resume_version_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;