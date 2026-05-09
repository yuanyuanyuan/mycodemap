---
status: complete
phase: 66-community-detection-baseline
source: [66-01-SUMMARY.md]
started: 2026-05-09T09:10:36Z
updated: 2026-05-09T09:11:18Z
---

## Current Test

[testing complete]

## Tests

### 1. MCP Communities Returns Interpretable Community Summaries
expected: After `generate --symbol-level` and community-ready persisted graph truth, calling MCP tool `codemap_communities` succeeds and returns an interpretable `summary + communities[]` result instead of opaque cluster IDs only.
result: pass
evidence: In real temp repo `/tmp/codemap-phase66-manual-njA9Za`, after built `generate --symbol-level` and a community-ready SQLite fixture, real MCP `codemap_communities` returned `status: "ok"` with `summary.total_modules: 6`, `summary.total_edges: 3`, `summary.community_count: 3`, plus interpretable `communities[]` entries instead of opaque cluster IDs only.

### 2. Community Labels And Top Paths Stay Project-Relative
expected: Community-facing fields such as `label` and `top_paths` stay readable and project-relative on real temporary repos, instead of leaking absolute temp-directory paths.
result: pass
evidence: Real MCP happy-path output used readable project-relative labels and paths, including community labels `src/auth` and `src/billing`, with `top_paths` like `src/auth/policy.ts`, `src/auth/service.ts`, `src/shared/types.ts`, and `src/billing/invoice.ts` rather than leaking `/tmp/...` absolute paths.

### 3. Sparse Or Singleton-Heavy Graphs Reduce Confidence Explicitly
expected: If the persisted graph is too sparse or singleton-heavy for precise clustering, `codemap_communities` still returns structured output but lowers confidence and surfaces warning codes such as `LOW_SIGNAL_SPARSE_GRAPH` or `LOW_SIGNAL_SINGLETON_HEAVY` instead of overclaiming precision.
result: pass
evidence: After reseeding the real SQLite graph into a sparse singleton-heavy shape, real MCP `codemap_communities` returned `confidence: "reduced"` with warnings `LOW_SIGNAL_SPARSE_GRAPH` and `LOW_SIGNAL_SINGLETON_HEAVY`, while still returning structured `summary + communities[]` output.

### 4. Real SQLite And Real MCP Transport Path Works End To End
expected: The shipped community output is proven through built graph generation, persisted SQLite rows, and a real MCP stdio transport session, rather than only unit-level or mock-only assertions.
result: pass
evidence: The shipped path was exercised end-to-end through built `node /data/codemap/dist/cli/index.js generate --symbol-level`, direct SQLite row updates in `.mycodemap/governance.sqlite`, and a real MCP stdio client connected to the built server/storage. Automated proof also passed in `tests/e2e/graph-community-detection.test.ts`.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
