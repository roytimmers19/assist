CREATE TABLE "boete" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speler_id" uuid NOT NULL,
	"omschrijving" text NOT NULL,
	"bedrag_cent" integer NOT NULL,
	"datum" date NOT NULL,
	"event_id" uuid,
	"soort_id" uuid,
	"aanleiding" text,
	"status" text DEFAULT 'telt' NOT NULL,
	"gegeven_op" timestamp with time zone DEFAULT now() NOT NULL,
	"gegeven_door" uuid,
	"ingetrokken_op" timestamp with time zone,
	"ingetrokken_door" uuid,
	"betaald_op" timestamp with time zone,
	"betaald_door" uuid,
	CONSTRAINT "boete_omschrijving_gevuld" CHECK (length(btrim("boete"."omschrijving")) > 0),
	CONSTRAINT "boete_bedrag_positief" CHECK ("boete"."bedrag_cent" > 0)
);
--> statement-breakpoint
CREATE TABLE "boetesoort" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"omschrijving" text NOT NULL,
	"bedrag_cent" integer NOT NULL,
	"actief" boolean DEFAULT true NOT NULL,
	"te_laat_voor" text,
	"te_laat_gekoppeld_op" timestamp with time zone,
	CONSTRAINT "boetesoort_omschrijving_gevuld" CHECK (length(btrim("boetesoort"."omschrijving")) > 0),
	CONSTRAINT "boetesoort_bedrag_positief" CHECK ("boetesoort"."bedrag_cent" > 0)
);
--> statement-breakpoint
ALTER TABLE "speler" ADD COLUMN "penningmeester" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "speler" ADD COLUMN "boete_uitdeler" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "boete" ADD CONSTRAINT "boete_speler_id_speler_id_fk" FOREIGN KEY ("speler_id") REFERENCES "public"."speler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boete" ADD CONSTRAINT "boete_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boete" ADD CONSTRAINT "boete_soort_id_boetesoort_id_fk" FOREIGN KEY ("soort_id") REFERENCES "public"."boetesoort"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boete" ADD CONSTRAINT "boete_gegeven_door_speler_id_fk" FOREIGN KEY ("gegeven_door") REFERENCES "public"."speler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boete" ADD CONSTRAINT "boete_ingetrokken_door_speler_id_fk" FOREIGN KEY ("ingetrokken_door") REFERENCES "public"."speler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boete" ADD CONSTRAINT "boete_betaald_door_speler_id_fk" FOREIGN KEY ("betaald_door") REFERENCES "public"."speler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boete_te_laat_idx" ON "boete" USING btree ("event_id","speler_id") WHERE "boete"."aanleiding" = 'te_laat_afgemeld';--> statement-breakpoint
CREATE INDEX "boete_speler_idx" ON "boete" USING btree ("speler_id");--> statement-breakpoint
CREATE INDEX "boete_datum_idx" ON "boete" USING btree ("datum");--> statement-breakpoint
CREATE UNIQUE INDEX "boetesoort_te_laat_idx" ON "boetesoort" USING btree ("te_laat_voor") WHERE "boetesoort"."te_laat_voor" is not null;