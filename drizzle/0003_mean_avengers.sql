CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE "afwezigheid" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speler_id" uuid NOT NULL,
	"van" date NOT NULL,
	"terug_op" date,
	"reden" text NOT NULL,
	"gezet_door" uuid,
	"gezet_op" timestamp with time zone DEFAULT now() NOT NULL,
	"bijgewerkt_op" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reden_is_gevuld" CHECK (length(btrim("afwezigheid"."reden")) > 0),
	CONSTRAINT "terug_na_van" CHECK ("afwezigheid"."terug_op" is null or "afwezigheid"."terug_op" > "afwezigheid"."van")
);
--> statement-breakpoint
ALTER TABLE "afwezigheid" ADD CONSTRAINT "afwezigheid_speler_id_speler_id_fk" FOREIGN KEY ("speler_id") REFERENCES "public"."speler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afwezigheid" ADD CONSTRAINT "afwezigheid_gezet_door_speler_id_fk" FOREIGN KEY ("gezet_door") REFERENCES "public"."speler"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "afwezigheid_speler_idx" ON "afwezigheid" USING btree ("speler_id");
--> statement-breakpoint
ALTER TABLE "afwezigheid" ADD CONSTRAINT "afwezigheid_niet_overlappend"
  EXCLUDE USING gist (speler_id WITH =, daterange(van, terug_op, '[)') WITH &&);
