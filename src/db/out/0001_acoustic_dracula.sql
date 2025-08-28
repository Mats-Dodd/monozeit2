ALTER TABLE "files" ALTER COLUMN "content" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "content" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "content" SET NOT NULL;