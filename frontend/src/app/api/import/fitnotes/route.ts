import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { importFitnotesCsv } from "@/lib/import/fitnotes";

// FitNotes imports can be a few thousand rows + fuzzy matching. Bump the
// timeout headroom — this ends up controlling Vercel function timeout when
// deployed to a plan that respects it.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const force = req.nextUrl.searchParams.get("force") === "true";

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { detail: "Expected multipart form data with a 'file' field" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { detail: "Missing 'file' field or wrong type" },
      { status: 400 }
    );
  }

  const text = await file.text();
  try {
    const result = await importFitnotesCsv(text, { force });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ detail: msg }, { status: 500 });
  }
}
