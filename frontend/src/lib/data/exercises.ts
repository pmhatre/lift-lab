/**
 * Exercise data layer. Pure Drizzle queries — no HTTP, no validation.
 * Callers (Route Handlers + RSCs) handle those.
 */
import { asc, desc, eq, ilike, max, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  exercises,
  sessionExercises,
  sessions,
  type NewExercise,
} from "@/db/schema";
import { exerciseToDto, type ExerciseDto } from "./serializers";

interface ExerciseUpdateInput {
  name?: string;
  aliases?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string | null;
  movementPattern?: string | null;
  isCompound?: boolean;
  targetRepsLow?: number | null;
  targetRepsHigh?: number | null;
  progressionEnabled?: boolean;
  notes?: string | null;
}

export async function listExercises(params: { q?: string; limit?: number }): Promise<ExerciseDto[]> {
  const db = getDb();
  const limit = params.limit ?? 50;
  let where = undefined;
  if (params.q) {
    const pattern = `%${params.q}%`;
    where = or(
      ilike(exercises.name, pattern),
      sql`${exercises.aliases}::text ilike ${pattern}`
    );
  }
  const rows = await db
    .select()
    .from(exercises)
    .where(where)
    .orderBy(asc(exercises.name))
    .limit(limit);
  return rows.map(exerciseToDto);
}

export async function getExercise(id: number): Promise<ExerciseDto | null> {
  const db = getDb();
  const [row] = await db.select().from(exercises).where(eq(exercises.id, id));
  return row ? exerciseToDto(row) : null;
}

export async function createExercise(input: {
  name: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  movementPattern: string | null;
  isCompound: boolean;
  notes: string | null;
}): Promise<ExerciseDto> {
  const db = getDb();
  const insert: NewExercise = {
    name: input.name,
    aliases: input.aliases,
    primaryMuscles: input.primaryMuscles,
    secondaryMuscles: input.secondaryMuscles,
    equipment: input.equipment,
    movementPattern: input.movementPattern,
    isCompound: input.isCompound,
    notes: input.notes,
  };
  const [row] = await db.insert(exercises).values(insert).returning();
  return exerciseToDto(row);
}

export async function updateExercise(
  id: number,
  patch: ExerciseUpdateInput
): Promise<ExerciseDto | null> {
  const db = getDb();
  // Drizzle accepts undefined → field unchanged. Empty patch is a no-op update.
  const [row] = await db
    .update(exercises)
    .set(patch)
    .where(eq(exercises.id, id))
    .returning();
  return row ? exerciseToDto(row) : null;
}

export interface RecentExerciseDto {
  id: number;
  name: string;
  last_used: string;
}

export async function recentExercises(limit = 20): Promise<RecentExerciseDto[]> {
  const db = getDb();
  // Most recent unique exercises performed, ordered by max(session_date) desc.
  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      lastDate: max(sessions.sessionDate),
    })
    .from(exercises)
    .innerJoin(sessionExercises, eq(sessionExercises.exerciseId, exercises.id))
    .innerJoin(sessions, eq(sessions.id, sessionExercises.sessionId))
    .groupBy(exercises.id, exercises.name)
    .orderBy(desc(max(sessions.sessionDate)))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    last_used: r.lastDate ?? "",
  }));
}
