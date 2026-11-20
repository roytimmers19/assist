ALTER TABLE "boete" ADD COLUMN "aantal" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "boetesoort" ADD COLUMN "per_stuk" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "boete" ADD CONSTRAINT "boete_aantal_positief" CHECK ("boete"."aantal" > 0);