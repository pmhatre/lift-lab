# Design principles

The opinions Lift Lab is built around. New features should pass these.

## 1. Data-first, not feature-first

If the data isn't clean and queryable, the features are worthless. Invest in the import pipeline, schema, and exercise-name normalization before flashy UI.

## 2. Logging friction is the enemy

If logging a session is annoying, it won't happen. The session-logging screen has to be fast: search exercise → tap → enter weight/reps → next set. Usable on a phone while standing at the rack. Numeric inputs use the right keyboard. Recent and search results are one tap away.

## 3. Beat the logbook is the primary motivator

Every session should make it immediately obvious: am I progressing? Surface previous performance per exercise *while* the user is logging the new one. Don't bury this in an analytics tab.

## 4. Don't rebuild Boostcamp

Program-following and planned-workout-structure: Boostcamp does that fine. Lift Lab's value is the analytics layer and cross-source correlation — connecting training volume to body composition (DEXA), recovery (Whoop), and nutrition (MacroFactor) over time. That's the long-term moat.

## 5. Flexible session structure

Some days are a fixed split. Some days are "whatever I feel like." The schema and UI must support both without forcing one model. `day_type` is optional; exercise selection is never constrained by it.

## 6. SQLite is the backup

No cloud sync required. The SQLite file *is* the data — easy to back up, easy to inspect, easy to migrate. Alembic migrations make it portable.

## 7. Architecture for scale, not premature scale

FastAPI + SQLModel + Alembic is a clean enough API + ORM layer that this could be swapped to Postgres later. But don't build for multi-tenant from day one. Single-user assumptions are fine until they aren't.

## 8. Local-first

The whole stack runs on the user's machine. No required cloud services. External data sources (DEXA, Whoop, MacroFactor) come in via file uploads or APIs the user controls. The app never phones home.
