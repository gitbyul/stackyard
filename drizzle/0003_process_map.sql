CREATE TABLE "process_map" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_map_version" (
	"id" text PRIMARY KEY NOT NULL,
	"map_id" text NOT NULL,
	"number" integer NOT NULL,
	"doc" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"author_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "process_map" ADD CONSTRAINT "process_map_site_id_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."site"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_map_version" ADD CONSTRAINT "process_map_version_map_id_process_map_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."process_map"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_map_version" ADD CONSTRAINT "process_map_version_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "process_map_site_idx" ON "process_map" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "process_map_version_number_uq" ON "process_map_version" USING btree ("map_id","number");