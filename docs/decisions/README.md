# Architecture decision records (ADRs)

Lightweight ADRs for non-obvious technical and product decisions.

## When to write one

- A reasonable alternative exists and the choice is non-obvious from reading the code
- The decision crosses several files / several layers
- A future contributor (or future you) might wonder "why did we do it this way" six months from now

If a commit message and diff are sufficient, skip the ADR.

## Naming

`NNNN-kebab-case-title.md` — `NNNN` is a four-digit zero-padded sequence number, monotonically increasing.

## Structure

See [`template.md`](./template.md). Each ADR has:

- **Status** — accepted | superseded | deprecated
- **Date** — when the decision was made
- **Context** — what's the situation, what's the constraint
- **Decision** — what we chose, specifically
- **Consequences** — what this enables, rules out, or accepts

Keep them short. One screen is usually enough.
