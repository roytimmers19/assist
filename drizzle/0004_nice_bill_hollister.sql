CREATE TABLE "dienst" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"speler_id" uuid NOT NULL,
	"soort" text NOT NULL,
	"toegewezen_op" timestamp with time zone DEFAULT now() NOT NULL,
	"toegewezen_door" uuid
);
--> statement-breakpoint
ALTER TABLE "dienst" ADD CONSTRAINT "dienst_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dienst" ADD CONSTRAINT "dienst_speler_id_speler_id_fk" FOREIGN KEY ("speler_id") REFERENCES "public"."speler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dienst" ADD CONSTRAINT "dienst_toegewezen_door_speler_id_fk" FOREIGN KEY ("toegewezen_door") REFERENCES "public"."speler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dienst_event_speler_soort_idx" ON "dienst" USING btree ("event_id","speler_id","soort");--> statement-breakpoint
CREATE INDEX "dienst_event_idx" ON "dienst" USING btree ("event_id");