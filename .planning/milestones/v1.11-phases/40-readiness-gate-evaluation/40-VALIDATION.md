---
phase: 40
slug: readiness-gate-evaluation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-29
updated: 2026-04-29
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for readiness gate evaluation. This phase validates the three-layer gate refactor, standalone CLI command, pipeline integration, docs routing, and planning updates; it must not trigger a real publish, tag, push, or workflow dispatch.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | existing Vitest + `tsc` + targeted grep + manual CLI invocation |
| **Quick run command** | `rtk npm test -- src/cli/commands/ship/__tests__/quality-rules.test.ts` |
| **Build command** | `rtk npm run build` |
| **Diff hygiene** | `rtk git diff --check` |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After quality-rules refactor:** run `rg` against `src/cli/commands/ship/rules/quality-rules.ts` for `gateMode|GateStatus|hardRules|warnOnlyRules`
- **After checker/pipeline update:** run targeted tests against ship tests
- **After command wiring:** run manual `node dist/cli/index.js readiness-gate --dry-run` and `--json --structured`
- **Before phase close:** run full ship test suite, `rtk npm run build`, `rtk git diff --check`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 01 | 1 | RELF-03, SAFE-03 | gate type refactor | `rg -n "gateMode|GateStatus|hardRules|warnOnlyRules" src/cli/commands/ship/rules/quality-rules.ts` | ✅ | ✅ green |
| 40-01-02 | 01 | 1 | RELF-03, SAFE-03 | quality-rules tests | `rtk npm test -- src/cli/commands/ship/__tests__/quality-rules.test.ts` | ✅ | ✅ green |
| 40-01-03 | 01 | 1 | RELF-03, SAFE-03 | checker/pipeline integration | `rtk npm test -- src/cli/commands/ship/__tests/` | ✅ | ✅ green |
| 40-01-04 | 01 | 1 | RELF-03 | build | `rtk npm run build` | ✅ | ✅ green |
| 40-01-05 | 01 | 1 | RELF-03, SAFE-02 | CLI command wiring | `node dist/cli/index.js readiness-gate --dry-run` | ✅ | ✅ green |
| 40-01-06 | 01 | 1 | RELF-03 | structured output | `node dist/cli/index.js readiness-gate --json --structured` | ✅ | ✅ green |
| 40-01-07 | 01 | 1 | RELF-03, SAFE-01 | docs routing | `rg -n "readiness-gate|fallback" docs/rules/release.md` | ✅ | ✅ green |
| 40-01-08 | 01 | 1 | SAFE-02 | diff hygiene | `rtk git diff --check` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

- Confirm `readiness-gate` never calls `publish(...)`, `git push`, or any git write path.
- Confirm `readiness-gate` keeps the three-layer semantics and does not collapse `fallback` into `passed` or `failed`.

---

## Validation Sign-Off

- [x] All tasks have automated verify steps
- [x] No validation step can trigger a real publish side effect
- [x] Machine-readable output and human-readable output both covered by tests
- [x] `nyquist_compliant: true` set only after all verification rows turn green

**Approval:** approved
