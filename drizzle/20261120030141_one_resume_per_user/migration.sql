DROP INDEX "resume_user_id_idx";--> statement-breakpoint
ALTER TABLE "resume" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "resume" DROP COLUMN "design";--> statement-breakpoint
CREATE UNIQUE INDEX "resume_user_id_key" ON "resume" ("user_id");