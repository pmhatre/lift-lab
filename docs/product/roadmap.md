# Roadmap

## Shipped (v0.1 + audit pass)

- Native session logging with bulk-finalize on completion
- FitNotes CSV import with fuzzy exercise-name matching
- Beat-the-logbook display per exercise during logging
- Double-progression "Ready to progress" detection
- Weight + e1RM PR detection (idempotent)
- Volume analytics by muscle group (stacked bar by week)
- Training frequency analytics
- Body composition view (placeholder for DEXA + MacroFactor)
- Per-exercise progressive overload chart
- React Server Components for read pages, recharts client islands for charts
- Schema migrations, request body validation, opinionated startup hooks
- shadcn (Base UI variant) component system, lucide icons, dark-only theme

## Shipped (mobile pass)

- Mobile-first set-row layout — stepper inputs (`−` / `+`) for weight (5 lb) and reps (1), 44px tap targets
- "Add Set" auto-copies the previous set's weight + reps (implicit copy-last-set)
- Sticky Finish bar at the bottom of the viewport on mobile, with safe-area-inset padding for iOS PWA mode
- PWA manifest (`/manifest.webmanifest`) + SVG icon → installable / "Add to Home Screen" works
- Apple `apple-mobile-web-app-capable` metadata for fullscreen iOS PWA

## Shipped (Vercel migration)

- Backend ported from FastAPI/SQLite to Next.js Route Handlers + Drizzle/Postgres ([ADR 0003](../decisions/0003-migrate-to-vercel-pattern.md))
- Single-app architecture: Route Handlers + RSCs share a typed data layer (no HTTP roundtrip on server-rendered pages)
- Neon Postgres provisioned via Vercel Marketplace
- pnpm replaces npm; Drizzle replaces SQLModel + Alembic; Zod replaces Pydantic; papaparse + fuse.js replace Python csv + rapidfuzz
- N+1 patterns from the original audit replaced with proper Postgres aggregations (jsonb unnesting, json_agg for nested set arrays)

## Shipped (mobile usability iteration)

Real-phone testing surfaced and fixed:

- Day Type was a constrained dropdown rendering raw enum values (`legs_core`); now a free-text input with the four canonical day types as preset chips. Custom day types just work.
- Search dropdown only showed one result because the parent `<Card>` had `overflow-hidden` baked into shadcn defaults — clipping the absolute-positioned dropdown to the Card's height. Fixed with explicit `overflow-visible`.
- Create-new-exercise flow: tapping "+ Create" used to silently create with empty metadata. Now opens a bottom-sheet form with name (pre-filled from query), primary muscle group chips (canonical 14), and optional equipment.
- Sticky mobile Finish bar covered the bottom of the search dropdown (z-40 over z-20). Now hides automatically while the search input has content.
- Discard button in the page header. Confirms before nav if the session has any logged content. Sessions are local-state until Finish, so discard is just a navigate-back.
- UTC date bug: session-form default and dashboard "today" lookup were both using `new Date().toISOString().slice(0, 10)`, which rolls to tomorrow during evenings in the Americas. Switched to local timezone via `toLocaleDateString("sv-SE")` (client) and `Intl.DateTimeFormat` with explicit `America/Los_Angeles` timezone (server, hard-coded for single-user app).

## Post-MVP — design done, build pending

- **Session templates** ([ADR 0002](../decisions/0002-session-templates.md)) — user-created named starting points (e.g. "Weighted Chins/Dips", "Incline DB + Heavy Row"). Pick a template at session start; anchor exercises auto-populate with last-session pre-fill; rest of the session is flexible. Library page to manage. Replaces the day-type concept as the primary session-start affordance.

## Post-MVP — data integrations

- **MacroFactor CSV import** — daily calories, macros, smoothed body weight. Schema (`nutrition_days`) already exists.
- **Boostcamp historical data extraction** — primary current logger holds 71+ weeks of session data. Original spec said "no API, no CSV, JPEG-only analytics" and treated this as solved-as-impossible. Worth a dedicated session to challenge that: inspect the Boostcamp app's network calls, mobile traffic, anything that might surface a programmatic export path. If genuinely no path exists, evaluate OCR or screenshot-based fallbacks. This is the highest-leverage data import — without it the analytics layer is missing the most recent year-and-a-half of training history.
- **BodySpec DEXA via MCP** — connector already configured upstream. Pull historical scans into `dexa_scans` table; surface in body comp analytics.
- **Whoop OAuth + daily sync** — recovery score, HRV, sleep, zone breakdown. Overlay on session log so high-strain days on low-recovery days are visible.

## Post-MVP — analytics features

- **Cross-source correlation views** — the long-term differentiator. Examples: "trunk LBM change between two DEXA scans" overlaid on "trunk volume during that interval"; "Whoop recovery trend" against "session strain".
- **Microcycle as a first-class object** — currently sessions roll up by ISO week. Add explicit microcycle definition with custom labels and start dates.
- **Heatmap views** — muscle group × week, sessions × day-of-week.
- **Emphasis-day tracking** for high-frequency whole-body splits — daily "emphasis" muscle group with rolling counts.
- **Boostcamp custom dashboard** — replace Boostcamp's locked-in JPEG analytics with native equivalents.

## Post-MVP — exercise library

- **Bulk-import a richer exercise library.** The seeded library is 53 exercises ported from FitNotes — comprehensive for the maintainer's current routine but limited otherwise. Open-licensed candidates worth evaluating:
  - [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) — ~870 exercises, MIT-licensed, JSON format with primary/secondary muscles, equipment, level
  - [Wger exercise database](https://github.com/wger-project/wger) — open-source workout manager with comprehensive exercise data, GPL-licensed
  - EXRX is mostly a static reference site; harder to ingest cleanly
  Goal: pick one, write a one-shot import script that maps the source's muscle taxonomy to ours, and bulk-load. Existing user-created and FitNotes-imported exercises stay; this just expands the seed library.

## Post-MVP — UX

- **Edit-existing-session flow** — the per-set/per-exercise endpoints exist but no UI uses them yet.
- **Swipe-to-delete on set rows** — the explicit `X` works fine; swipe is a nice-to-have.
- **Keyboard shortcuts** in logging flow (Enter → next set, Esc → cancel exercise) — desktop only.
- **Optimistic updates** for set-level edits in the existing-session edit flow.
- **Service worker for offline write queue** — current PWA installs but reads/writes still need network. Adding a service worker that caches the shell + queues writes when offline would be a real reliability upgrade for gym Wi-Fi.
- **PNG icons** — the manifest currently ships a single SVG icon. Modern browsers render it fine, but native iOS "Add to Home Screen" prefers PNGs at specific sizes (180×180, 192×192, 512×512). Generate before any public release.

## Pre-public release checklist

If this ever opens up to a broader audience:

- [ ] LICENSE file (MIT or similar — pick before first external commit)
- [ ] CONTRIBUTING.md if accepting PRs
- [ ] Multi-user / auth path (currently zero — single-user assumed throughout the schema)
- [ ] Configurable defaults (rep ranges, day-type labels, muscle group taxonomy) — currently hard-coded
- [ ] Privacy review of `seed_exercises.py` and any committed defaults
- [ ] Onboarding flow: first-launch experience for a new user with no data
- [ ] Hosted-version path (Tailscale + Mac Mini works for one user; doesn't scale)
- [ ] Decide whether to publish the cross-source integration roadmap (Whoop / DEXA / MacroFactor) or keep it ambiguous

## Aspirational

- **Consumer-grade product** — the cross-source analytics stack (training × DEXA × Whoop × nutrition) doesn't exist as a unified tool anywhere. There may be a real product here if the personal version proves out the model.
