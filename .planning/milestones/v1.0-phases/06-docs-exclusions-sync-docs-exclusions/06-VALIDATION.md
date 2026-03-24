---
phase: 06
slug: docs-exclusions-sync-docs-exclusions
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 06 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `pnpm exec vitest run src/orchestrator/__tests__/file-header-scanner.test.ts src/cli/commands/__tests__/ci-gate-checks.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` |
| **Workflow/ship regression** | `pnpm exec vitest run src/orchestrator/workflow/__tests__ src/cli/commands/ship/__tests__/quality-rules.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts` |
| **Docs/CLI checks** | `npm run docs:check`、`node dist/cli/index.js ci check-docs-sync` |
| **Full build check** | `npm run build` |
| **Lint spot-check** | `npm run lint` |

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 06-01-01 | 01 | FILE-01 | unit | `pnpm exec vitest run src/orchestrator/__tests__/file-header-scanner.test.ts src/cli/commands/__tests__/ci-gate-checks.test.ts` | ✅ green |
| 06-01-02 | 01 | FILE-01 | build | `npm run typecheck && npm run build` | ✅ green |
| 06-02-01 | 02 | DOC-01 | docs | `npm run docs:check` | ✅ green |
| 06-02-02 | 02 | DOC-01 | CLI | `node dist/cli/index.js ci check-docs-sync` | ✅ green |
| 06-03-01 | 03 | DOC-02 | unit | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` | ✅ green |
| 06-03-02 | 03 | DOC-02 | regression | `pnpm exec vitest run src/orchestrator/workflow/__tests__ src/cli/commands/ship/__tests__/quality-rules.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts` | ✅ green |

## Failure Rehearsal

1. **默认排除模式回退成 `*.test.ts`**
   - Failure mode: 嵌套测试文件重新进入 analyzer / header scanner 的扫描集合。
   - Detection: `validate-docs-script.test.ts` 与共享发现测试会直接失败。

2. **workflow 文档重新写回非分析阶段**
   - Failure mode: 用户再次把 workflow 理解成“实现 + CI”的混合流程。
   - Detection: `scripts/validate-docs.js` 对 README / COMMANDS 的新 guardrail 会直接失败。

3. **分支通配符只写进文档，CLI 仍做精确匹配**
   - Failure mode: `release/*` 示例在真实 CLI 中失败。
   - Detection: `ci-gate-checks.test.ts` 的 wildcard / CI env fallback 用例失败。

## Validation Sign-Off

- [x] All tasks have automated verification
- [x] Includes at least one failure rehearsal
- [x] No watch-mode commands
- [x] `nyquist_compliant: true`

**Approval:** passed
