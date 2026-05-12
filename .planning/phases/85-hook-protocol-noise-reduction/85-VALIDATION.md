---
phase: 85
slug: hook-protocol-noise-reduction
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
---

# Phase 85 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | `vitest`, `unittest`, shell smoke, POSIX shell syntax check |
| **Quick run command** | `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts` |
| **Full suite command** | `rtk sh -n scripts/hooks/templates/pre-commit && rtk sh -n scripts/hooks/templates/commit-msg && rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts && rtk python3 -m unittest scripts/tests/test_rule_control_workflow.py && rtk npm run hooks:smoke` |
| **Estimated runtime** | Quick: ~10-20s; full: ~20-40s |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 85-01-01 | 01 | 1 | HOOK-AI-04 | protocol-only mode suppresses human logs but still emits protocol lines | integration | `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts` | ✅ green |
| 85-01-02 | 01 | 1 | HOOK-AI-04 | log-path fallback is always printed and log file stores complete JSON | integration | `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts` | ✅ green |
| 85-01-03 | 01 | 1 | HOOK-AI-04 | template and managed hooks both expose `CODEMAP_PROTOCOL_ONLY`, `CODEMAP_PRECHECK_LOG_PATH`, and `not_applicable` | static contract | `rtk python3 -m unittest scripts/tests/test_rule_control_workflow.py` | ✅ green |
| 85-01-04 | 01 | 1 | HOOK-AI-04 | real commit flow covers protocol-only blocker and report-only limit-reached case | smoke | `rtk npm run hooks:smoke` | ✅ green |

## Failure Scenario Coverage

- blocked commit-format in protocol-only mode
- report-only rule validation limit reached but non-blocking
- staged-file-limit fail-fast still bypasses heavy checks
- package-test fallback still returns structured verify route

## Validation Sign-Off

- [x] Validation includes success and failure paths.
- [x] Protocol-only mode has automated coverage.
- [x] Runtime smoke covers the new report-only wording.
- [x] `nyquist_compliant: true` set.

**Approval:** verified 2026-05-12
