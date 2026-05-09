---
status: complete
phase: 63-graph-schema-foundation
source: [63-01-SUMMARY.md, 63-02-SUMMARY.md]
started: 2026-05-09T06:55:15Z
updated: 2026-05-09T08:14:56Z
---

## Current Test

[testing complete]

## Tests

### 1. Fresh Generate Creates Both Artifacts
expected: In a fresh temp repo, running `node dist/cli/index.js generate --symbol-level` completes successfully. The command does not crash on SQLite loader initialization, and it writes both `.mycodemap/governance.sqlite` and `.mycodemap/codemap.json`.
result: pass
evidence: Built CLI was run against fresh temp repo `/tmp/codemap-phase63-manual-Usi45I` via `node /data/codemap/dist/cli/index.js generate --symbol-level`. Command completed successfully, printed `图状态: complete`, and `find` confirmed both `.mycodemap/codemap.json` and `.mycodemap/governance.sqlite`.

### 2. Query Search Still Returns Stable Success Output
expected: After generate succeeds, running `node dist/cli/index.js query --search helper --json` succeeds and returns a stable JSON success envelope with at least one result matching `helper`.
result: pass
evidence: `node /data/codemap/dist/cli/index.js query --search helper --json` returned JSON search envelope with `type: "search"`, `query: "helper"`, `count: 2`, and results for both `src/helper.ts` and exported symbol `helper`.

### 3. Stale Projection Fails Closed With Rebuild Guidance
expected: If the generated SQLite graph projection is tampered with or stale, the affected read path fails closed with explicit rebuild guidance such as `GRAPH_SCHEMA_REBUILD_REQUIRED` or a `generate`/`rebuild` remediation hint, instead of returning empty or partial success.
result: pass
evidence: After deleting one `graph_edges` row from the real SQLite file, built `SQLiteStorage` read path exited with `GRAPH_SCHEMA_REBUILD_REQUIRED` and message `Traversal projection drift detected (0/1 rows). Graph schema is outdated. Run \`mycodemap generate\` to rebuild the SQLite graph.`

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
