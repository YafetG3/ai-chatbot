CREATE TABLE IF NOT EXISTS "event_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_scraped" timestamp,
	"rate_limit_remaining" integer,
	"rate_limit_reset" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "platform" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "event_queries" ADD COLUMN "event_type" varchar(50);--> statement-breakpoint
ALTER TABLE "event_queries" ADD COLUMN "keywords" json;--> statement-breakpoint
ALTER TABLE "event_queries" ADD COLUMN "processing_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "event_queries" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "event_queries" ADD COLUMN "scraped_at" timestamp;--> statement-breakpoint
ALTER TABLE "event_queries" ADD COLUMN "processing_time" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "raw_data" json;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_type" varchar(50);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "keywords" json;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "organizer" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "price" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "age_restriction" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tags" json;