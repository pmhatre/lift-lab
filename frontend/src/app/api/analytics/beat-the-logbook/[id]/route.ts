import type { NextRequest } from "next/server";

import { beatTheLogbook } from "@/lib/data/analytics";
import { notFound, ok } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) return notFound("Exercise not found");
  const n = parseInt(req.nextUrl.searchParams.get("n") ?? "5", 10);
  const data = await beatTheLogbook(id, n);
  if (!data) return notFound("Exercise not found");
  return ok(data);
}
