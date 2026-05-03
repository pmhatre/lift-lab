/**
 * Map Drizzle row objects to the API DTO shapes the frontend expects.
 * The DTO field names are snake_case to match the existing contract in
 * src/lib/api.ts (Exercise, SetData, SessionExercise, TrainingSession, ...).
 */
import type {
  Exercise as ExerciseRow,
  Session as SessionRow,
  SetRow,
} from "@/db/schema";

export interface ExerciseDto {
  id: number;
  name: string;
  aliases: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string | null;
  movement_pattern: string | null;
  is_compound: boolean;
  target_reps_low: number | null;
  target_reps_high: number | null;
  progression_enabled: boolean;
  notes: string | null;
}

export interface SetDto {
  id: number;
  set_number: number;
  reps: number | null;
  weight_lbs: number | null;
  is_warmup: boolean;
  rpe: number | null;
  rir: number | null;
  status: string;
  notes: string | null;
}

export interface SessionExerciseDto {
  id: number;
  exercise_id: number;
  exercise_name: string;
  exercise_order: number | null;
  notes: string | null;
  sets: SetDto[];
}

export interface SessionDto {
  id: number;
  date: string;
  day_type: string | null;
  emphasis: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  body_weight_lbs: number | null;
  notes: string | null;
  source: string | null;
  exercises?: SessionExerciseDto[];
  exercise_count?: number;
}

export function exerciseToDto(row: ExerciseRow): ExerciseDto {
  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases ?? [],
    primary_muscles: row.primaryMuscles ?? [],
    secondary_muscles: row.secondaryMuscles ?? [],
    equipment: row.equipment,
    movement_pattern: row.movementPattern,
    is_compound: row.isCompound,
    target_reps_low: row.targetRepsLow,
    target_reps_high: row.targetRepsHigh,
    progression_enabled: row.progressionEnabled,
    notes: row.notes,
  };
}

export function setToDto(row: SetRow): SetDto {
  return {
    id: row.id,
    set_number: row.setNumber,
    reps: row.reps,
    weight_lbs: row.weightLbs,
    is_warmup: row.isWarmup,
    rpe: row.rpe,
    rir: row.rir,
    status: row.status,
    notes: row.notes,
  };
}

export function sessionToDto(
  row: SessionRow,
  extras?: { exercises?: SessionExerciseDto[]; exercise_count?: number }
): SessionDto {
  return {
    id: row.id,
    date: row.sessionDate,
    day_type: row.dayType,
    emphasis: row.emphasis,
    started_at: row.startedAt ? row.startedAt.toISOString() : null,
    ended_at: row.endedAt ? row.endedAt.toISOString() : null,
    duration_minutes: row.durationMinutes,
    body_weight_lbs: row.bodyWeightLbs,
    notes: row.notes,
    source: row.source,
    ...(extras?.exercises !== undefined ? { exercises: extras.exercises } : {}),
    ...(extras?.exercise_count !== undefined
      ? { exercise_count: extras.exercise_count }
      : {}),
  };
}
