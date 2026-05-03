# Training methodology

The training framework Lift Lab is built around. This is what the data model encodes and what the analytics surface.

## Core concepts

### Session

A single gym visit. Has a date, optional day type (Chest/Back, Legs/Core, Shoulders/Arms, Full Body, or none), optional duration, body weight, notes, and an ordered list of exercises with their sets.

### Exercise entry

A single exercise within a session — references the canonical exercise, has an order, optional notes, and an array of sets.

### Set

The granular unit. Has reps, weight (lbs), an `is_warmup` flag, optional RPE / RIR, and a status (`done` / `failed` / `partial`). **Working sets** (non-warmup, status=done) are what analytics count.

### Microcycle

The default unit of training organization (typically 7 days). Volume analytics roll up to the microcycle. Microcycles can be flexibly defined — they don't need to align with calendar weeks.

### Exercise library

Canonical exercise database. Each exercise has primary + secondary muscle groups, equipment type, movement pattern, and aliases for fuzzy matching during imports. This is the spine of volume tracking — sessions reference exercises, exercises reference muscle groups, analytics aggregate.

## Double progression

The progression model the app encodes:

1. Each exercise has a target rep range (e.g. 6–8 for weighted pull-ups).
2. **Ready to progress** = both working sets hit the top of the rep range.
3. When ready, the user bumps the weight (typically 5 lbs) and resets to the bottom of the range.

The app surfaces this state but never auto-advances. The user owns the decision to bump weight.

## Beat the logbook

The session-to-session motivator. When the user adds an exercise to a new session, the UI shows:

- The most recent session's top set (weight × reps)
- Whether that session was a weight PR, rep PR, maintained, or regression
- Whether the user is "Ready", "Close", or "Working" relative to the rep ceiling

When a session is finalized, the backend runs PR detection:

- **Weight PR** if the top working-set weight exceeds all-time max
- **e1RM PR** if the estimated 1RM (Epley: `weight × (1 + reps / 30)`) exceeds all-time max
- PR detection is **idempotent** — re-running on the same session does not create duplicates

## Working set vs warmup

Warmup sets count toward exercise execution but never toward volume analytics or PR detection. The `is_warmup` flag on each set is the only distinction the app needs.

## Muscle group taxonomy

The canonical 14 groups, matching Boostcamp's taxonomy for cross-system consistency:

> Chest · Upper Back · Lats · Front Delts · Middle Delts · Rear Delts · Biceps · Triceps · Quadriceps · Hamstrings · Glutes · Calves · Abs/Core · Lower Back

Volume analytics roll up to **primary** muscle group only by default. Secondary muscle group involvement is recorded but not double-counted.

## Why this methodology

The app intentionally encodes a specific way of training — double progression, working-set counting, microcycle-organized. This isn't because other methods are wrong; it's because building one opinionated tool well is more useful than building a generic shell. Users on a different methodology (linear periodization, RPE-based autoregulation, etc.) can extend the model, but the defaults reflect a specific training philosophy.
