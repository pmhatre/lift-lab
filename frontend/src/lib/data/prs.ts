/**
 * PR detection and listing.
 *
 * `recordPrsForSession` is idempotent — re-running on the same session does not
 * create duplicate rows. Used by both POST /api/prs/check (after session save)
 * and POST /api/sessions/finalize (inline).
 */
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  exercises,
  prRecords,
  sessions,
  sessionExercises,
  sets,
  type NewPRRecord,
} from "@/db/schema";

export interface NewPrRow {
  exercise: string;
  type: string;
  value: number;
  previous: number;
}

export interface PrRecordDto {
  id: number;
  date: string;
  exercise_name: string;
  pr_type: string;
  pr_value: number;
  previous_value: number | null;
}

const EPLEY = (weight: number | null, reps: number | null): number => {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
};

export async function recordPrsForSession(sessionId: number): Promise<NewPrRow[]> {
  const db = getDb();

  const ses = await db
    .select({
      seId: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
      exerciseName: exercises.name,
    })
    .from(sessionExercises)
    .innerJoin(exercises, eq(exercises.id, sessionExercises.exerciseId))
    .where(eq(sessionExercises.sessionId, sessionId));

  const newPrs: NewPrRow[] = [];

  for (const se of ses) {
    const workingSets = await db
      .select()
      .from(sets)
      .where(
        and(
          eq(sets.sessionExerciseId, se.seId),
          eq(sets.isWarmup, false),
          eq(sets.status, "done")
        )
      )
      .orderBy(sets.setNumber);

    if (workingSets.length === 0) continue;

    const maxWeight = workingSets.reduce(
      (m, s) => Math.max(m, s.weightLbs ?? 0),
      0
    );
    const bestSet = workingSets.reduce((best, s) =>
      EPLEY(s.weightLbs, s.reps) > EPLEY(best.weightLbs, best.reps) ? s : best
    );
    const e1rm = bestSet.weightLbs
      ? Math.round(EPLEY(bestSet.weightLbs, bestSet.reps) * 10) / 10
      : null;

    // All-time stats for this exercise, excluding the current session.
    const [{ allTimeMaxWeight, allTimeMaxE1rm }] = await db
      .select({
        allTimeMaxWeight: sql<number | null>`max(${sets.weightLbs})`,
        allTimeMaxE1rm: sql<number | null>`max(${sets.weightLbs} * (1 + ${sets.reps} / 30.0))`,
      })
      .from(sets)
      .innerJoin(sessionExercises, eq(sessionExercises.id, sets.sessionExerciseId))
      .innerJoin(sessions, eq(sessions.id, sessionExercises.sessionId))
      .where(
        and(
          eq(sessionExercises.exerciseId, se.exerciseId),
          ne(sessions.id, sessionId),
          eq(sets.isWarmup, false),
          eq(sets.status, "done")
        )
      );

    const allTimeWeight = allTimeMaxWeight ?? 0;
    const allTimeE1rm = allTimeMaxE1rm ?? 0;

    // Existing PR types already recorded for this session+exercise (idempotency).
    const existing = await db
      .select({ prType: prRecords.prType })
      .from(prRecords)
      .where(
        and(
          eq(prRecords.sessionId, sessionId),
          eq(prRecords.exerciseId, se.exerciseId)
        )
      );
    const existingTypes = new Set(existing.map((r) => r.prType));

    const inserts: NewPRRecord[] = [];

    if (maxWeight > allTimeWeight && !existingTypes.has("weight")) {
      inserts.push({
        sessionId,
        exerciseId: se.exerciseId,
        sessionExerciseId: se.seId,
        prType: "weight",
        prValue: maxWeight,
        previousValue: allTimeWeight > 0 ? allTimeWeight : null,
      });
      newPrs.push({
        exercise: se.exerciseName,
        type: "weight",
        value: maxWeight,
        previous: allTimeWeight,
      });
    }

    if (e1rm != null && e1rm > allTimeE1rm && !existingTypes.has("e1rm")) {
      inserts.push({
        sessionId,
        exerciseId: se.exerciseId,
        sessionExerciseId: se.seId,
        prType: "e1rm",
        prValue: e1rm,
        previousValue: allTimeE1rm > 0 ? allTimeE1rm : null,
      });
      newPrs.push({
        exercise: se.exerciseName,
        type: "e1rm",
        value: e1rm,
        previous: allTimeE1rm,
      });
    }

    if (inserts.length) {
      await db.insert(prRecords).values(inserts);
    }
  }

  return newPrs;
}

export async function recentPrs(days = 30, limit = 10): Promise<PrRecordDto[]> {
  const db = getDb();
  const cutoff = new Date(Date.now() - days * 86400 * 1000)
    .toISOString()
    .slice(0, 10);

  const rows = await db
    .select({
      id: prRecords.id,
      date: sessions.sessionDate,
      exerciseName: exercises.name,
      prType: prRecords.prType,
      prValue: prRecords.prValue,
      previousValue: prRecords.previousValue,
    })
    .from(prRecords)
    .innerJoin(sessions, eq(sessions.id, prRecords.sessionId))
    .innerJoin(exercises, eq(exercises.id, prRecords.exerciseId))
    .where(gte(sessions.sessionDate, cutoff))
    .orderBy(desc(prRecords.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    exercise_name: r.exerciseName,
    pr_type: r.prType,
    pr_value: r.prValue,
    previous_value: r.previousValue,
  }));
}
