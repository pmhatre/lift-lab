/**
 * Drizzle client — lazy initialization so `next build` doesn't crash before
 * env vars are provisioned. Plain function, NOT a Proxy wrapper (Proxies
 * break libraries that introspect the client object).
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let _db: ReturnType<typeof create> | null = null;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `vercel env pull .env.local --yes` from the frontend directory."
    );
  }
  return drizzle(neon(url), { schema });
}

export function getDb() {
  if (!_db) _db = create();
  return _db;
}

export { schema };
