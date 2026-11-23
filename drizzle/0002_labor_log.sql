CREATE TYPE "public"."process_kind" AS ENUM('receiving', 'putaway', 'picking', 'packing', 'shipping');--> statement-breakpoint
CREATE TYPE "public"."shift_kind" AS ENUM('day', 'night');--> statement-breakpoint
CREATE TABLE "labor_log" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"work_date" date NOT NULL,
	"shift" "shift_kind" NOT NULL,
	"process" "process_kind" NOT NULL,
	"hours" real NOT NULL,
	"volume" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labor_log" ADD CONSTRAINT "labor_log_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "labor_log_site_date_idx" ON "labor_log" USING btree ("site_id","work_date");