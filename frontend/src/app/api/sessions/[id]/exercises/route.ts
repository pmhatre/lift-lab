import type { NextRequest } from "next/server";

import { addExerciseToSession } from "@/lib/data/sessions";
import { SessionExerciseCreateSchema } from "@/lib/api-schemas";
import { notFound, ok, parseBody } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const sessionId = parseInt(rawId, 10);
  if (Number.isNaN(sessionId)) return notFound("Session not found");

  const parsed = await parseBody(req, SessionExerciseCreateSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const result = await addExerciseToSession(sessionId, {
    exerciseId: data.exercise_id,
    exerciseOrder: data.exercise_order ?? null,
    notes: data.notes ?? null,
  });
  if ("error" in result) {
    if (result.error === "session_not_found") return notFound("Session not found");
    if (result.error === "exercise_not_found") return notFound("Exercise not found");
  } else {
    return ok(result);
  }
}
