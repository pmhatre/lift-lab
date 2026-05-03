/**
 * Seed the exercise library. Idempotent — skips exercises that already exist
 * (matched by name). Run via `pnpm db:seed`.
 */
import { sql } from "drizzle-orm";

import { getDb } from "./index";
import { exercises } from "./schema";
import seedData from "./seed-exercises.json" with { type: "json" };

interface SeedExercise {
  name: string;
  aliases: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string | null;
  movement_pattern: string | null;
  is_compound: boolean;
  notes?: string | null;
}

async function seed() {
  const db = getDb();

  const existing = await db
    .select({ name: exercises.name })
    .from(exercises);
  const existingNames = new Set(existing.map((r) => r.name));

  const rows = (seedData as SeedExercise[])
    .filter((e) => !existingNames.has(e.name))
    .map((e) => ({
      name: e.name,
      aliases: e.aliases ?? [],
      primaryMuscles: e.primary_muscles ?? [],
      secondaryMuscles: e.secondary_muscles ?? [],
      equipment: e.equipment ?? null,
      movementPattern: e.movement_pattern ?? null,
      isCompound: e.is_compound ?? false,
      notes: e.notes ?? null,
    }));

  if (rows.length === 0) {
    console.log(
      `Seed already applied — ${existingNames.size} exercises in the DB.`
    );
    return;
  }

  await db.insert(exercises).values(rows);

  const total = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from exercises`
  );
  console.log(
    `Seeded ${rows.length} new exercises. Total now: ${total.rows[0]?.count ?? "?"}.`
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
