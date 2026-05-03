/**
 * Sessions, session-exercises, and sets — the write-heavy core. Includes the
 * bulk-finalize transaction that the new-session flow uses.
 */
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  exercises,
  sessions,
  sessionExercises,
  sets,
  type NewSession,
} from "@/db/schema";
import {
  sessionToDto,
  setToDto,
  type SessionDto,
  type SessionExerciseDto,
  type SetDto,
} from "./serializers";
import { recordPrsForSession, type NewPrRow } from "./prs";

// ─── Session list / detail ────────────────────────────────────────────────────

export interface ListSessionsResult {
  total: number;
  sessions: SessionDto[];
}

export async function listSessions(params: {
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}): Promise<ListSessionsResult> {
  const db = getDb();
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const where = and(
    params.start ? gte(sessions.sessionDate, params.start) : undefined,
    params.end ? lte(sessions.sessionDate, params.end) : undefined
  );

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(sessions);

  const rows = await db
    .select()
    .from(sessions)
    .where(where)
    .orderBy(desc(sessions.sessionDate))
    .limit(limit)
    .offset(offset);

  return { total: count, sessions: rows.map((r) => sessionToDto(r)) };
}

export async function getSessionDetail(id: number): Promise<SessionDto | null> {
  const db = getDb();
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) return null;

  const exerciseRows = await db
    .select({
      se: sessionExercises,
      exerciseName: exercises.name,
    })
    .from(sessionExercises)
    .innerJoin(exercises, eq(exercises.id, sessionExercises.exerciseId))
    .where(eq(sessionExercises.sessionId, id))
    .orderBy(asc(sessionExercises.exerciseOrder));

  const seIds = exerciseRows.map((r) => r.se.id);
  const allSets =
    seIds.length === 0
      ? []
      : await db
          .select()
          .from(sets)
          .where(inArray(sets.sessionExerciseId, seIds))
          .orderBy(asc(sets.setNumber));

  const setsBySe = new Map<number, typeof allSets>();
  for (const s of allSets) {
    const list = setsBySe.get(s.sessionExerciseId) ?? [];
    list.push(s);
    setsBySe.set(s.sessionExerciseId, list);
  }

  const sessionExerciseDtos: SessionExerciseDto[] = exerciseRows.map((r) => ({
    id: r.se.id,
    exercise_id: r.se.exerciseId,
    exercise_name: r.exerciseName,
    exercise_order: r.se.exerciseOrder,
    notes: r.se.notes,
    sets: (setsBySe.get(r.se.id) ?? []).map(setToDto),
  }));

  return sessionToDto(session, { exercises: sessionExerciseDtos });
}

// ─── Session create / update / delete ─────────────────────────────────────────

export async function createSession(input: {
  date: string;
  dayType: string | null;
  emphasis: string | null;
  bodyWeightLbs: number | null;
  notes: string | null;
}): Promise<SessionDto> {
  const db = getDb();
  const insert: NewSession = {
    sessionDate: input.date,
    dayType: input.dayType,
    emphasis: input.emphasis,
    bodyWeightLbs: input.bodyWeightLbs,
    notes: input.notes,
    source: "native",
  };
  const [row] = await db.insert(sessions).values(insert).returning();
  return sessionToDto(row);
}

interface SessionUpdateInput {
  sessionDate?: string;
  dayType?: string | null;
  emphasis?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationMinutes?: number | null;
  bodyWeightLbs?: number | null;
  notes?: string | null;
}

export async function updateSession(
  id: number,
  patch: SessionUpdateInput
): Promise<SessionDto | null> {
  const db = getDb();
  const [row] = await db
    .update(sessions)
    .set(patch)
    .where(eq(sessions.id, id))
    .returning();
  return row ? sessionToDto(row) : null;
}

export async function deleteSession(id: number): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id });
  return rows.length > 0;
}

// ─── Session exercises ────────────────────────────────────────────────────────

export interface AddExerciseResult {
  id: number;
  exercise_id: number;
  exercise_name: string;
}

export async function addExerciseToSession(
  sessionId: number,
  input: { exerciseId: number; exerciseOrder: number | null; notes: string | null }
): Promise<AddExerciseResult | { error: "session_not_found" | "exercise_not_found" }> {
  const db = getDb();
  const [s] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!s) return { error: "session_not_found" };
  const [ex] = await db.select().from(exercises).where(eq(exercises.id, input.exerciseId));
  if (!ex) return { error: "exercise_not_found" };

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number | null>`max(${sessionExercises.exerciseOrder})` })
    .from(sessionExercises)
    .where(eq(sessionExercises.sessionId, sessionId));
  const computedOrder = (maxOrder ?? -1) + 1;

  const [row] = await db
    .insert(sessionExercises)
    .values({
      sessionId,
      exerciseId: input.exerciseId,
      exerciseOrder: input.exerciseOrder ?? computedOrder,
      notes: input.notes,
    })
    .returning();

  return { id: row.id, exercise_id: row.exerciseId, exercise_name: ex.name };
}

export async function updateSessionExercise(
  seId: number,
  patch: { exerciseOrder?: number | null; notes?: string | null }
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(sessionExercises)
    .set(patch)
    .where(eq(sessionExercises.id, seId))
    .returning({ id: sessionExercises.id });
  return rows.length > 0;
}

export async function deleteSessionExercise(seId: number): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(sessionExercises)
    .where(eq(sessionExercises.id, seId))
    .returning({ id: sessionExercises.id });
  return rows.length > 0;
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export async function addSet(
  seId: number,
  input: {
    setNumber: number | null;
    reps: number | null;
    weightLbs: number | null;
    isWarmup: boolean;
    rpe: number | null;
    rir: number | null;
    status: string;
    notes: string | null;
  }
): Promise<SetDto | null> {
  const db = getDb();
  const [se] = await db.select().from(sessionExercises).where(eq(sessionExercises.id, seId));
  if (!se) return null;

  const [{ maxNum }] = await db
    .select({ maxNum: sql<number | null>`max(${sets.setNumber})` })
    .from(sets)
    .where(eq(sets.sessionExerciseId, seId));
  const computedSetNumber = (maxNum ?? 0) + 1;

  const [row] = await db
    .insert(sets)
    .values({
      sessionExerciseId: seId,
      setNumber: input.setNumber ?? computedSetNumber,
      reps: input.reps,
      weightLbs: input.weightLbs,
      isWarmup: input.isWarmup,
      rpe: input.rpe,
      rir: input.rir,
      status: input.status,
      notes: input.notes,
    })
    .returning();
  return setToDto(row);
}

export async function updateSet(
  setId: number,
  patch: {
    setNumber?: number;
    reps?: number | null;
    weightLbs?: number | null;
    isWarmup?: boolean;
    rpe?: number | null;
    rir?: number | null;
    status?: string;
    notes?: string | null;
  }
): Promise<SetDto | null> {
  const db = getDb();
  const [row] = await db.update(sets).set(patch).where(eq(sets.id, setId)).returning();
  return row ? setToDto(row) : null;
}

export async function deleteSet(setId: number): Promise<boolean> {
  const db = getDb();
  const rows = await db.delete(sets).where(eq(sets.id, setId)).returning({ id: sets.id });
  return rows.length > 0;
}

// ─── Bulk finalize ────────────────────────────────────────────────────────────

export interface FinalizeInput {
  date: string;
  dayType: string | null;
  bodyWeightLbs: number | null;
  notes: string | null;
  exercises: Array<{
    exerciseId: number;
    notes: string | null;
    sets: Array<{
      reps: number | null;
      weightLbs: number | null;
      isWarmup: boolean;
      rpe: number | null;
      rir: number | null;
    }>;
  }>;
}

export interface FinalizeResult {
  session: SessionDto;
  new_prs: Array<{ exercise: string; type: string; value: number; previous: number }>;
}

export async function finalizeSession(input: FinalizeInput): Promise<FinalizeResult> {
  const db = getDb();

  // neon-http does not support multi-statement transactions. We batch sequential
  // writes and rely on the bulk-finalize semantics: if any insert throws, the
  // route handler returns 500 and the user retries. For multi-statement atomic
  // semantics we'd switch to neon-serverless (websocket Pool). Pragmatically
  // acceptable for the current single-user scale.
  const [sessionRow] = await db
    .insert(sessions)
    .values({
      sessionDate: input.date,
      dayType: input.dayType,
      bodyWeightLbs: input.bodyWeightLbs,
      notes: input.notes,
      source: "native",
    })
    .returning();

  const exerciseDtos: SessionExerciseDto[] = [];

  for (let order = 0; order < input.exercises.length; order++) {
    const exIn = input.exercises[order];
    const [ex] = await db.select().from(exercises).where(eq(exercises.id, exIn.exerciseId));
    if (!ex) {
      throw new Error(`Exercise ${exIn.exerciseId} not found`);
    }

    const [seRow] = await db
      .insert(sessionExercises)
      .values({
        sessionId: sessionRow.id,
        exerciseId: exIn.exerciseId,
        exerciseOrder: order,
        notes: exIn.notes,
      })
      .returning();

    let setNumber = 0;
    const setsToInsert: Array<{
      sessionExerciseId: number;
      setNumber: number;
      reps: number | null;
      weightLbs: number | null;
      isWarmup: boolean;
      rpe: number | null;
      rir: number | null;
      status: string;
    }> = [];
    for (const s of exIn.sets) {
      if (s.reps == null && s.weightLbs == null) continue;
      setNumber += 1;
      setsToInsert.push({
        sessionExerciseId: seRow.id,
        setNumber,
        reps: s.reps,
        weightLbs: s.weightLbs,
        isWarmup: s.isWarmup,
        rpe: s.rpe,
        rir: s.rir,
        status: "done",
      });
    }
    const insertedSets = setsToInsert.length
      ? await db.insert(sets).values(setsToInsert).returning()
      : [];

    exerciseDtos.push({
      id: seRow.id,
      exercise_id: ex.id,
      exercise_name: ex.name,
      exercise_order: order,
      notes: seRow.notes,
      sets: insertedSets.map(setToDto),
    });
  }

  const newPrs = await recordPrsForSession(sessionRow.id);

  return {
    session: sessionToDto(sessionRow, { exercises: exerciseDtos }),
    new_prs: newPrs,
  };
}

// Prevent unused import warning while keeping the type available for callers.
export type { NewPrRow };
