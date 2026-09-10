CREATE TABLE "opstelling_plek" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opstelling_id" uuid NOT NULL,
	"slot" smallint,
	"speler_id" uuid,
	"gastnaam" text,
	"gastnummer" integer,
	CONSTRAINT "plek_heeft_een_identiteit" CHECK (("opstelling_plek"."speler_id" is not null) <> ("opstelling_plek"."gastnaam" is not null)),
	CONSTRAINT "bank_is_altijd_gast" CHECK ("opstelling_plek"."slot" is not null or "opstelling_plek"."gastnaam" is not null),
	CONSTRAINT "slot_binnen_bereik" CHECK ("opstelling_plek"."slot" is null or ("opstelling_plek"."slot" >= 0 and "opstelling_plek"."slot" <= 10))
);
--> statement-breakpoint
CREATE TABLE "opstelling" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"formatie" text NOT NULL,
	"status" text DEFAULT 'concept' NOT NULL,
	"gepubliceerd_op" timestamp with time zone,
	"aangemaakt_op" timestamp with time zone DEFAULT now() NOT NULL,
	"bijgewerkt_op" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opstelling_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "opstelling_plek" ADD CONSTRAINT "opstelling_plek_opstelling_id_opstelling_id_fk" FOREIGN KEY ("opstelling_id") REFERENCES "public"."opstelling"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opstelling_plek" ADD CONSTRAINT "opstelling_plek_speler_id_speler_id_fk" FOREIGN KEY ("speler_id") REFERENCES "public"."speler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opstelling" ADD CONSTRAINT "opstelling_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opstelling_slot_idx" ON "opstelling_plek" USING btree ("opstelling_id","slot") WHERE "opstelling_plek"."slot" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "opstelling_speler_idx" ON "opstelling_plek" USING btree ("opstelling_id","speler_id") WHERE "opstelling_plek"."speler_id" is not null;