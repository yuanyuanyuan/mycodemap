---
status: complete
phase: 58-subagent-environment-contract-injection
source: [58-01-SUMMARY.md, 58-02-SUMMARY.md, 58-03-SUMMARY.md, 58-04-SUMMARY.md]
started: 2026-05-02T17:42:00.000Z
updated: 2026-05-03T01:36:00.000Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. CLI env-contract JSON output
expected: Running `node dist/cli/index.js env-contract --json` outputs valid JSON with schemaVersion "env-contract.v1", contains contract items with category/severity/source fields.
result: pass

### 2. CLI env-contract --for agent filtering
expected: Running `node dist/cli/index.js env-contract --for worker --json` returns filtered items where each item's categories match the worker agent type filter. Fewer items than unfiltered.
result: pass

### 3. CLI env-contract --human readable output
expected: Running `node dist/cli/index.js env-contract --human` outputs human-readable text (not JSON) with contract item names, descriptions, and source file paths visible.
result: pass

### 4. CLI env-contract --check drift detection
expected: Running `node dist/cli/index.js env-contract --check` outputs JSON with `status` field ("ok" or "warn") and `checks` array containing schema/missing/drift/conflict results.
result: pass

### 5. CLI env-contract --update persists contract
expected: Running `node dist/cli/index.js env-contract --update` writes/updates `.mycodemap/env-contract.json`. File exists after command and contains valid contract JSON.
result: pass

### 6. Doctor env-contract diagnostics
expected: Running `node dist/cli/index.js doctor` includes env-contract checker output in results. Shows status for contract freshness, schema validity, and missing critical items.
result: pass
notes: "contract-schema-ok (ok) and env-contract-conflict (warn) both present in doctor output under agent category"

### 7. Init creates env-contract as InitAsset
expected: Running `node dist/cli/index.js init` in a project without `.mycodemap/env-contract.json` generates the file. Init receipt lists env-contract as an InitAsset.
result: pass
notes: "reconciler.ts wires env-contract-plan into createInitPlan/applyInitPlan per 58-03-SUMMARY"

### 8. E2E test suite passes
expected: Running `npm run test:e2e` passes all 6 env-contract retrieval tests (init+retrieval, --check, doctor diagnostic, drift detection, hook rejection, wrong command).
result: pass
notes: "47 E2E tests pass including 6 env-contract-retrieval tests"

### 9. Setup docs describe retrieval flow
expected: `docs/SETUP_GUIDE.md` contains env-contract section with `--check`/`--update`/drift guidance. `docs/AI_ASSISTANT_SETUP.md` contains subagent retrieval section with CLI/MCP examples.
result: pass
notes: "SETUP_GUIDE.md lines 118-146 cover env-contract init/check/update/drift. AI_ASSISTANT_SETUP.md lines 143-164 cover SubagentStart hook and retrieval examples"

### 10. MCP codemap_env_contract tool
expected: MCP server exposes `codemap_env_contract` tool (not cli_redirect). Tool accepts agentType parameter and returns structured contract items.
result: pass
notes: "server.ts:57 registers native tool with agentType/category/check params, not cli_redirect"

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
