---
status: complete
phase: 65-recursive-impact-analysis
source: [65-01-SUMMARY.md]
started: 2026-05-09T09:07:29Z
updated: 2026-05-09T09:08:18Z
---

## Current Test

[testing complete]

## Tests

### 1. CLI File Impact Returns Layered Graph Truth
expected: After `generate --symbol-level`, running `node dist/cli/index.js impact --file src/target.ts --transitive --json` succeeds and returns one layered impact contract with `summary`, `direct[]`, and `transitiveLayers[]`, instead of a local codemap-only flat walk.
result: pass
evidence: In real temp repo `/tmp/codemap-phase65-manual-QKukmd`, built CLI `node /data/codemap/dist/cli/index.js impact --file src/target.ts --transitive --json` returned layered graph truth with `status: "ok"`, `summary.directCount: 1`, `summary.transitiveCount: 1`, one `direct[]` node for `src/caller.ts`, and one `transitiveLayers[]` depth-2 node for `src/transitive.ts`.

### 2. MCP Symbol Impact Reuses The Same Layered Truth
expected: Calling MCP tool `codemap_impact` for a symbol entrypoint returns the same layered direct-vs-transitive traversal truth as CLI impact, adapted to MCP field names, rather than using a second symbol-only traversal contract.
result: pass
evidence: A real MCP stdio client connected to built server/storage returned `codemap_impact` symbol output with the same layered truth: `status: "ok"`, `summary.direct_count: 1`, `summary.transitive_count: 1`, direct symbol `caller`, and depth-2 transitive symbol `transitiveCaller`, proving CLI and MCP share one traversal truth.

### 3. Missing Graph Or Ambiguous Entrypoints Fail Explicitly
expected: If graph truth is missing, the requested file does not exist, or a symbol entrypoint is ambiguous, shipped surfaces return explicit structured states such as `unavailable`, `not_found`, or `ambiguous` with diagnostics/remediation, instead of empty success or silent narrowing.
result: pass
evidence: Built CLI on repo without generated graph returned `status: "unavailable"` with `GRAPH_NOT_FOUND` and full-regenerate remediation. Built CLI on existing graph with `--file src/missing.ts` returned `status: "not_found"` with `FILE_NOT_FOUND`. Real MCP `codemap_impact` for symbol `duplicate` returned `status: "ambiguous"`, `AMBIGUOUS_ENTRYPOINT`, and both duplicate symbol candidates.

### 4. Partial Graph And Traversal Truncation Lower Confidence Explicitly
expected: If graph truth is partial or traversal is truncated by limits, CLI/MCP still return structured results but mark reduced confidence and warnings such as `GRAPH_PARTIAL` or `TRAVERSAL_TRUNCATED`, rather than claiming full-confidence completeness.
result: pass
evidence: After marking SQLite metadata as partial and calling MCP `codemap_impact` with `limit: 1`, the real MCP transport returned `confidence: "reduced"`, `graph_status: "partial"`, `truncated: true`, and warnings containing both `GRAPH_PARTIAL` and `TRAVERSAL_TRUNCATED` instead of claiming full-confidence completeness.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
