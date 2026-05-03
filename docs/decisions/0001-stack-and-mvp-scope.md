# 0001. Stack and MVP scope

**Status:** superseded by [0003 — Migrate to Vercel pattern](./0003-migrate-to-vercel-pattern.md)

**Date:** 2026-04-30

## Context

Building a personal training tracker as a single-user local app. Existing tools each cover one slice (Boostcamp logs sessions, MacroFactor logs nutrition, Whoop logs recovery, BodySpec scans body comp), and none of them connect to each other. The thesis: stitching them into one coherent view is the actual product.

Constraints:
- Single user, runs locally on a Mac mini accessible via Tailscale
- No required cloud services, no auth surface
- Data-heavy: imports from multiple CSV sources, eventual API integrations
- Analytics-heavy: muscle group volume, progressive overload tracking, cross-source correlation

Alternatives considered:
- Pure Next.js full-stack (Node API routes) — rejected: weaker data-science libs for the analytics side
- Postgres from day one — rejected: infra overhead unjustified for one user
- No-code / spreadsheet — rejected: extensibility ceiling too low for cross-source correlation work

## Decision

**Stack**
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind. Full-stack-capable, good charting ecosystem, familiar.
- **Backend:** Python + FastAPI. Better data-science libs than Node, Pydantic for typed request bodies, plays well with SQLModel.
- **Storage:** SQLite as primary store. SQLModel as the ORM (Pydantic + SQLAlchemy under one type system). Alembic for migrations.
- **Charts:** Recharts. React-native, good enough for the visualizations needed.
- **Auth:** None. Local-first, single user. Tailscale provides remote access.

**MVP scope**
- File-based imports only (FitNotes, Boostcamp, MacroFactor CSVs)
- No API integrations until post-MVP
- Get the data model and core UX right before adding integration surface area

**Core feature**
- "Beat the logbook" — per-exercise display of previous performance during session logging — is the primary motivator and the reason to use this over existing loggers.

**Schema decisions**
- Sessions are date-keyed, not time-keyed (a session = a day, not a wall-clock window)
- Exercise library with muscle-group mapping is the analytics spine
- `sets` is the granular unit; `session_exercises` is the join

## Consequences

### Enables
- Fast iteration on the analytics layer without infra overhead
- Clean separation between data engine (Python) and presentation (Next.js)
- Easy backup (SQLite file)
- Possible future migration to Postgres if scale ever requires it (SQLModel/Alembic abstract the DB)
- Cross-source correlation as a first-class feature, not an afterthought

### Rules out
- Multi-tenant SaaS without significant rework (auth, isolation, hosted DB)
- Real-time collaboration / sharing
- Generic-fitness-app positioning — the app is opinionated about double progression and working-set tracking

### Accepts
- Manual CSV imports for MVP (Boostcamp doesn't have an API; FitNotes/MacroFactor exports are user-initiated)
- No mobile-native app — Tailscale + responsive web is the mobile story
- Single-user assumptions baked into the data model (no `user_id` columns) — explicit pre-public-release work item
