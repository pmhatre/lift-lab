import type { NextRequest } from "next/server";

import { deleteSessionExercise, updateSessionExercise } from "@/lib/data/sessions";
import { SessionExerciseUpdateSchema } from "@/lib/api-schemas";
import { notFound, ok, parseBody } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ se_id: string }> }
) {
  const { se_id: rawId } = await params;
  const seId = parseInt(rawId, 10);
  if (Number.isNaN(seId)) return notFound();

  const parsed = await parseBody(req, SessionExerciseUpdateSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const updated = await updateSessionExercise(seId, {
    exerciseOrder: data.exercise_order ?? undefined,
    notes: data.notes ?? undefined,
  });
  if (!updated) return notFound();
  return ok({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ se_id: string }> }
) {
  const { se_id: rawId } = await params;
  const seId = parseInt(rawId, 10);
  if (Number.isNaN(seId)) return notFound();
  const deleted = await deleteSessionExercise(seId);
  if (!deleted) return notFound();
  return ok({ ok: true });
}
