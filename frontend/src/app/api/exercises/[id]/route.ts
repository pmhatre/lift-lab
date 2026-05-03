import type { NextRequest } from "next/server";

import { updateExercise } from "@/lib/data/exercises";
import { ExerciseUpdateSchema } from "@/lib/api-schemas";
import { notFound, ok, parseBody } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) return notFound("Exercise not found");

  const parsed = await parseBody(req, ExerciseUpdateSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;
  const updated = await updateExercise(id, {
    name: data.name,
    aliases: data.aliases,
    primaryMuscles: data.primary_muscles,
    secondaryMuscles: data.secondary_muscles,
    equipment: data.equipment ?? undefined,
    movementPattern: data.movement_pattern ?? undefined,
    isCompound: data.is_compound,
    targetRepsLow: data.target_reps_low ?? undefined,
    targetRepsHigh: data.target_reps_high ?? undefined,
    progressionEnabled: data.progression_enabled,
    notes: data.notes ?? undefined,
  });
  if (!updated) return notFound("Exercise not found");
  return ok(updated);
}
