# Phase 63: Graph Schema Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 63-graph-schema-foundation
**Areas discussed:** Schema shape, Migration and cutover, Edge confidence semantics

---

## Schema shape

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve current primary truth | Keep `modules / symbols / dependencies` as the primary truth and strengthen traversal-oriented persistence around it | ✓ |
| Unified node/edge primary truth | Move the core persistence truth to a `nodes / edges` model and add compatibility reads outward | |
| Hybrid graph projection | Keep domain tables but add a distinct graph projection/adjacency layer for traversal and clustering | |

**User's choice:** Preserve current primary truth
**Notes:** The phase should optimize SQLite persistence for graph operations without rewriting the core domain model.

---

## Migration and cutover

| Option | Description | Selected |
|--------|-------------|----------|
| Rebuild on generate | `generate` rebuilds the current repo graph truth directly into the new schema; old SQLite graph data is not preserved | ✓ |
| Explicit schema upgrade path | Preserve existing SQLite graph data via controlled upgrade/backfill | |
| Dual strategy | Default rebuild, optional upgrade path when preserving existing graph data matters | |

**User's choice:** Rebuild on generate
**Notes:** Simplicity and low migration risk win over preserving historical SQLite graph payloads.

---

## Edge confidence semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Strict three-tier semantics | `EXTRACTED` = parser/AST direct proof; `INFERRED` = rule-based inference; `AMBIGUOUS` = multiple reasonable unresolved targets | ✓ |
| Conservative labeling | Use `EXTRACTED` sparingly and collapse most non-direct relations into `AMBIGUOUS` | |
| Pragmatic labeling | Use `INFERRED` for strong single-target guesses; reserve `AMBIGUOUS` for explicit multi-candidate conflicts | |

**User's choice:** Strict three-tier semantics
**Notes:** Later phases should be able to consume confidence as durable persisted truth with a clear semantic boundary.

---

## the agent's Discretion

- Exact SQLite table/index/projection design
- Exact rebuild flow and compatibility diagnostics
- Exact heuristics for producing `INFERRED` edges

## Deferred Ideas

None
