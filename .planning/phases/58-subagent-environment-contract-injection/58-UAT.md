---
status: complete
phase: 58-subagent-environment-contract-injection
source:
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-01-SUMMARY.md
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-02-SUMMARY.md
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-03-SUMMARY.md
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-04-SUMMARY.md
started: 2026-05-02T17:42:00.000Z
updated: 2026-05-05T13:47:14Z
---

## Current Test

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
notes: "reconciler.ts wires env-contract-plan into createInitPlan/applyInitPlan per archived 58-03-SUMMARY"

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

## Subagent Verification Rework

Automated tests 1-10 remain historical pass. The only remaining closure surface is the real subagent checkpoint.

- `Claude required`
- `Codex optional`

| ID | Path | Requirement | Status | Evidence | Notes |
|----|------|-------------|--------|----------|-------|
| S1 | Claude real subagent path | SDC-05 | pass | `docs/generated/phase-58/subagent-evidence/claude-session.md`, `docs/generated/phase-58/subagent-evidence/claude-subagent.json` | `pass` — transcript proves `mycodemap env-contract --for explore --json` executed as first action before substantive work. |
| S2 | Codex parity path | SDC-05 | pass | `docs/generated/phase-58/subagent-evidence/codex-session.md`, `docs/generated/phase-58/subagent-evidence/codex-subagent.json` | `pass` — transcript proves `mycodemap env-contract --for worker --json` executed as first command before any substantive work. |
| S3 | Preparation script and fixture staging | SDC-05, VER-03 | pass | `scripts/verify-subagent-env-contract.mjs`, `docs/generated/phase-58/subagent-evidence/verification-manifest.json`, `.claude/agents/env-contract-verifier.md`, `.codex/agents/env-contract-verifier.toml` | Script stages assets only. It does not call `claude -p` or `codex exec --agent`. |

### Verdict Semantics

- `pass`: transcript proves retrieval-before-work.
- `fail`: path ran, but retrieval was missing, late, or contradicted by the transcript.
- `waived`: Codex optional parity was not run and the exact blocker is recorded.
- `blocked`: required path could not be executed at all.

### Required Evidence Files

- `docs/generated/phase-58/subagent-evidence/claude-session.md`
- `docs/generated/phase-58/subagent-evidence/claude-subagent.json`
- `docs/generated/phase-58/subagent-evidence/codex-session.md`
- `docs/generated/phase-58/subagent-evidence/codex-subagent.json`
- `docs/generated/phase-58/subagent-evidence/verification-manifest.json`

## Summary

total: 10 (historical automated) + 3 (subagent rework)
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
