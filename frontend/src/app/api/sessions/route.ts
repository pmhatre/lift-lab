import type { NextRequest } from "next/server";

import { listSessions, createSession } from "@/lib/data/sessions";
import { SessionCreateSchema } from "@/lib/api-schemas";
import { ok, parseBody } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const data = await listSessions({
    start: sp.get("start") ?? undefined,
    end: sp.get("end") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    offset: sp.get("offset") ? parseInt(sp.get("offset")!, 10) : undefined,
  });
  return ok(data);
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, SessionCreateSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;
  const created = await createSession({
    date: data.date,
    dayType: data.day_type ?? null,
    emphasis: data.emphasis ?? null,
    bodyWeightLbs: data.body_weight_lbs ?? null,
    notes: data.notes ?? null,
  });
  return ok(created);
}
