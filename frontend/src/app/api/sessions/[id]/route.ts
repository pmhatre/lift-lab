import type { NextRequest } from "next/server";

import {
  deleteSession,
  getSessionDetail,
  updateSession,
} from "@/lib/data/sessions";
import { SessionUpdateSchema } from "@/lib/api-schemas";
import { notFound, ok, parseBody } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) return notFound("Session not found");
  const session = await getSessionDetail(id);
  if (!session) return notFound("Session not found");
  return ok(session);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) return notFound("Session not found");

  const parsed = await parseBody(req, SessionUpdateSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const updated = await updateSession(id, {
    sessionDate: data.date,
    dayType: data.day_type ?? undefined,
    emphasis: data.emphasis ?? undefined,
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
    durationMinutes: data.duration_minutes ?? undefined,
    bodyWeightLbs: data.body_weight_lbs ?? undefined,
    notes: data.notes ?? undefined,
  });
  if (!updated) return notFound("Session not found");
  return ok(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) return notFound("Session not found");
  const deleted = await deleteSession(id);
  if (!deleted) return notFound("Session not found");
  return ok({ ok: true });
}
