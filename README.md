# Lift Lab

Personal fitness tracker — log lifting sessions, track progressive overload, and visualize volume and body composition over time.

Single Next.js 16 app with Route Handlers as the backend and Postgres (Neon, via the Vercel Marketplace) as storage. Deployed on Vercel.

## Quickstart

You'll need Node 20+ and [`pnpm`](https://pnpm.io/).

```sh
cd frontend
pnpm install

# One-time setup (per clone): pull DB credentials from Vercel
vercel link
vercel env pull .env.local --yes

# Apply migrations + seed the exercise library (idempotent)
pnpm db:migrate
pnpm db:seed

# Run dev server
pnpm dev
```

UI runs on `http://localhost:3000`. The Route Handlers under `app/api/` talk directly to Neon — no separate backend service.

## Importing existing data

**FitNotes CSV** (the main supported source):

1. In FitNotes: Settings → Export Data → grab the CSV
2. Open `/import` in the UI, pick the file, click Import

The importer fuzzy-matches exercise names against the seeded library (fuse.js threshold-based) and auto-creates placeholder rows for anything it can't match — these get listed in the import result so you can fix their muscle groups later. Sessions are deduped by `(date, source="fitnotes")`; tick "Force re-import" if you want to overwrite.

## What's in here

- **Sessions** — date, day type, duration, body weight, exercises with ordered sets (reps × weight, optional RPE/RIR/warmup flag)
- **Beat the Logbook** — when you add an exercise to a new session, the UI pre-fills with last session's sets and shows whether you're on track to progress
- **Progressive overload tracking** — set a target rep range per exercise; the system flags "Ready to progress" when your top sets hit the ceiling
- **PR detection** — weight PRs and e1RM PRs (Epley) recorded automatically on session finish; idempotent so re-running is safe
- **Analytics** — weekly volume by muscle group, training frequency, body composition (DEXA + scale weight + nutrition imports)
- **Mobile-friendly logging** — sticky finish bar, stepper inputs, PWA installable

## Project layout

```
frontend/
  src/app/             # Next App Router pages (RSC for read pages, client for write/filter)
    page.tsx                       # Dashboard
    session/new/page.tsx           # Logging flow
    session/[id]/page.tsx          # Session detail
    exercise/[id]/page.tsx         # Exercise history
    analytics/{volume,frequency,body-comp}/page.tsx
    import/page.tsx
    api/                           # Route Handlers (CRUD, analytics, import, prs)
  src/components/
    ui/                # shadcn primitives
    charts/            # Recharts client islands
    site-nav.tsx, page-header.tsx, stat-card.tsx, range-select.tsx
  src/db/
    schema.ts          # Drizzle schema
    index.ts           # Lazy getDb() — Drizzle + @neondatabase/serverless
    seed.ts            # Idempotent seed script
    seed-exercises.json
  src/lib/
    api.ts             # Client-side fetch wrapper
    api-server.ts      # Server-side data access (RSCs call data layer directly)
    api-helpers.ts     # Route Handler helpers (Zod parse, error JSON)
    api-schemas.ts     # Zod schemas for request bodies
    data/              # Drizzle queries shared by Route Handlers + RSCs
    import/fitnotes.ts # FitNotes CSV ingestion
    constants.ts       # Day-type labels and other shared constants
    chart-theme.ts     # Recharts color palette + tooltip styling
  drizzle/migrations/  # SQL migrations (drizzle-kit generate)

docs/                  # Public-safe product + decision docs
personal/              # Local-only training context (gitignored)
_inbox/                # Raw brainstorm artifacts (gitignored)
```

## Database migrations

```sh
cd frontend

# After editing src/db/schema.ts:
pnpm db:generate            # creates a new SQL file under drizzle/migrations/
# review the generated file
pnpm db:migrate             # applies pending migrations to Neon

# Inspecting current state:
pnpm db:studio              # browser-based Drizzle Studio
```

`db:migrate` and `db:seed` use `dotenv-cli` to load `.env.local` — Drizzle Kit doesn't auto-load Next.js env files.

## Deployment

Pushed to `main` deploys via Vercel automatically. `lumara-health/lift-lab` is the project; Neon Postgres is provisioned through the Vercel Marketplace and injects `DATABASE_URL` at build time.

## Documentation

- [`docs/product/principles.md`](./docs/product/principles.md) — design principles
- [`docs/product/methodology.md`](./docs/product/methodology.md) — the training framework the app encodes
- [`docs/product/roadmap.md`](./docs/product/roadmap.md) — what's shipped, what's next
- [`docs/decisions/`](./docs/decisions/) — architecture decision records (see [0003](./docs/decisions/0003-migrate-to-vercel-pattern.md) for the migration to this stack)
- [`CLAUDE.md`](./CLAUDE.md) — AI-agent conventions and stack gotchas

## Notes

- Local environment overrides for Claude Code permissions live in `.claude/settings.local.json` (gitignored). The committed `.claude/settings.json` is the canonical baseline.
- `personal/` (gitignored) holds the maintainer's training context — current program, history, body composition data, ongoing brainstorms. Never committed.
