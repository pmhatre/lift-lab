# Lift Lab

Personal fitness tracker — log lifting sessions, track progressive overload, and visualize volume and body composition over time. Single-user, SQLite-backed.

Two services in one repo:
- **`backend/`** — FastAPI + SQLModel + Alembic on SQLite
- **`frontend/`** — Next.js 16 + React 19 + Tailwind v4 + shadcn (Base UI) + Recharts

## Quickstart

You'll need Python 3.12+ and Node 20+. [`uv`](https://github.com/astral-sh/uv) is recommended for the Python side.

### Backend

```sh
cd backend
uv venv --python 3.12 venv
uv pip install -r requirements.txt --python venv/bin/python
venv/bin/uvicorn main:app --reload
```

API runs on `http://127.0.0.1:8000`. On boot it runs Alembic migrations to head and seeds the exercise library if empty.

### Frontend

```sh
cd frontend
npm install
npm run dev
```

UI runs on `http://localhost:3000`. `next.config.ts` rewrites `/api/*` to the backend so client-side fetches just work; React Server Components hit the backend directly via `BACKEND_URL` (defaults to `http://127.0.0.1:8000`).

## Importing existing data

**FitNotes CSV** (the main supported source):

1. In FitNotes: Settings → Export Data → grab the CSV
2. Open `/import` in the UI, pick the file, click Import

The importer fuzzy-matches exercise names against the seeded library (token-sort ratio ≥80) and auto-creates placeholder rows for anything it can't match — these get listed in the import result so you can fix their muscle groups later. Sessions are deduped by `(date, source="fitnotes")`; tick "Force re-import" if you want to overwrite.

## What's in here

- **Sessions** — date, day type, duration, body weight, exercises with ordered sets (reps × weight, optional RPE/RIR/warmup flag)
- **Beat the Logbook** — when you add an exercise to a new session, the UI pre-fills with last session's sets and shows whether you're on track to progress
- **Progressive overload tracking** — set a target rep range per exercise; the system flags "Ready to progress" when your top sets hit the ceiling
- **PR detection** — weight PRs and e1RM PRs (Epley) recorded automatically on session finish; idempotent so re-running is safe
- **Analytics** — weekly volume by muscle group, training frequency, body composition (DEXA + scale weight + nutrition imports)

## Project layout

```
backend/
  main.py              # All FastAPI routes
  schemas.py           # Pydantic request bodies
  models.py            # SQLModel tables (Exercise, TrainingSession, ...)
  database.py          # SQLite engine + session
  importer.py          # FitNotes CSV ingestion (DST-safe via zoneinfo)
  seed.py + seed_exercises.py
  alembic/             # Migrations (auto-applied on startup)
  requirements.txt

frontend/
  src/app/             # Next App Router pages (RSC for read pages, client for write/filter)
    page.tsx                       # Dashboard
    session/new/page.tsx           # Logging flow
    session/[id]/page.tsx          # Session detail
    exercise/[id]/page.tsx         # Exercise history
    analytics/{volume,frequency,body-comp}/page.tsx
    import/page.tsx
  src/components/
    ui/                # shadcn primitives
    charts/            # Recharts client islands
    site-nav.tsx, page-header.tsx, stat-card.tsx, range-select.tsx
  src/lib/
    api.ts             # Client-side fetch wrapper
    api-server.ts      # Server-side fetch (for RSCs, hits backend directly)
    constants.ts       # Day-type labels and other shared constants
    chart-theme.ts     # Recharts color palette + tooltip styling
```

## Migrations

Alembic auto-runs `upgrade head` on FastAPI startup. To add a migration:

```sh
cd backend
venv/bin/alembic revision --autogenerate -m "describe change"
# Review the generated file under backend/alembic/versions/
```

The next backend boot will apply it. To check current state: `venv/bin/alembic current`.

## Documentation

- [`docs/product/principles.md`](./docs/product/principles.md) — design principles
- [`docs/product/methodology.md`](./docs/product/methodology.md) — the training framework the app encodes
- [`docs/product/roadmap.md`](./docs/product/roadmap.md) — what's shipped, what's next
- [`docs/decisions/`](./docs/decisions/) — architecture decision records
- [`CLAUDE.md`](./CLAUDE.md) — AI-agent conventions and stack gotchas

## Notes

- Database file (`backend/database.db`) is gitignored. Each clone starts fresh; re-import your FitNotes CSV to populate.
- Local environment overrides for Claude Code permissions live in `.claude/settings.local.json` (gitignored). The committed `.claude/settings.json` is the canonical baseline.
