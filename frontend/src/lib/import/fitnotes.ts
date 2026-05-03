/**
 * FitNotes CSV import. TypeScript port of backend/importer.py.
 *
 * - Parses CSV with papaparse (header row + data rows).
 * - Groups rows by PT date (DST-safe via Intl + America/Los_Angeles timezone).
 * - Fuzzy-matches exercise names against the library using fuse.js.
 * - Auto-creates placeholder exercises for unmatched names; flags them in the
 *   response so the user can fix muscle groups later.
 * - Idempotent: skips sessions where (date, source='fitnotes') already exists
 *   unless `force` is true.
 */
import Papa from "papaparse";
import Fuse from "fuse.js";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  exercises,
  sessions,
  sessionExercises,
  sets,
  type Exercise,
} from "@/db/schema";

interface CsvRow {
  Name?: string;
  StartTime?: string;
  EndTime?: string;
  BodyWeight?: string;
  Exercise?: string;
  Equipment?: string;
  Reps?: string;
  Weight?: string;
  Time?: string;
  Distance?: string;
  Status?: string;
  IsWarmup?: string;
  RPE?: string;
  RIR?: string;
  Categories?: string;
  Note?: string;
}

export interface ImportResult {
  sessions_created: number;
  sessions_skipped: number;
  sets_created: number;
  unmatched_exercises: string[];
}

/** Convert a UTC datetime string to a YYYY-MM-DD date in America/Los_Angeles. */
function utcToPtDate(utcStr: string): string {
  const d = new Date(utcStr);
  // 'sv-SE' formats as ISO date (YYYY-MM-DD), respects timeZone option.
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });
}

/** Parse a UTC datetime string into a Date, returning null on failure. */
function parseDt(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface ExerciseIndex {
  byKey: Map<string, Exercise>; // lowercased name + each alias → exercise
  fuse: Fuse<{ key: string; ex: Exercise }>;
  list: Exercise[];
}

async function buildExerciseIndex(): Promise<ExerciseIndex> {
  const db = getDb();
  const list = await db.select().from(exercises);
  const byKey = new Map<string, Exercise>();
  const fuseEntries: Array<{ key: string; ex: Exercise }> = [];
  for (const ex of list) {
    const nameKey = ex.name.toLowerCase();
    byKey.set(nameKey, ex);
    fuseEntries.push({ key: nameKey, ex });
    for (const alias of ex.aliases ?? []) {
      const aliasKey = alias.toLowerCase();
      byKey.set(aliasKey, ex);
      fuseEntries.push({ key: aliasKey, ex });
    }
  }
  // token-sort approximation: Fuse with includeScore + threshold matches the
  // 0.8 token-sort cutoff well enough for FitNotes data.
  const fuse = new Fuse(fuseEntries, {
    keys: ["key"],
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });
  return { byKey, fuse, list };
}

function findExercise(
  name: string,
  index: ExerciseIndex
): Exercise | null {
  const key = name.trim().toLowerCase();
  const exact = index.byKey.get(key);
  if (exact) return exact;
  const matches = index.fuse.search(key);
  if (matches.length === 0) return null;
  return matches[0].item.ex;
}

interface PerSessionData {
  rows: CsvRow[];
  startTime: string;
  endTime: string;
  name: string;
  bodyWeight: number | null;
}

export async function importFitnotesCsv(
  content: string,
  options: { force: boolean }
): Promise<ImportResult> {
  const db = getDb();

  const parsed = Papa.parse<CsvRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  // Group rows by PT date.
  const sessionsByDate = new Map<string, PerSessionData>();
  for (const row of parsed.data) {
    const start = row.StartTime?.trim();
    if (!start) continue;
    let ptDate: string;
    try {
      ptDate = utcToPtDate(start);
    } catch {
      continue;
    }

    let bucket = sessionsByDate.get(ptDate);
    if (!bucket) {
      bucket = {
        rows: [],
        startTime: row.StartTime ?? "",
        endTime: row.EndTime ?? "",
        name: row.Name?.trim() ?? "",
        bodyWeight: null,
      };
      sessionsByDate.set(ptDate, bucket);
    }
    bucket.rows.push(row);
    if (row.EndTime) bucket.endTime = row.EndTime;
    if (bucket.bodyWeight == null && row.BodyWeight?.trim()) {
      const bw = parseFloat(row.BodyWeight.trim());
      if (!Number.isNaN(bw)) bucket.bodyWeight = bw;
    }
  }

  const index = await buildExerciseIndex();
  const unmatched = new Set<string>();
  let sessionsCreated = 0;
  let sessionsSkipped = 0;
  let setsCreated = 0;

  const sortedDates = [...sessionsByDate.keys()].sort();

  for (const sessionDate of sortedDates) {
    const data = sessionsByDate.get(sessionDate)!;

    const [existing] = await db
      .select()
      .from(sessions)
      .where(
        and(eq(sessions.sessionDate, sessionDate), eq(sessions.source, "fitnotes"))
      );

    if (existing && !options.force) {
      sessionsSkipped++;
      continue;
    }

    const startedAt = parseDt(data.startTime);
    const endedAt = parseDt(data.endTime);
    const durationMinutes =
      startedAt && endedAt
        ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000)
        : null;

    const nameLower = data.name.toLowerCase();
    let dayType: string | null = null;
    if (/chest|back/.test(nameLower)) dayType = "chest_back";
    else if (/leg|core/.test(nameLower)) dayType = "legs_core";
    else if (/shoulder|arm/.test(nameLower)) dayType = "shoulders_arms";
    else if (/full|whole/.test(nameLower)) dayType = "full_body";

    let sessionId: number;
    if (existing && options.force) {
      await db
        .update(sessions)
        .set({
          startedAt,
          endedAt,
          durationMinutes,
          bodyWeightLbs: data.bodyWeight,
          dayType,
        })
        .where(eq(sessions.id, existing.id));
      // Wipe child rows on force re-import so we don't accumulate dups.
      await db.delete(sessionExercises).where(eq(sessionExercises.sessionId, existing.id));
      sessionId = existing.id;
    } else {
      const [inserted] = await db
        .insert(sessions)
        .values({
          sessionDate,
          dayType,
          startedAt,
          endedAt,
          durationMinutes,
          bodyWeightLbs: data.bodyWeight,
          source: "fitnotes",
          sourceId: sessionDate,
        })
        .returning();
      sessionId = inserted.id;
      sessionsCreated++;
    }

    // Group rows by exercise name within this session, preserving order.
    const exerciseOrder = new Map<string, { order: number; rows: CsvRow[]; notes: string }>();
    let nextOrder = 0;
    for (const row of data.rows) {
      const exName = row.Exercise?.trim();
      if (!exName || exName === "Exercise") continue;
      let bucket = exerciseOrder.get(exName);
      if (!bucket) {
        bucket = { order: nextOrder++, rows: [], notes: row.Note ?? "" };
        exerciseOrder.set(exName, bucket);
      }
      bucket.rows.push(row);
    }

    for (const [exName, bucket] of exerciseOrder) {
      let exercise = findExercise(exName, index);
      if (!exercise) {
        unmatched.add(exName);
        const [created] = await db
          .insert(exercises)
          .values({
            name: exName,
            aliases: [],
            primaryMuscles: [],
            secondaryMuscles: [],
            notes: "Auto-created during FitNotes import - needs review",
          })
          .returning();
        exercise = created;
        index.list.push(created);
        index.byKey.set(exName.toLowerCase(), created);
      }

      const [seRow] = await db
        .insert(sessionExercises)
        .values({
          sessionId,
          exerciseId: exercise.id,
          exerciseOrder: bucket.order,
          notes: bucket.notes || null,
        })
        .returning();

      const setRows = bucket.rows.map((row, i) => {
        const rawStatus = row.Status ?? "Done";
        const status =
          rawStatus === "Done" || rawStatus === "Failed" || rawStatus === "Partial"
            ? rawStatus.toLowerCase()
            : "done";
        const isWarmup = (row.IsWarmup ?? "false").toLowerCase() === "true";
        const reps = parseIntOrNull(row.Reps);
        const weight = parseFloatOrNull(row.Weight);
        const rpe = parseFloatOrNull(row.RPE);
        const rir = parseIntOrNull(row.RIR);
        return {
          sessionExerciseId: seRow.id,
          setNumber: i + 1,
          reps,
          weightLbs: weight,
          isWarmup,
          rpe,
          rir,
          status,
        };
      });

      if (setRows.length) {
        await db.insert(sets).values(setRows);
        setsCreated += setRows.length;
      }
    }
  }

  return {
    sessions_created: sessionsCreated,
    sessions_skipped: sessionsSkipped,
    sets_created: setsCreated,
    unmatched_exercises: [...unmatched].sort(),
  };
}

function parseIntOrNull(v: string | undefined): number | null {
  if (!v?.trim()) return null;
  const n = parseInt(v.trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function parseFloatOrNull(v: string | undefined): number | null {
  if (!v?.trim()) return null;
  const n = parseFloat(v.trim());
  return Number.isNaN(n) ? null : n;
}
