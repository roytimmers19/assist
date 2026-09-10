CREATE TABLE "aanwezigheid" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"speler_id" uuid NOT NULL,
	"status" text NOT NULL,
	"bron" text NOT NULL,
	"toelichting" text,
	"gezet_op" timestamp with time zone DEFAULT now() NOT NULL,
	"gezet_door_speler_id" uuid
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"start_op" timestamp with time zone NOT NULL,
	"eind_op" timestamp with time zone,
	"locatie" text,
	"tegenstander" text,
	"thuis" boolean,
	"ical_uid" text,
	"bron" text DEFAULT 'ics' NOT NULL,
	"status" text DEFAULT 'gepland' NOT NULL,
	"afmeld_deadline" timestamp with time zone NOT NULL,
	"laatst_gezien_in_feed_op" timestamp with time zone,
	CONSTRAINT "event_ical_uid_unique" UNIQUE("ical_uid")
);
--> statement-breakpoint
CREATE TABLE "eventtype_instelling" (
	"type" text PRIMARY KEY NOT NULL,
	"deadline_uren_voor_aanvang" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gestart_op" timestamp with time zone DEFAULT now() NOT NULL,
	"geeindigd_op" timestamp with time zone,
	"status" text NOT NULL,
	"aantal_gelezen" integer DEFAULT 0 NOT NULL,
	"aantal_nieuw" integer DEFAULT 0 NOT NULL,
	"aantal_bijgewerkt" integer DEFAULT 0 NOT NULL,
	"aantal_afgelast" integer DEFAULT 0 NOT NULL,
	"aantal_overgeslagen" integer DEFAULT 0 NOT NULL,
	"melding" text
);
--> statement-breakpoint
CREATE TABLE "speler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gebruiker_id" text,
	"naam" text NOT NULL,
	"weergavenaam" text,
	"rugnummer" integer,
	"positie" text,
	"voorkeursvoet" text,
	"telefoon" text,
	"email" text NOT NULL,
	"rol" text DEFAULT 'speler' NOT NULL,
	"account_status" text DEFAULT 'uitgenodigd' NOT NULL,
	"actief" boolean DEFAULT true NOT NULL,
	"aangemaakt_op" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "speler_gebruiker_id_unique" UNIQUE("gebruiker_id"),
	CONSTRAINT "speler_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "team_instelling" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"teamnaam" text NOT NULL,
	"ics_url" text NOT NULL,
	"teamcode" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uitnodiging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speler_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"verloopt_op" timestamp with time zone NOT NULL,
	"gebruikt_op" timestamp with time zone,
	"aangemaakt_op" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uitnodiging_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "aanwezigheid" ADD CONSTRAINT "aanwezigheid_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aanwezigheid" ADD CONSTRAINT "aanwezigheid_speler_id_speler_id_fk" FOREIGN KEY ("speler_id") REFERENCES "public"."speler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aanwezigheid" ADD CONSTRAINT "aanwezigheid_gezet_door_speler_id_speler_id_fk" FOREIGN KEY ("gezet_door_speler_id") REFERENCES "public"."speler"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uitnodiging" ADD CONSTRAINT "uitnodiging_speler_id_speler_id_fk" FOREIGN KEY ("speler_id") REFERENCES "public"."speler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aanwezigheid_event_speler_idx" ON "aanwezigheid" USING btree ("event_id","speler_id","gezet_op");--> statement-breakpoint
CREATE INDEX "event_start_op_idx" ON "event" USING btree ("start_op");--> statement-breakpoint
INSERT INTO "eventtype_instelling" ("type", "deadline_uren_voor_aanvang")
VALUES ('training', 24), ('wedstrijd', 48)
ON CONFLICT ("type") DO NOTHING;
