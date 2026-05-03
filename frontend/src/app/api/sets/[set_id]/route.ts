import type { NextRequest } from "next/server";

import { deleteSet, updateSet } from "@/lib/data/sessions";
import { SetUpdateSchema } from "@/lib/api-schemas";
import { notFound, ok, parseBody } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ set_id: string }> }
) {
  const { set_id: rawId } = await params;
  const setId = parseInt(rawId, 10);
  if (Number.isNaN(setId)) return notFound("Set not found");

  const parsed = await parseBody(req, SetUpdateSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const updated = await updateSet(setId, {
    setNumber: data.set_number ?? undefined,
    reps: data.reps ?? undefined,
    weightLbs: data.weight_lbs ?? undefined,
    isWarmup: data.is_warmup,
    rpe: data.rpe ?? undefined,
    rir: data.rir ?? undefined,
    status: data.status,
    notes: data.notes ?? undefined,
  });
  if (!updated) return notFound("Set not found");
  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ set_id: string }> }
) {
  const { set_id: rawId } = await params;
  const setId = parseInt(rawId, 10);
  if (Number.isNaN(setId)) return notFound("Set not found");
  const deleted = await deleteSet(setId);
  if (!deleted) return notFound("Set not found");
  return ok({ ok: true });
}
