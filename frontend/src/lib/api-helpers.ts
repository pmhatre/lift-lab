/**
 * Small helpers for Route Handlers — Zod validation + JSON error shaping.
 */
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: NextResponse.json({ detail: "Invalid JSON" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { detail: parsed.error.issues },
        { status: 422 }
      ),
    };
  }
  return { data: parsed.data };
}

export function notFound(message = "Not found") {
  return NextResponse.json({ detail: message }, { status: 404 });
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
