import type { NextRequest } from "next/server";

import { recordPrsForSession } from "@/lib/data/prs";
import { getSessionDetail } from "@/lib/data/sessions";
import { PRCheckSchema } from "@/lib/api-schemas";
import { notFound, ok, parseBody } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, PRCheckSchema);
  if (parsed.error) return parsed.error;
  const sessionId = parsed.data.session_id;

  const session = await getSessionDetail(sessionId);
  if (!session) return notFound("Session not found");

  const prs = await recordPrsForSession(sessionId);
  return ok({ prs });
}
