/**
 * Zod schemas for Route Handler request bodies. Direct port of the original
 * Pydantic schemas in backend/schemas.py.
 *
 * Response shapes remain plain objects (built by the data layer) — we don't
 * round-trip them through Zod since they come from typed Drizzle queries.
 */
import { z } from "zod";

// ─── Exercises ────────────────────────────────────────────────────────────────

export const ExerciseCreateSchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  primary_muscles: z.array(z.string()).default([]),
  secondary_muscles: z.array(z.string()).default([]),
  equipment: z.string().nullable().optional(),
  movement_pattern: z.string().nullable().optional(),
  is_compound: z.boolean().default(false),
  notes: z.string().nullable().optional(),
});

export const ExerciseUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  aliases: z.array(z.string()).optional(),
  primary_muscles: z.array(z.string()).optional(),
  secondary_muscles: z.array(z.string()).optional(),
  equipment: z.string().nullable().optional(),
  movement_pattern: z.string().nullable().optional(),
  is_compound: z.boolean().optional(),
  target_reps_low: z.number().int().nullable().optional(),
  target_reps_high: z.number().int().nullable().optional(),
  progression_enabled: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const SessionCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day_type: z.string().nullable().optional(),
  emphasis: z.string().nullable().optional(),
  body_weight_lbs: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const SessionUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  day_type: z.string().nullable().optional(),
  emphasis: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  ended_at: z.string().nullable().optional(),
  duration_minutes: z.number().int().nullable().optional(),
  body_weight_lbs: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ─── Session exercises ────────────────────────────────────────────────────────

export const SessionExerciseCreateSchema = z.object({
  exercise_id: z.number().int(),
  exercise_order: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const SessionExerciseUpdateSchema = z.object({
  exercise_order: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ─── Sets ─────────────────────────────────────────────────────────────────────

export const SetCreateSchema = z.object({
  set_number: z.number().int().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  weight_lbs: z.number().nullable().optional(),
  is_warmup: z.boolean().default(false),
  rpe: z.number().nullable().optional(),
  rir: z.number().int().nullable().optional(),
  status: z.string().default("done"),
  notes: z.string().nullable().optional(),
});

export const SetUpdateSchema = z.object({
  set_number: z.number().int().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  weight_lbs: z.number().nullable().optional(),
  is_warmup: z.boolean().optional(),
  rpe: z.number().nullable().optional(),
  rir: z.number().int().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
});

// ─── PR check ─────────────────────────────────────────────────────────────────

export const PRCheckSchema = z.object({
  session_id: z.number().int(),
});

// ─── Bulk session finalize ────────────────────────────────────────────────────

export const FinalizeSetSchema = z.object({
  reps: z.number().int().nullable().optional(),
  weight_lbs: z.number().nullable().optional(),
  is_warmup: z.boolean().default(false),
  rpe: z.number().nullable().optional(),
  rir: z.number().int().nullable().optional(),
});

export const FinalizeExerciseSchema = z.object({
  exercise_id: z.number().int(),
  notes: z.string().nullable().optional(),
  sets: z.array(FinalizeSetSchema).default([]),
});

export const FinalizeSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  day_type: z.string().nullable().optional(),
  body_weight_lbs: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  exercises: z.array(FinalizeExerciseSchema).default([]),
});

// Inferred types for use in handlers
export type ExerciseCreate = z.infer<typeof ExerciseCreateSchema>;
export type ExerciseUpdate = z.infer<typeof ExerciseUpdateSchema>;
export type SessionCreate = z.infer<typeof SessionCreateSchema>;
export type SessionUpdate = z.infer<typeof SessionUpdateSchema>;
export type SessionExerciseCreate = z.infer<typeof SessionExerciseCreateSchema>;
export type SessionExerciseUpdate = z.infer<typeof SessionExerciseUpdateSchema>;
export type SetCreate = z.infer<typeof SetCreateSchema>;
export type SetUpdate = z.infer<typeof SetUpdateSchema>;
export type PRCheck = z.infer<typeof PRCheckSchema>;
export type FinalizeSession = z.infer<typeof FinalizeSessionSchema>;
export type FinalizeExercise = z.infer<typeof FinalizeExerciseSchema>;
export type FinalizeSet = z.infer<typeof FinalizeSetSchema>;
