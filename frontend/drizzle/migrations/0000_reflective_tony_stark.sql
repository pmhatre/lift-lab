CREATE TABLE "dexa_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_date" date NOT NULL,
	"total_lbs" double precision,
	"lean_lbs" double precision,
	"fat_lbs" double precision,
	"bf_pct" double precision,
	"arms_lbs" double precision,
	"legs_lbs" double precision,
	"trunk_lbs" double precision,
	"vat_kg" double precision,
	"source" text DEFAULT 'bodyspec' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"primary_muscles" jsonb DEFAULT '[]'::jsonb,
	"secondary_muscles" jsonb DEFAULT '[]'::jsonb,
	"equipment" text,
	"movement_pattern" text,
	"is_compound" boolean DEFAULT false NOT NULL,
	"target_reps_low" integer,
	"target_reps_high" integer,
	"progression_enabled" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "microcycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"label" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "nutrition_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"calories" double precision,
	"protein_g" double precision,
	"carbs_g" double precision,
	"fat_g" double precision,
	"body_weight_lbs" double precision
);
--> statement-breakpoint
CREATE TABLE "pr_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"session_exercise_id" integer NOT NULL,
	"pr_type" text NOT NULL,
	"pr_value" double precision NOT NULL,
	"previous_value" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"exercise_order" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"day_type" text,
	"emphasis" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_minutes" integer,
	"body_weight_lbs" double precision,
	"notes" text,
	"source" text,
	"source_id" text
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_exercise_id" integer NOT NULL,
	"set_number" integer NOT NULL,
	"reps" integer,
	"weight_lbs" double precision,
	"is_warmup" boolean DEFAULT false NOT NULL,
	"rpe" double precision,
	"rir" integer,
	"status" text DEFAULT 'done' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "whoop_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"recovery_score" double precision,
	"hrv_ms" double precision,
	"rhr_bpm" double precision,
	"sleep_hours" double precision,
	"strain" double precision,
	"zone4_5_minutes" double precision
);
--> statement-breakpoint
ALTER TABLE "pr_records" ADD CONSTRAINT "pr_records_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_records" ADD CONSTRAINT "pr_records_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_records" ADD CONSTRAINT "pr_records_session_exercise_id_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercises" ADD CONSTRAINT "session_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_session_exercise_id_session_exercises_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_dexa_scans_scan_date" ON "dexa_scans" USING btree ("scan_date");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_exercises_name" ON "exercises" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_nutrition_days_date" ON "nutrition_days" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ix_pr_records_session_id" ON "pr_records" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ix_pr_records_exercise_id" ON "pr_records" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "ix_pr_records_session_exercise_id" ON "pr_records" USING btree ("session_exercise_id");--> statement-breakpoint
CREATE INDEX "ix_session_exercises_session_id" ON "session_exercises" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ix_session_exercises_exercise_id" ON "session_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "ix_sessions_date" ON "sessions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ix_sets_session_exercise_id" ON "sets" USING btree ("session_exercise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_whoop_days_date" ON "whoop_days" USING btree ("date");