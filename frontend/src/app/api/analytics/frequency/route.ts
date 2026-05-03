import type { NextRequest } from "next/server";

import { frequency } from "@/lib/data/analytics";
import { ok } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const weeks = parseInt(req.nextUrl.searchParams.get("weeks") ?? "12", 10);
  const data = await frequency(weeks);
  return ok(data);
}
