import type { NextRequest } from "next/server";

import { recentPrs } from "@/lib/data/prs";
import { ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10);
  const data = await recentPrs(days, limit);
  return ok(data);
}
