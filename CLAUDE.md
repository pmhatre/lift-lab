# CLAUDE.md

Guidance for AI agents working in this repo. See `README.md` for the human overview.

## Stack gotchas that bite

- **This is Next.js 16 + React 19.** The frontend's `AGENTS.md` is load-bearing: APIs and conventions may differ from training data. Read `frontend/node_modules/next/dist/docs/` before writing Next-specific code.
- **shadcn here is the Base UI variant**, not Radix. There is **no `asChild` prop** on `<Button>` and most other primitives. To make a `<Link>` look like a button, use `buttonVariants()`:
  ```tsx
  <Link href="/x" className={buttonVariants({ variant: "outline" })}>...</Link>
  ```
- **Selects from this shadcn variant pass `string | null` to `onValueChange`**, not just `string`. Either guard (`(v) => v && setX(v)`) or coerce (`(v) => setX(v ?? "")`).
- **Read pages are React Server Components.** Recharts is browser-only — chart components live in `src/components/charts/` as `"use client"` islands and receive data as props.
- **Analytics filters use URL searchParams**, not `useState`. The `RangeSelect` client component pushes `?weeks=12` etc. and the RSC re-fetches on the new URL.

## Where things go

| If you're adding... | Put it in... |
|---|---|
| A new API endpoint | `backend/main.py` (single file by design — it's a small repo) |
| A request schema | `backend/schemas.py` (always type bodies; never use `data: dict`) |
| A new SQLModel table | `backend/models.py` + run `alembic revision --autogenerate` |
| A new page | `frontend/src/app/...` — prefer RSC for read pages, client for forms |
| A reusable chart | `frontend/src/components/charts/` (always `"use client"`) |
| A shared UI primitive | `frontend/src/components/ui/` (shadcn) or `frontend/src/components/` (project-specific) |
| Day-type labels, constants | `frontend/src/lib/constants.ts` — do not duplicate inline |

## Dev loop

```sh
# Backend (auto-runs migrations + seeds on startup)
cd backend && venv/bin/uvicorn main:app --reload

# Frontend
cd frontend && npm run dev
```

Don't `cd PATH && cmd` in Bash tool calls — Claude Code's permission rules prefix-match the *start* of the command, so `Bash(uv venv:*)` doesn't match `cd /path && uv venv ...`. Use absolute paths and run commands singly.

## Backend conventions

- All endpoints take typed Pydantic bodies. `data: dict` is a bug.
- All datetime values are timezone-aware (`datetime.now(timezone.utc)`, never `utcnow()`).
- PT date conversions in the importer use `zoneinfo.ZoneInfo("America/Los_Angeles")` (DST-safe).
- PR detection is idempotent — re-running on the same session must not create duplicate rows. The check is at the start of `_record_prs_for_session`.
- The bulk-finalize endpoint `POST /api/sessions/finalize` is the canonical path for the new-session flow. The per-set/per-exercise endpoints exist for editing existing sessions.

## Frontend conventions

- Use `lucide-react` icons, not emoji, in committed code.
- Use `tabular-nums` for any displayed weight/rep/duration so digits don't shift width.
- Server-side fetches (RSCs) use `serverApi` from `src/lib/api-server.ts`. Client-side fetches use `api` from `src/lib/api.ts`. They share types via `import type`.
- The dashboard, session detail, exercise detail, and all analytics pages are RSCs. Don't add `"use client"` unless you actually need browser-only APIs (recharts, refs, event handlers, useState).

## Migrations

Alembic auto-runs `upgrade head` on FastAPI startup (via the `lifespan` context manager). When you change `models.py`:

```sh
cd backend
venv/bin/alembic revision --autogenerate -m "what changed"
# Review the generated file under alembic/versions/, then restart the backend
```

Never hand-write `ALTER TABLE` statements in `main.py` — that pattern was removed; everything goes through Alembic now.

## Permissions

`.claude/settings.json` (committed) is the canonical baseline. `.claude/settings.local.json` (gitignored) is for personal overrides. The committed file's deny list is the safety net — it survives even if `settings.local.json` is rewritten by interactive approvals.
