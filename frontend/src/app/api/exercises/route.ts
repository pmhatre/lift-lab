import type { NextRequest } from "next/server";

import { listExercises, createExercise } from "@/lib/data/exercises";
import { ExerciseCreateSchema } from "@/lib/api-schemas";
import { ok, parseBody } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const data = await listExercises({ q, limit });
  return ok(data);
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, ExerciseCreateSchema);
  if (parsed.error) return parsed.error;
  const created = await createExercise({
    name: parsed.data.name,
    aliases: parsed.data.aliases,
    primaryMuscles: parsed.data.primary_muscles,
    secondaryMuscles: parsed.data.secondary_muscles,
    equipment: parsed.data.equipment ?? null,
    movementPattern: parsed.data.movement_pattern ?? null,
    isCompound: parsed.data.is_compound,
    notes: parsed.data.notes ?? null,
  });
  return ok(created);
}
