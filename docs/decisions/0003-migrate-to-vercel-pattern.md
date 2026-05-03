# 0003. Migrate from FastAPI/SQLite to Next.js Route Handlers + Postgres

**Status:** accepted

**Date:** 2026-05-03

**Supersedes:** [0001 — Stack and MVP scope](./0001-stack-and-mvp-scope.md)

## Context

The original architecture (ADR 0001) was a Python FastAPI service backed by
SQLite, with a separate Next.js frontend that called it via a `/api/*`
rewrite. Local-only, accessible via Tailscale, single user.

Two things changed since 0001:

1. **Deployment came up.** Vercel is the maintainer's default for every other
   project. The two-host setup (Mac mini + Tailscale, or Vercel + Fly.io)
   adds operational complexity that doesn't pay back at single-user scale.
2. **`alaap` validated the alaap-pattern** — single Next.js app + managed
   cloud DB + offline batch jobs. The pattern works, the maintainer is
   already familiar with it, and it deploys with zero ceremony.

Constraints unchanged from 0001: opinionated training methodology, single
user for now, possibility of going public someday, cross-source analytics
as the long-term differentiator.

The trigger to revisit was the deployment question. Once "use Vercel for the
frontend, host the backend separately" was on the table, the obvious next
question was "or just don't have a separate backend?"

Alternatives considered:

- **Stay on FastAPI/SQLite, deploy to Mac mini + Tailscale.** Free, private,
  fits today. Doesn't fit "I might want to share this someday." Still
  requires deployment work (launchd, auto-restart, etc.) that the maintainer
  doesn't otherwise do.
- **Frontend on Vercel, FastAPI/SQLite on Fly.io.** ~2 hours of setup.
  Preserves all existing Python code. Two hosts to manage indefinitely;
  every future change touches both. SQLite keeps working but there's no
  clean upgrade path to a public hosted version without a Postgres migration
  later anyway.
- **Migrate to alaap-pattern (chosen).** ~1–2 days of focused work. Single
  deployment surface, one stack, matches every other project. The audit
  work (Pydantic schemas, Alembic migrations, bulk-finalize endpoint,
  idempotent PR detection) translates cleanly into Drizzle + Zod + TS.
  Postgres now means no second migration if/when the project goes public.

## Decision

Replace the entire backend service with Next.js Route Handlers and a
managed Postgres (Neon via Vercel Marketplace).

**Stack:**
- Frontend + API: **Next.js 16** (App Router) + Route Handlers under
  `app/api/`
- ORM: **Drizzle** with `@neondatabase/serverless` driver, lazy `getDb()`
  initialization (no Proxy wrappers — they break libraries that introspect
  the client object)
- Migrations: **drizzle-kit** with SQL files under `drizzle/migrations/`
- Validation: **Zod** for request bodies (replaces Pydantic)
- DB: **Postgres on Neon**, provisioned via the Vercel Marketplace so env
  vars auto-inject into the project
- CSV import: **papaparse** + **fuse.js** (replaces Python `csv` +
  `rapidfuzz`)
- Package manager: **pnpm** (matches `alaap`)

**Architecture:**
- A `src/lib/data/` layer holds Drizzle queries that are called by both
  Route Handlers (returning JSON) and React Server Components (returning
  data directly — no HTTP roundtrip)
- DTOs in `src/lib/data/serializers.ts` shape rows into the snake_case API
  contract the frontend already expects, so no client-side changes are
  needed
- Analytics queries that were Python loops with N+1 patterns get fixed for
  free as proper Postgres aggregations (jsonb unnesting for muscle group
  rollups, `json_agg` for nested set arrays)

**Deletion:**
- `backend/` directory removed. Git history preserves the FastAPI service
  if reference is needed.

## Consequences

### Enables

- **Single-command deploy** (git push → Vercel preview → promote to prod)
- **One stack** to maintain — TypeScript end-to-end, types flow from the
  Drizzle schema all the way to the React components
- **Preview deploys per branch** — test mobile changes on a real URL before
  merging
- **Painless migration to public** if/when that happens — Postgres is
  already the storage, multi-user just needs auth + `user_id` columns
- **N+1 patterns from the original audit are gone** — replacing Python
  loops with proper SQL aggregations is mandatory in the rewrite, and
  the SQL is faster than the Python it replaced

### Rules out

- Local-only operation by default. The dev DB lives on Neon (free tier
  branching available for dev branches). Running fully offline would
  require provisioning a local Postgres, which is now a non-default path.
- Python ecosystem benefits for analytics (numpy, pandas, scipy). Current
  analytics needs are all aggregation queries that map cleanly to SQL —
  the loss only matters if lift-lab evolves into ML or statistical
  modeling, which isn't on the near roadmap.

### Accepts

- **`neon-http` driver doesn't support multi-statement transactions.**
  The bulk-finalize endpoint does sequential writes inside a single
  Route Handler invocation. If any insert throws, the user retries —
  acceptable at single-user scale. Switching to `neon-serverless` (websocket
  Pool) would give true atomic transactions if this ever matters.
- **Cold-start latency** on first request after idle (~200–500 ms). Vercel
  Fluid Compute mitigates under steady traffic. Bulk-finalize means the
  hot path is one invocation per session, not per set, so the latency
  hits once.
- **`drizzle-kit` and Node scripts don't auto-load `.env.local`.** Migrations
  and seeds run via `dotenv-cli` (the `db:migrate` and `db:seed` scripts in
  `package.json` handle this).
- **PNG icons for native iOS PWA install** are still a TODO from the
  earlier mobile-polish round. Doesn't block deployment.

## Migration steps (for reference)

1. `vercel link` → project linked to `lumara-health/lift-lab`
2. `vercel integration add neon` → provisions Neon DB, auto-injects env vars
3. `vercel env pull .env.local --yes` → local dev gets the same DB URL (use
   a Neon dev branch in practice)
4. `pnpm db:migrate` → applies the initial schema migration
5. `pnpm db:seed` → loads the 53-exercise library
6. Re-import historical FitNotes data via `/import` UI against Neon

Verified by running `pnpm build` (clean) and `pnpm lint` (clean) after
each phase. End-to-end smoke tests run against the provisioned Neon DB
before promoting to production.
