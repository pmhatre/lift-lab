import type { NextRequest } from "next/server";

import { volumeByMuscleGroup } from "@/lib/data/analytics";
import { ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const groupBy = (sp.get("group_by") ?? "week") as "week" | "session";
  const data = await volumeByMuscleGroup({
    start: sp.get("start") ?? undefined,
    end: sp.get("end") ?? undefined,
    groupBy,
  });
  return ok(data);
}
