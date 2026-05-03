/**
 * Analytics queries — volume, frequency, exercise history, beat-the-logbook,
 * body composition, dashboard.
 *
 * Translated from Python loops in backend/main.py into Postgres aggregations.
 * Fixes the N+1 patterns called out in the original audit.
 */
import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  dexaScans,
  exercises,
  nutritionDays,
  prRecords,
  sessions,
  sessionExercises,
  sets,
} from "@/db/schema";
import {
  exerciseToDto,
  sessionToDto,
  type ExerciseDto,
  type SessionDto,
} from "./serializers";
import { recentPrs } from "./prs";

// ─── Volume ───────────────────────────────────────────────────────────────────

export interface VolumeRow {
  period: string;
  [muscle: string]: number | string;
}

export interface VolumeResult {
  data: VolumeRow[];
  muscle_groups: string[];
}

export async function volumeByMuscleGroup(params: {
  start?: string;
  end?: string;
  groupBy?: "week" | "session";
}): Promise<VolumeResult> {
  const db = getDb();
  const groupBy = params.groupBy ?? "week";

  // Default end = latest session date (consistent with the audit fix); default
  // window = last 8 weeks.
  let end = params.end;
  if (!end) {
    const [{ latest }] = await db
      .select({ latest: sql<string | null>`max(${sessions.sessionDate})` })
      .from(sessions);
    end = latest ?? new Date().toISOString().slice(0, 10);
  }
  let start = params.start;
  if (!start) {
    const endDate = new Date(`${end}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() - 7 * 8);
    start = endDate.toISOString().slice(0, 10);
  }

  const periodExpr =
    groupBy === "week"
      ? sql<string>`to_char(date_trunc('week', ${sessions.sessionDate}::timestamp), 'YYYY-MM-DD')`
      : sql<string>`to_char(${sessions.sessionDate}, 'YYYY-MM-DD')`;

  // Working set count, per period, per primary muscle. The LATERAL join unnests
  // each exercise's primary_muscles jsonb array into one row per muscle.
  const rows = await db.execute<{
    period: string;
    muscle: string;
    set_count: number;
  }>(sql`
    SELECT
      ${periodExpr} AS period,
      muscle.value AS muscle,
      cast(count(${sets.id}) AS int) AS set_count
    FROM ${sets}
    INNER JOIN ${sessionExercises} ON ${sessionExercises.id} = ${sets.sessionExerciseId}
    INNER JOIN ${sessions} ON ${sessions.id} = ${sessionExercises.sessionId}
    INNER JOIN ${exercises} ON ${exercises.id} = ${sessionExercises.exerciseId}
    CROSS JOIN LATERAL jsonb_array_elements_text(${exercises.primaryMuscles}) AS muscle
    WHERE ${sets.isWarmup} = false
      AND ${sets.status} = 'done'
      AND ${sessions.sessionDate} >= ${start}
      AND ${sessions.sessionDate} <= ${end}
    GROUP BY period, muscle.value
    ORDER BY period, muscle.value
  `);

  const allMuscles = new Set<string>();
  const byPeriod = new Map<string, Record<string, number>>();
  for (const r of rows.rows) {
    allMuscles.add(r.muscle);
    const bucket = byPeriod.get(r.period) ?? {};
    bucket[r.muscle] = Number(r.set_count);
    byPeriod.set(r.period, bucket);
  }

  const muscleGroups = Array.from(allMuscles).sort();
  const data: VolumeRow[] = Array.from(byPeriod.keys())
    .sort()
    .map((period) => {
      const row: VolumeRow = { period };
      for (const m of muscleGroups) row[m] = byPeriod.get(period)?.[m] ?? 0;
      return row;
    });

  return { data, muscle_groups: muscleGroups };
}

// ─── Frequency ────────────────────────────────────────────────────────────────

export interface FrequencyResult {
  data: Array<{ week: string; sessions: number }>;
}

export async function frequency(weeks = 12): Promise<FrequencyResult> {
  const db = getDb();
  const [{ latest }] = await db
    .select({ latest: sql<string | null>`max(${sessions.sessionDate})` })
    .from(sessions);
  const endDate = latest ? new Date(`${latest}T00:00:00Z`) : new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - weeks * 7);

  const rows = await db.execute<{ week: string; session_count: number }>(sql`
    SELECT
      to_char(date_trunc('week', ${sessions.sessionDate}::timestamp), 'YYYY-MM-DD') AS week,
      cast(count(*) AS int) AS session_count
    FROM ${sessions}
    WHERE ${sessions.sessionDate} >= ${startDate.toISOString().slice(0, 10)}
      AND ${sessions.sessionDate} <= ${endDate.toISOString().slice(0, 10)}
    GROUP BY week
    ORDER BY week
  `);

  const map = new Map(rows.rows.map((r) => [r.week, Number(r.session_count)]));

  // Fill zero-weeks across the whole window so the chart x-axis is continuous.
  const data: Array<{ week: string; sessions: number }> = [];
  const cursor = new Date(startDate);
  // Snap cursor to the start of its ISO week (Monday 00:00 UTC).
  const day = cursor.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  cursor.setUTCDate(cursor.getUTCDate() + offset);
  while (cursor <= endDate) {
    const key = cursor.toISOString().slice(0, 10);
    data.push({ week: key, sessions: map.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return { data };
}

// ─── Exercise history ─────────────────────────────────────────────────────────

interface ExerciseHistorySetRow {
  set_number: number;
  reps: number | null;
  weight_lbs: number | null;
  rpe: number | null;
}

export interface ExerciseHistoryEntry {
  session_id: number;
  date: string;
  max_weight: number;
  volume_load: number;
  e1rm: number | null;
  sets: ExerciseHistorySetRow[];
}

export interface ExerciseHistoryResult {
  exercise: ExerciseDto;
  history: ExerciseHistoryEntry[];
}

export async function exerciseHistory(
  exerciseId: number,
  limit = 30
): Promise<ExerciseHistoryResult | null> {
  const db = getDb();
  const [ex] = await db.select().from(exercises).where(eq(exercises.id, exerciseId));
  if (!ex) return null;

  const rows = await db.execute<{
    session_id: number;
    session_date: string;
    max_weight: number | null;
    volume_load: number | null;
    e1rm: number | null;
    sets: ExerciseHistorySetRow[];
  }>(sql`
    SELECT
      ${sessions.id} AS session_id,
      ${sessions.sessionDate} AS session_date,
      max(${sets.weightLbs}) AS max_weight,
      sum(${sets.weightLbs} * ${sets.reps}) AS volume_load,
      max(${sets.weightLbs} * (1 + ${sets.reps} / 30.0)) AS e1rm,
      coalesce(
        json_agg(
          json_build_object(
            'set_number', ${sets.setNumber},
            'reps', ${sets.reps},
            'weight_lbs', ${sets.weightLbs},
            'rpe', ${sets.rpe}
          )
          ORDER BY ${sets.setNumber}
        ) FILTER (WHERE ${sets.id} IS NOT NULL),
        '[]'::json
      ) AS sets
    FROM ${sessions}
    INNER JOIN ${sessionExercises} ON ${sessionExercises.sessionId} = ${sessions.id}
    INNER JOIN ${sets} ON ${sets.sessionExerciseId} = ${sessionExercises.id}
    WHERE ${sessionExercises.exerciseId} = ${exerciseId}
      AND ${sets.isWarmup} = false
    GROUP BY ${sessions.id}, ${sessions.sessionDate}
    HAVING count(${sets.id}) > 0
    ORDER BY ${sessions.sessionDate} DESC
    LIMIT ${limit}
  `);

  // Reverse so the chart goes oldest→newest left to right (matches Python).
  const history: ExerciseHistoryEntry[] = rows.rows
    .map((r) => ({
      session_id: r.session_id,
      date: r.session_date,
      max_weight: Number(r.max_weight ?? 0),
      volume_load: Math.round(Number(r.volume_load ?? 0) * 10) / 10,
      e1rm: r.e1rm != null ? Math.round(Number(r.e1rm) * 10) / 10 : null,
      sets: r.sets,
    }))
    .reverse();

  return { exercise: exerciseToDto(ex), history };
}

// ─── Beat the logbook ─────────────────────────────────────────────────────────

interface BtlSet {
  reps: number | null;
  weight_lbs: number | null;
}

interface BtlSession {
  session_id: number;
  date: string;
  top_set_weight: number | null;
  top_set_reps: number | null;
  sets: BtlSet[];
  volume_load: number;
}

export interface BtlResult {
  exercise: ExerciseDto;
  last_session: BtlSession | null;
  prev_session: BtlSession | null;
  recent_sessions: BtlSession[];
  progression_status: "weight_pr" | "rep_pr" | "maintained" | "regression" | null;
  ready_to_progress: "ready" | "close" | "working" | null;
  reps_at_ceiling: Array<{ set: number; reps: number | null; at_ceiling: boolean }> | null;
}

export async function beatTheLogbook(
  exerciseId: number,
  n = 5
): Promise<BtlResult | null> {
  const db = getDb();
  const [ex] = await db.select().from(exercises).where(eq(exercises.id, exerciseId));
  if (!ex) return null;

  const rows = await db.execute<{
    session_id: number;
    session_date: string;
    sets: Array<{
      set_number: number;
      reps: number | null;
      weight_lbs: number | null;
    }>;
  }>(sql`
    SELECT
      ${sessions.id} AS session_id,
      ${sessions.sessionDate} AS session_date,
      coalesce(
        json_agg(
          json_build_object(
            'set_number', ${sets.setNumber},
            'reps', ${sets.reps},
            'weight_lbs', ${sets.weightLbs}
          )
          ORDER BY ${sets.setNumber}
        ) FILTER (WHERE ${sets.id} IS NOT NULL),
        '[]'::json
      ) AS sets
    FROM ${sessions}
    INNER JOIN ${sessionExercises} ON ${sessionExercises.sessionId} = ${sessions.id}
    INNER JOIN ${sets} ON ${sets.sessionExerciseId} = ${sessionExercises.id}
    WHERE ${sessionExercises.exerciseId} = ${exerciseId}
      AND ${sets.isWarmup} = false
      AND ${sets.status} = 'done'
    GROUP BY ${sessions.id}, ${sessions.sessionDate}
    HAVING count(${sets.id}) > 0
    ORDER BY ${sessions.sessionDate} DESC
    LIMIT ${n}
  `);

  const sessionsData: BtlSession[] = rows.rows.map((r) => {
    const setsArr = r.sets;
    const topSet = setsArr.reduce(
      (best, s) =>
        (s.weight_lbs ?? 0) > (best?.weight_lbs ?? 0) ? s : best,
      setsArr[0]
    );
    const volumeLoad =
      Math.round(
        setsArr.reduce(
          (acc, s) => acc + (s.weight_lbs ?? 0) * (s.reps ?? 0),
          0
        ) * 10
      ) / 10;
    return {
      session_id: r.session_id,
      date: r.session_date,
      top_set_weight: topSet?.weight_lbs ?? null,
      top_set_reps: topSet?.reps ?? null,
      sets: setsArr.map((s) => ({ reps: s.reps, weight_lbs: s.weight_lbs })),
      volume_load: volumeLoad,
    };
  });

  const last = sessionsData[0] ?? null;
  const prev = sessionsData[1] ?? null;

  let status: BtlResult["progression_status"] = null;
  if (last && prev) {
    const lw = last.top_set_weight ?? 0;
    const pw = prev.top_set_weight ?? 0;
    const lr = last.top_set_reps ?? 0;
    const pr = prev.top_set_reps ?? 0;
    if (lw > pw) status = "weight_pr";
    else if (lw === pw && lr > pr) status = "rep_pr";
    else if (lw < pw) status = "regression";
    else status = "maintained";
  }

  let readyToProgress: BtlResult["ready_to_progress"] = null;
  let repsAtCeiling: BtlResult["reps_at_ceiling"] = null;
  if (last && ex.targetRepsHigh && ex.progressionEnabled) {
    const ceiling = ex.targetRepsHigh;
    const all = last.sets;
    repsAtCeiling = all.map((s, i) => ({
      set: i + 1,
      reps: s.reps,
      at_ceiling: (s.reps ?? 0) >= ceiling,
    }));
    const topTwo = [...all].sort((a, b) => (b.reps ?? 0) - (a.reps ?? 0)).slice(0, 2);
    const atCeilingCount = topTwo.filter((s) => (s.reps ?? 0) >= ceiling).length;
    readyToProgress =
      atCeilingCount >= 2 ? "ready" : atCeilingCount === 1 ? "close" : "working";
  }

  return {
    exercise: exerciseToDto(ex),
    last_session: last,
    prev_session: prev,
    recent_sessions: sessionsData,
    progression_status: status,
    ready_to_progress: readyToProgress,
    reps_at_ceiling: repsAtCeiling,
  };
}

// ─── Body composition ─────────────────────────────────────────────────────────

export interface BodyCompositionResult {
  nutrition: Array<{ date: string; body_weight_lbs: number | null; calories: number | null }>;
  dexa_scans: Array<{
    date: string;
    total_lbs: number | null;
    lean_lbs: number | null;
    fat_lbs: number | null;
    bf_pct: number | null;
  }>;
  session_weights: Array<{ date: string; body_weight_lbs: number | null }>;
}

export async function bodyComposition(days = 90): Promise<BodyCompositionResult> {
  const db = getDb();
  const startDate = new Date(Date.now() - days * 86400 * 1000)
    .toISOString()
    .slice(0, 10);

  const [nutritionRows, dexaRows, sessionWeightRows] = await Promise.all([
    db
      .select()
      .from(nutritionDays)
      .where(gte(nutritionDays.nutritionDate, startDate))
      .orderBy(asc(nutritionDays.nutritionDate)),
    db.select().from(dexaScans).orderBy(asc(dexaScans.scanDate)),
    db
      .select()
      .from(sessions)
      .where(
        and(
          gte(sessions.sessionDate, startDate),
          isNotNull(sessions.bodyWeightLbs)
        )
      )
      .orderBy(asc(sessions.sessionDate)),
  ]);

  return {
    nutrition: nutritionRows.map((n) => ({
      date: n.nutritionDate,
      body_weight_lbs: n.bodyWeightLbs,
      calories: n.calories,
    })),
    dexa_scans: dexaRows.map((d) => ({
      date: d.scanDate,
      total_lbs: d.totalLbs,
      lean_lbs: d.leanLbs,
      fat_lbs: d.fatLbs,
      bf_pct: d.bfPct,
    })),
    session_weights: sessionWeightRows.map((s) => ({
      date: s.sessionDate,
      body_weight_lbs: s.bodyWeightLbs,
    })),
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardResult {
  today_session: SessionDto | null;
  recent_sessions: SessionDto[];
  sessions_this_week: number;
  body_weight_trend: Array<{ date: string; weight: number | null }>;
  recent_prs: Array<{
    id: number;
    date: string;
    exercise_name: string;
    pr_type: string;
    pr_value: number;
    previous_value: number | null;
  }>;
}

export async function dashboard(): Promise<DashboardResult> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400 * 1000)
    .toISOString()
    .slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000)
    .toISOString()
    .slice(0, 10);

  // Compute the start of the current ISO week (Monday).
  const t = new Date(today + "T00:00:00Z");
  const day = t.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(t);
  weekStart.setUTCDate(t.getUTCDate() + offset);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [todayRow] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionDate, today))
    .limit(1);

  let recentRows = await db
    .select()
    .from(sessions)
    .where(gte(sessions.sessionDate, sevenDaysAgo))
    .orderBy(desc(sessions.sessionDate));
  if (recentRows.length === 0) {
    recentRows = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.sessionDate))
      .limit(10);
  }

  const recentIds = recentRows.map((s) => s.id);
  const exerciseCounts = recentIds.length
    ? await db
        .select({
          sessionId: sessionExercises.sessionId,
          count: sql<number>`cast(count(${sessionExercises.id}) as int)`,
        })
        .from(sessionExercises)
        .where(
          sql`${sessionExercises.sessionId} = ANY(${recentIds})`
        )
        .groupBy(sessionExercises.sessionId)
    : [];
  const countMap = new Map(exerciseCounts.map((c) => [c.sessionId, c.count]));

  const recentDtos = recentRows.map((s) =>
    sessionToDto(s, { exercise_count: countMap.get(s.id) ?? 0 })
  );

  const [{ thisWeekCount }] = await db
    .select({ thisWeekCount: sql<number>`cast(count(*) as int)` })
    .from(sessions)
    .where(gte(sessions.sessionDate, weekStartStr));

  // Body weight trend — merge nutrition + session weights, dedupe by date.
  const [nutritionBw, sessionBw] = await Promise.all([
    db
      .select({
        date: nutritionDays.nutritionDate,
        weight: nutritionDays.bodyWeightLbs,
      })
      .from(nutritionDays)
      .where(
        and(
          gte(nutritionDays.nutritionDate, monthAgo),
          isNotNull(nutritionDays.bodyWeightLbs)
        )
      )
      .orderBy(asc(nutritionDays.nutritionDate)),
    db
      .select({
        date: sessions.sessionDate,
        weight: sessions.bodyWeightLbs,
      })
      .from(sessions)
      .where(
        and(
          gte(sessions.sessionDate, monthAgo),
          isNotNull(sessions.bodyWeightLbs)
        )
      )
      .orderBy(asc(sessions.sessionDate)),
  ]);
  const bwMap = new Map<string, number | null>();
  for (const s of sessionBw) bwMap.set(s.date, s.weight);
  for (const n of nutritionBw) bwMap.set(n.date, n.weight); // nutrition wins
  const bwTrend = Array.from(bwMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, weight]) => ({ date, weight }));

  // Recent PRs (last 10 across all time).
  const recentPrRows = await db
    .select({
      id: prRecords.id,
      date: sessions.sessionDate,
      exerciseName: exercises.name,
      prType: prRecords.prType,
      prValue: prRecords.prValue,
      previousValue: prRecords.previousValue,
    })
    .from(prRecords)
    .innerJoin(exercises, eq(exercises.id, prRecords.exerciseId))
    .innerJoin(sessions, eq(sessions.id, prRecords.sessionId))
    .orderBy(desc(prRecords.createdAt))
    .limit(10);

  return {
    today_session: todayRow ? sessionToDto(todayRow) : null,
    recent_sessions: recentDtos,
    sessions_this_week: thisWeekCount,
    body_weight_trend: bwTrend,
    recent_prs: recentPrRows.map((r) => ({
      id: r.id,
      date: r.date,
      exercise_name: r.exerciseName,
      pr_type: r.prType,
      pr_value: r.prValue,
      previous_value: r.previousValue,
    })),
  };
}

// re-export for convenience
export { recentPrs };
