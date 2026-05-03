import type { NextRequest } from "next/server";

import { addSet } from "@/lib/data/sessions";
import { SetCreateSchema } from "@/lib/api-schemas";
import { notFound, ok, parseBody } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ se_id: string }> }
) {
  const { se_id: rawId } = await params;
  const seId = parseInt(rawId, 10);
  if (Number.isNaN(seId)) return notFound("Session exercise not found");

  const parsed = await parseBody(req, SetCreateSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const created = await addSet(seId, {
    setNumber: data.set_number ?? null,
    reps: data.reps ?? null,
    weightLbs: data.weight_lbs ?? null,
    isWarmup: data.is_warmup,
    rpe: data.rpe ?? null,
    rir: data.rir ?? null,
    status: data.status,
    notes: data.notes ?? null,
  });
  if (!created) return notFound("Session exercise not found");
  return ok(created);
}
