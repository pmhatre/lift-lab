import type { NextRequest } from "next/server";

import { bodyComposition } from "@/lib/data/analytics";
import { ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10);
  const data = await bodyComposition(days);
  return ok(data);
}
