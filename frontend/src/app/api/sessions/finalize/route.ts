import type { NextRequest } from "next/server";

import { finalizeSession } from "@/lib/data/sessions";
import { FinalizeSessionSchema } from "@/lib/api-schemas";
import { ok, parseBody } from "@/lib/api-helpers";
import { NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, FinalizeSessionSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  try {
    const result = await finalizeSession({
      date: data.date ?? new Date().toISOString().slice(0, 10),
      dayType: data.day_type ?? null,
      bodyWeightLbs: data.body_weight_lbs ?? null,
      notes: data.notes ?? null,
      exercises: data.exercises.map((ex) => ({
        exerciseId: ex.exercise_id,
        notes: ex.notes ?? null,
        sets: ex.sets.map((s) => ({
          reps: s.reps ?? null,
          weightLbs: s.weight_lbs ?? null,
          isWarmup: s.is_warmup,
          rpe: s.rpe ?? null,
          rir: s.rir ?? null,
        })),
      })),
    });
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not found")) {
      return NextResponse.json({ detail: msg }, { status: 404 });
    }
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
