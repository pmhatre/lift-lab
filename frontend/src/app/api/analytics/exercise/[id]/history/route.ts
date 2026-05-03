import type { NextRequest } from "next/server";

import { exerciseHistory } from "@/lib/data/analytics";
import { notFound, ok } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) return notFound("Exercise not found");

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10);
  const data = await exerciseHistory(id, limit);
  if (!data) return notFound("Exercise not found");
  return ok(data);
}
