/**
 * Drizzle schema — Postgres port of the original SQLModel models.
 *
 * Key adaptations from the SQLite schema:
 * - JSON-string columns (aliases, primary_muscles, secondary_muscles) → native jsonb
 * - dt.date → Postgres `date` (Drizzle returns ISO date strings)
 * - dt.datetime → `timestamp with time zone` (Drizzle returns Date objects)
 * - DB column names preserved where SQLModel renamed them via sa_column_kwargs:
 *   session_date → "date", nutrition_date → "date", whoop_date → "date"
 */
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  date,
  doublePrecision,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Exercises ────────────────────────────────────────────────────────────────

export const exercises = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().default([]),
    primaryMuscles: jsonb("primary_muscles").$type<string[]>().default([]),
    secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().default([]),
    equipment: text("equipment"),
    movementPattern: text("movement_pattern"),
    isCompound: boolean("is_compound").notNull().default(false),
    targetRepsLow: integer("target_reps_low"),
    targetRepsHigh: integer("target_reps_high"),
    progressionEnabled: boolean("progression_enabled").notNull().default(false),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("ux_exercises_name").on(t.name)]
);

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    sessionDate: date("date").notNull(),
    dayType: text("day_type"),
    emphasis: text("emphasis"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    bodyWeightLbs: doublePrecision("body_weight_lbs"),
    notes: text("notes"),
    source: text("source"),
    sourceId: text("source_id"),
  },
  (t) => [index("ix_sessions_date").on(t.sessionDate)]
);

// ─── Session Exercises ────────────────────────────────────────────────────────

export const sessionExercises = pgTable(
  "session_exercises",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id),
    exerciseOrder: integer("exercise_order"),
    notes: text("notes"),
  },
  (t) => [
    index("ix_session_exercises_session_id").on(t.sessionId),
    index("ix_session_exercises_exercise_id").on(t.exerciseId),
  ]
);

// ─── Sets ─────────────────────────────────────────────────────────────────────

export const sets = pgTable(
  "sets",
  {
    id: serial("id").primaryKey(),
    sessionExerciseId: integer("session_exercise_id")
      .notNull()
      .references(() => sessionExercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps"),
    weightLbs: doublePrecision("weight_lbs"),
    isWarmup: boolean("is_warmup").notNull().default(false),
    rpe: doublePrecision("rpe"),
    rir: integer("rir"),
    status: text("status").notNull().default("done"),
    notes: text("notes"),
  },
  (t) => [index("ix_sets_session_exercise_id").on(t.sessionExerciseId)]
);

// ─── DEXA scans ───────────────────────────────────────────────────────────────

export const dexaScans = pgTable(
  "dexa_scans",
  {
    id: serial("id").primaryKey(),
    scanDate: date("scan_date").notNull(),
    totalLbs: doublePrecision("total_lbs"),
    leanLbs: doublePrecision("lean_lbs"),
    fatLbs: doublePrecision("fat_lbs"),
    bfPct: doublePrecision("bf_pct"),
    armsLbs: doublePrecision("arms_lbs"),
    legsLbs: doublePrecision("legs_lbs"),
    trunkLbs: doublePrecision("trunk_lbs"),
    vatKg: doublePrecision("vat_kg"),
    source: text("source").notNull().default("bodyspec"),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("ux_dexa_scans_scan_date").on(t.scanDate)]
);

// ─── Nutrition (MacroFactor) ──────────────────────────────────────────────────

export const nutritionDays = pgTable(
  "nutrition_days",
  {
    id: serial("id").primaryKey(),
    nutritionDate: date("date").notNull(),
    calories: doublePrecision("calories"),
    proteinG: doublePrecision("protein_g"),
    carbsG: doublePrecision("carbs_g"),
    fatG: doublePrecision("fat_g"),
    bodyWeightLbs: doublePrecision("body_weight_lbs"),
  },
  (t) => [uniqueIndex("ux_nutrition_days_date").on(t.nutritionDate)]
);

// ─── Whoop ────────────────────────────────────────────────────────────────────

export const whoopDays = pgTable(
  "whoop_days",
  {
    id: serial("id").primaryKey(),
    whoopDate: date("date").notNull(),
    recoveryScore: doublePrecision("recovery_score"),
    hrvMs: doublePrecision("hrv_ms"),
    rhrBpm: doublePrecision("rhr_bpm"),
    sleepHours: doublePrecision("sleep_hours"),
    strain: doublePrecision("strain"),
    zone45Minutes: doublePrecision("zone4_5_minutes"),
  },
  (t) => [uniqueIndex("ux_whoop_days_date").on(t.whoopDate)]
);

// ─── Microcycles ──────────────────────────────────────────────────────────────

export const microcycles = pgTable("microcycles", {
  id: serial("id").primaryKey(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  label: text("label"),
  notes: text("notes"),
});

// ─── PR records ───────────────────────────────────────────────────────────────

export const prRecords = pgTable(
  "pr_records",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id),
    sessionExerciseId: integer("session_exercise_id")
      .notNull()
      .references(() => sessionExercises.id, { onDelete: "cascade" }),
    prType: text("pr_type").notNull(),
    prValue: doublePrecision("pr_value").notNull(),
    previousValue: doublePrecision("previous_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_pr_records_session_id").on(t.sessionId),
    index("ix_pr_records_exercise_id").on(t.exerciseId),
    index("ix_pr_records_session_exercise_id").on(t.sessionExerciseId),
  ]
);

// ─── Inferred row types (for use in the data-loading layer) ───────────────────

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionExercise = typeof sessionExercises.$inferSelect;
export type NewSessionExercise = typeof sessionExercises.$inferInsert;
export type SetRow = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;
export type DexaScan = typeof dexaScans.$inferSelect;
export type NutritionDay = typeof nutritionDays.$inferSelect;
export type WhoopDay = typeof whoopDays.$inferSelect;
export type Microcycle = typeof microcycles.$inferSelect;
export type PRRecord = typeof prRecords.$inferSelect;
export type NewPRRecord = typeof prRecords.$inferInsert;
