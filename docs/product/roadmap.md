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
- Alembic migrations, Pydantic schema validation, lifespan-managed startup
- shadcn (Base UI variant) component system, lucide icons, dark-only theme

## Post-MVP — data integrations

- **MacroFactor CSV import** — daily calories, macros, smoothed body weight. Schema (`nutrition_days`) already exists.
- **Boostcamp CSV import** — primary current logger; data sync is currently manual. Format TBD until first export attempt; Boostcamp doesn't expose an API.
- **BodySpec DEXA via MCP** — connector already configured upstream. Pull historical scans into `dexa_scans` table; surface in body comp analytics.
- **Whoop OAuth + daily sync** — recovery score, HRV, sleep, zone breakdown. Overlay on session log so high-strain days on low-recovery days are visible.

## Post-MVP — analytics features

- **Cross-source correlation views** — the long-term differentiator. Examples: "trunk LBM change between two DEXA scans" overlaid on "trunk volume during that interval"; "Whoop recovery trend" against "session strain".
- **Microcycle as a first-class object** — currently sessions roll up by ISO week. Add explicit microcycle definition with custom labels and start dates.
- **Heatmap views** — muscle group × week, sessions × day-of-week.
- **Emphasis-day tracking** for high-frequency whole-body splits — daily "emphasis" muscle group with rolling counts.
- **Boostcamp custom dashboard** — replace Boostcamp's locked-in JPEG analytics with native equivalents.

## Post-MVP — UX

- **Mobile-logging optimizations** — even though the app is responsive, the logging form deserves dedicated mobile polish (numeric keyboards, larger tap targets, swipe-to-delete sets).
- **Keyboard shortcuts** in logging flow (Enter → next set, Esc → cancel exercise).
- **Optimistic updates** for set-level edits.
- **Edit-existing-session flow** — the per-set/per-exercise endpoints exist but no UI uses them yet.

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
