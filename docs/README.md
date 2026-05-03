# Documentation

Product-level documentation for Lift Lab. Drafted as if this might ship publicly someday — no personal data here.

## Layout

- **[`product/`](./product/)** — what the app is, why, and where it's going
  - [`principles.md`](./product/principles.md) — the design opinions the app is built around
  - [`methodology.md`](./product/methodology.md) — the training framework the app encodes
  - [`roadmap.md`](./product/roadmap.md) — what's shipped, what's next
- **[`decisions/`](./decisions/)** — architecture decision records
  - [`README.md`](./decisions/README.md) — convention
  - [`template.md`](./decisions/template.md) — ADR template
  - Individual ADRs as `NNNN-title.md`

## What's not here

The repo also has a top-level `personal/` directory (gitignored) with the maintainer's specific training context — current program, history, body composition data, ongoing brainstorms. That content informs feature decisions but isn't intended to ship. If it exists locally, it's a useful read for context.

## For AI agents

Read [`product/principles.md`](./product/principles.md) and [`product/methodology.md`](./product/methodology.md) before suggesting features — they describe the app's opinions about what to build (and what not to). Read [`decisions/`](./decisions/) for the rationale behind specific architectural choices.

If `personal/` exists in your working directory, that's the maintainer's training context — read it when reasoning about feature priorities.
