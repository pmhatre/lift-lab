# CLAUDE.md

Guidance for AI agents working in this repo. See `README.md` for the human overview.

## Where to read first

Before suggesting features or making product decisions:

- [`docs/product/principles.md`](./docs/product/principles.md) — the design opinions the app is built around
- [`docs/product/methodology.md`](./docs/product/methodology.md) — the training framework the app encodes
- [`docs/product/roadmap.md`](./docs/product/roadmap.md) — what's shipped, what's next
- [`docs/decisions/`](./docs/decisions/) — architecture decision records ([0003](./docs/decisions/0003-migrate-to-vercel-pattern.md) covers the current stack)

If a `personal/` directory exists at the repo root (gitignored), that's the maintainer's training context — read it for nuance on feature priorities. Don't reference it from anything that gets committed.

## Stack gotchas that bite

- **This is Next.js 16 + React 19.** The frontend's `AGENTS.md` is load-bearing: APIs and conventions may differ from training data. Read `frontend/node_modules/next/dist/docs/` before writing Next-specific code.
- **shadcn here is the Base UI variant**, not Radix. There is **no `asChild` prop** on `<Button>` and most other primitives. To make a `<Link>` look like a button, use `buttonVariants()`:
  ```tsx
  <Link href="/x" className={buttonVariants({ variant: "outline" })}>...</Link>
  ```
- **Selects from this shadcn variant pass `string | null` to `onValueChange`**, not just `string`. Either guard (`(v) => v && setX(v)`) or coerce (`(v) => setX(v ?? "")`).
- **Read pages are React Server Components.** Recharts is browser-only — chart components live in `src/components/charts/` as `"use client"` islands and receive data as props.
- **Analytics filters use URL searchParams**, not `useState`. The `RangeSelect` client component pushes `?weeks=12` etc. and the RSC re-fetches on the new URL.
- **The DB client uses lazy `getDb()`, not a top-level `db` const.** Top-level `neon(process.env.DATABASE_URL)` would crash `next build` before env vars are provisioned. **Never wrap the client in a JavaScript `Proxy`** — Proxies break libraries that introspect the client object (NextAuth, etc.).
- **`neon-http` does not support multi-statement transactions.** The bulk-finalize endpoint runs sequential writes; if any fails, the user retries. If true atomic semantics matter, switch the import in `src/db/index.ts` from `drizzle-orm/neon-http` to `drizzle-orm/neon-serverless` (websocket Pool).
- **`drizzle-kit` and Node scripts (tsx) don't auto-load `.env.local`.** Migrations and seeds run via `dotenv-cli`. Use the `db:migrate` / `db:seed` package scripts; don't run `drizzle-kit migrate` directly.

## Where things go

| If you're adding... | Put it in... |
|---|---|
| A new API endpoint | `frontend/src/app/api/.../route.ts` |
| A request schema | `frontend/src/lib/api-schemas.ts` (Zod; never trust unparsed bodies) |
| A new DB table | `frontend/src/db/schema.ts` → `pnpm db:generate` → review the migration → `pnpm db:migrate` |
| A reusable Drizzle query | `frontend/src/lib/data/{exercises,sessions,prs,analytics}.ts` (called by both Route Handlers and RSCs) |
| A response DTO | `frontend/src/lib/data/serializers.ts` (snake_case to match the existing API contract) |
| A new page | `frontend/src/app/...` — prefer RSC for read pages, client for forms |
| A reusable chart | `frontend/src/components/charts/` (always `"use client"`) |
| A shared UI primitive | `frontend/src/components/ui/` (shadcn) or `frontend/src/components/` (project-specific) |
| Day-type labels, constants | `frontend/src/lib/constants.ts` — do not duplicate inline |

## Dev loop

```sh
cd frontend
pnpm dev              # http://localhost:3000

# After editing src/db/schema.ts:
pnpm db:generate      # writes drizzle/migrations/<n>_*.sql
pnpm db:migrate       # applies pending migrations to Neon

# Other:
pnpm db:seed          # idempotent: only inserts new exercises
pnpm db:studio        # browser-based DB inspector
pnpm build            # next build (clean as of last commit)
pnpm lint             # eslint
```

**Don't `cd PATH && cmd` in Bash tool calls.** Claude Code's permission rules prefix-match the *start* of the command, so `Bash(pnpm:*)` doesn't match `cd /path && pnpm ...`. Use absolute paths and run commands singly.

## Backend conventions (Route Handlers)

- All POST/PUT bodies parse through Zod via `parseBody()` in `src/lib/api-helpers.ts`. Never trust raw `req.json()`.
- All datetimes use timezone-aware `Date` and ISO strings — Drizzle's `timestamp({ withTimezone: true })` handles serialization.
- PT date conversions (FitNotes importer) use `Intl.DateTimeFormat` with `timeZone: "America/Los_Angeles"` (DST-safe).
- PR detection is idempotent — re-running on the same session must not create duplicate rows. The check is at the start of `recordPrsForSession()` in `src/lib/data/prs.ts`.
- The bulk-finalize endpoint `POST /api/sessions/finalize` is the canonical path for the new-session flow. The per-set / per-exercise endpoints exist for editing existing sessions.
- DTOs in `src/lib/data/serializers.ts` map Drizzle row objects (camelCase columns) to the snake_case API contract the frontend expects. Don't change DTO field names without coordinating with the frontend types in `src/lib/api.ts`.

## Frontend conventions

- Use `lucide-react` icons, not emoji, in committed code.
- Use `tabular-nums` for any displayed weight/rep/duration so digits don't shift width.
- Server-side data access (RSCs) goes through `serverApi` in `src/lib/api-server.ts`, which calls the data layer directly (no HTTP).
- Client-side fetches use `api` in `src/lib/api.ts`, which hits the Route Handlers via the same `/api/*` paths.
- The dashboard, session detail, exercise detail, and all analytics pages are RSCs. Don't add `"use client"` unless you actually need browser-only APIs (recharts, refs, event handlers, useState).

## Permissions

`.claude/settings.json` (committed) is the canonical baseline. `.claude/settings.local.json` (gitignored) is for personal overrides. The committed file's deny list is the safety net — it survives even if `settings.local.json` is rewritten by interactive approvals.
