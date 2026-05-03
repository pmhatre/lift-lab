# 0002. Session templates and the "start from template" flow

**Status:** accepted (design — implementation pending)

**Date:** 2026-05-03

## Context

The current `/session/new` flow requires the user to search and add every exercise from scratch. This is fine for ad-hoc sessions but creates real friction for daily use — it's the main reason users (including this one) reach for tools like Boostcamp, which let you pick a "Day 1" template and have everything pre-populated.

Boostcamp's solution is multi-week programs with fixed daily templates. That works for users who follow programmed routines but doesn't fit a flexible, autoregulated training style where:

- Every session has a checklist of "anchor" exercises that defines its character
- Two chest+back sessions might be different in character — one anchored on weighted chins/dips, another on incline DB + heavy row
- The user mentally regulates intensity (heavy day, light day, volume day) on the fly, without the app modeling it
- There's no fixed weekly schedule; "today is a chest+back day" is decided in the moment

What the user wants is a starting point that's faster than blank but more flexible than a programmed day.

## Decision

Introduce **templates** as user-created, named starting points for a session.

### Schema

Two new tables:

```
templates
  id, name, emphasis (nullable string), notes, created_at

template_exercises
  template_id, exercise_id, position
```

`emphasis` is a free-text or controlled-vocabulary label (chest_back, legs_core, shoulders_arms, full_body, etc.) — it surfaces in the UI but isn't load-bearing. Templates are identified by name, not emphasis.

### Session start flow

1. User taps "Start session" → sees a list of their templates plus a "Start blank" option.
2. Picking a template creates a new session and pre-populates it with the template's anchor exercises in order.
3. Each anchor exercise's sets pre-fill from that exercise's last logged session (existing beat-the-logbook pre-fill logic — already wired per-exercise).
4. Anchor order is a default; the user can reorder, remove, or add exercises freely during the session.

### Library page

A new `/templates` page where the user can:

- Create a template (name + optional emphasis + ordered list of exercises)
- Edit name, emphasis, exercise list, exercise order
- Delete a template
- See which templates have been used recently

### Pre-seeded starter templates

Ship three starter templates so the cold-start is non-blank:

- **Chest + Back** — weighted pull-ups, weighted dips, incline DB chest press, single-arm DB row
- **Legs + Core** — pendulum squat, RDL, leg curl, ab wheel
- **Shoulders + Arms** — cable lateral raise, DB preacher curl, tricep extension, rear delt fly

Users can edit or delete these freely. They're not load-bearing.

## Consequences

### Enables

- Fast session start without rebuilding Boostcamp's program-following model
- Multiple templates for the same body-part group (e.g. two chest+back templates with different exercise emphasis)
- Foundation for a future suggestion engine that fills out the rest of the session based on prior frequencies, recency, or progression-readiness — currently the user adds those manually
- A clean upgrade path to AI-assisted session planning later (the LLM gets the template context plus history and suggests fillers)

### Rules out

- Multi-week programmed structures (deload weeks, planned phases) — out of scope
- Auto-progression of weights at session start — beat-the-logbook pre-fill is per-exercise; templates don't drive progression decisions
- Day-of-week mapping — templates aren't tied to days

### Accepts

- Templates are static — no auto-modification based on what the user logs
- Heavy/light autoregulation happens outside the app; we don't surface it as a per-set or per-exercise field
- Cold-start with no templates is fine — user can start blank, or use a pre-seeded starter
