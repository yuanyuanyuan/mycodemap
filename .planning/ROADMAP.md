# Roadmap: CodeMap

## Current Planning Surface

**Status:** No active milestone. Latest shipped milestone: [`v2.2 architecture-foundation`](./milestones/v2.2-ROADMAP.md) on 2026-05-07.

Use `$gsd-new-milestone /data/codemap` to start the next cycle (questioning → research → requirements → roadmap). Until then, active planning truth is limited to:

- `.planning/PROJECT.md`
- `.planning/MILESTONES.md`
- `.planning/STATE.md`
- `.planning/backlog.md`

## Latest Shipped Milestone

- `v2.2 architecture-foundation` — archived at `.planning/milestones/v2.2-ROADMAP.md`
  - Parser main path converged to registry-backed tree-sitter
  - Persistent storage converged to SQLite-only truth
  - `query` / `deps` / `analyze` now share one direct-execution seam
  - `codemap_context` ships with bounded routing, detail levels, and fail-closed tool filtering

## Backlog

See `.planning/backlog.md` for non-milestone engineering debt and follow-up opportunities.
