---
phase: 05
slug: ci-ship-alignment-ci-ship
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 05 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `pnpm exec vitest run src/cli/commands/__tests__/ci-docs-sync.test.ts src/cli/commands/__tests__/ci-gate-checks.test.ts src/cli/commands/ship/__tests__/quality-rules.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts` |
| **Build check** | `npm run build` |
| **CLI spot checks** | `node dist/cli/index.js ci --help`、`node dist/cli/index.js ci check-branch --allow <current-branch>`、`node dist/cli/index.js ci check-branch --allow release-only`、`node dist/cli/index.js ci check-working-tree`、`SHIP_IN_CI=1 node dist/cli/index.js ci check-scripts` |
| **Docs check** | `npm run docs:check`、`node dist/cli/index.js ci check-docs-sync` |

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 05-01-01 | 01 | CI-01, CI-02, CI-03 | unit | `pnpm exec vitest run src/cli/commands/__tests__/ci-gate-checks.test.ts` | ✅ green |
| 05-01-02 | 01 | CI-01, CI-02, CI-03 | CLI | `node dist/cli/index.js ci --help` | ✅ green |
| 05-01-03 | 01 | CI-01, CI-02, CI-03 | CLI | `node dist/cli/index.js ci check-branch --allow <current-branch>` | ✅ green |
| 05-01-04 | 01 | CI-01, CI-02, CI-03 | failure rehearsal | `node dist/cli/index.js ci check-branch --allow release-only` + `node dist/cli/index.js ci check-working-tree` | ✅ green |
| 05-02-01 | 02 | SHIP-01 | unit | `pnpm exec vitest run src/cli/commands/ship/__tests__/quality-rules.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts` | ✅ green |
| 05-02-02 | 02 | SHIP-01 | docs | `npm run docs:check && node dist/cli/index.js ci check-docs-sync` | ✅ green |

## Failure Rehearsal

1. **错误分支执行发布前检查**
   - Rehearsal: `node dist/cli/index.js ci check-branch --allow release-only`
   - Expected failure: 返回 `E0014`，并显示允许的分支列表。

2. **工作区存在未提交变更**
   - Rehearsal: `node dist/cli/index.js ci check-working-tree`
   - Expected failure: 返回 `E0013` 并打印当前 dirty working tree。

## Validation Sign-Off

- [x] All tasks have automated verification
- [x] Includes at least one real failure rehearsal
- [x] No watch-mode commands
- [x] `nyquist_compliant: true`

**Approval:** passed
