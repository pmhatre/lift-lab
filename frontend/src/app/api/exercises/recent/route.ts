import type { NextRequest } from "next/server";

import { recentExercises } from "@/lib/data/exercises";
import { ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
  const data = await recentExercises(limit);
  return ok(data);
}
