import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { ok } from "@/lib/api-helpers";

/**
 * Status is derived from the database — last imported session date and counts
 * by source. Stateless (the original Python kept this in process memory, which
 * also did not survive restarts).
 */
export async function GET() {
  const db = getDb();
  const rows = await db
    .select({
      source: sessions.source,
      lastImport: sql<string | null>`max(${sessions.sessionDate})`,
      sessions: sql<number>`cast(count(*) as int)`,
    })
    .from(sessions)
    .groupBy(sessions.source);

  const status: Record<string, { last_import: string | null; sessions: number }> = {};
  for (const r of rows) {
    if (!r.source || r.source === "native") continue;
    status[r.source] = {
      last_import: r.lastImport,
      sessions: r.sessions,
    };
  }
  return ok(status);
}
