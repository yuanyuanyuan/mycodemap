---
phase: 84
slug: ai-agent-hook-control-protocol
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-12
---

# Phase 84 — Validation Strategy

> Per-phase validation contract for hook protocol hardening during a between-milestones follow-up.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frameworks** | `vitest`, `unittest`, shell smoke |
| **Quick run command** | `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts` |
| **Full suite command** | `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts && rtk python3 -m unittest scripts/tests/test_rule_control_workflow.py && rtk npm run hooks:smoke` |
| **Estimated runtime** | Quick: ~5-10s; full: ~15-30s |

## Sampling Rate

- After hook template edits: run the payload test first.
- After protocol/contract changes: run the workflow static unittest.
- Before closeout: run full smoke against real `git commit` cases.
- Max feedback latency: 30 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 84-01-01 | 01 | 1 | HOOK-AI-01 | `staged-file-limit` blocks before heavy checks and exposes structured `split_commit` recovery | integration | `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts` | ✅ extend existing | ✅ green |
| 84-01-02 | 01 | 1 | HOOK-AI-02 | `commit-msg` emits parity protocol for `commit-format` and `commit-scope-message` | integration | `rtk proxy npx vitest run src/cli/init/__tests__/hook-payloads.test.ts` | ✅ extend existing | ✅ green |
| 84-01-03 | 01 | 1 | HOOK-AI-03 | template truth remains framework-agnostic and parity-safe across installable + managed hooks | static contract | `rtk python3 -m unittest scripts/tests/test_rule_control_workflow.py` | ✅ extend existing | ✅ green |
| 84-01-04 | 01 | 1 | HOOK-AI-01 / HOOK-AI-02 / HOOK-AI-03 | real `git commit` blocker/pass paths emit expected protocol lines without `--no-verify` escapes | smoke | `rtk npm run hooks:smoke` | ✅ extend existing | ✅ green |

## Wave 0 Requirements

Existing hook payload tests, workflow tests, and smoke harness already covered the necessary surfaces; no new harness was needed.

## Manual-Only Verifications

All primary behaviors have automated coverage.

## Failure Scenario Coverage

- `staged-file-limit` blocks before tests or repo-local validation and returns structured `split_commit`
- `docs-guardrail` returns `rerun_docs_check` with trigger paths
- `source-file-headers` returns `edit_headers`
- `commit-format` / `commit-scope-message` return `rewrite_commit_message`
- valid commit path still emits allowed protocol and succeeds

## Validation Sign-Off

- [x] All tasks have automated verify coverage.
- [x] Real smoke commit flow covers both blocked and allowed paths.
- [x] Validation includes at least one failure path, not just success path.
- [x] No watch-mode flags in validation commands.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** verified 2026-05-12
