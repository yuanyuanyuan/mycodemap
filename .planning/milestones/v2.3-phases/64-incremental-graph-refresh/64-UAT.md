---
status: complete
phase: 64-incremental-graph-refresh
source: [64-01-SUMMARY.md]
started: 2026-05-09T09:04:34Z
updated: 2026-05-09T09:06:06Z
---

## Current Test

[testing complete]

## Tests

### 1. Incremental Refresh Succeeds With Structured Summary
expected: After a full `generate`, modifying a tracked file and running `node dist/cli/index.js generate --incremental --changed-files src/helper.ts --json --structured` succeeds with a structured JSON envelope. The output reports `mode: "incremental"`, `status: "success"`, and refresh counts including `changed` and `recomputed`.
result: pass
evidence: In real temp repo `/tmp/codemap-phase64-manual-7mp2wZ`, built CLI `node /data/codemap/dist/cli/index.js generate --incremental --changed-files src/helper.ts --json --structured` returned JSON with `mode: "incremental"`, top-level `status: "success"`, `refresh.status: "success"`, and counts `changed: 1`, `recomputed: 2`, `invalidated: 2`, `failed: 0`.

### 2. Direct Execution Reads The Refreshed Truth
expected: After a successful incremental refresh, direct-execution reads like `node dist/cli/index.js query --search helper --json` see the refreshed graph truth rather than stale `codemap.json`, and the refreshed `.mycodemap/codemap.json` content changes from the pre-refresh snapshot.
result: pass
evidence: Before refresh, `.mycodemap/codemap-before.json` was copied. After refresh, `cmp -s` returned `1`, proving `codemap.json` changed. `query --search helper --json` still succeeded with `count: 2`, and SQLite metadata key `last_refresh_summary_json` stored the structured refresh summary.

### 3. Partial Refresh Is Explicit And Preserves Usable Truth
expected: If one changed file cannot be re-read during incremental refresh, the command still returns structured output with `status: "partial"` plus failed-slice diagnostics such as `INCREMENTAL_PARTIAL_SLICE_FAILURE`, and existing direct-execution reads continue to work instead of returning corrupted truth.
result: pass
evidence: After making `src/helper.ts` unreadable and rerunning incremental refresh, built CLI returned top-level `status: "partial"` and `graph_status: "partial"` with diagnostics including `INCREMENTAL_PARTIAL_SLICE_FAILURE`. Counts showed `failed: 1`, and a subsequent `query --search helper --json` still succeeded, proving usable truth was preserved.

### 4. Unreliable Scope Fails Closed With Full-Regenerate Guidance
expected: If incremental refresh is asked to process a changed file outside the persisted graph truth, the command exits with `status: "failed"`, returns a stable diagnostics code such as `INCREMENTAL_INVALIDATION_BOUNDARY_UNRESOLVED`, and tells the user to run full `generate` instead of silently rebuilding everything.
result: pass
evidence: Running built CLI with `--incremental --changed-files src/missing.ts --json --structured` exited non-zero and returned `status: "failed"` with diagnostics code `INCREMENTAL_INVALIDATION_BOUNDARY_UNRESOLVED` plus remediation `Run \`mycodemap generate --symbol-level\` to rebuild full truth before retrying incremental refresh.`

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
