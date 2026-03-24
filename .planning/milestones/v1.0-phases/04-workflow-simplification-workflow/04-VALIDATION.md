---
phase: 04
slug: workflow-simplification-workflow
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 04 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `pnpm exec vitest run src/orchestrator/workflow/__tests__/types.test.ts src/orchestrator/workflow/__tests__/phase-checkpoint.test.ts src/orchestrator/workflow/__tests__/workflow-persistence.test.ts src/orchestrator/workflow/__tests__/workflow-context.test.ts src/orchestrator/workflow/__tests__/workflow-orchestrator.test.ts src/orchestrator/workflow/__tests__/config.test.ts` |
| **CLI spot checks** | `node dist/cli/index.js workflow --help`、`node dist/cli/index.js workflow status`、`node dist/cli/index.js workflow visualize`、`node dist/cli/index.js workflow template apply bugfix` |
| **Full build check** | `npm run build` |

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 04-01-01 | 01 | FLOW-01, FLOW-02 | unit | `pnpm exec vitest run src/orchestrator/workflow/__tests__/workflow-context.test.ts src/orchestrator/workflow/__tests__/workflow-orchestrator.test.ts src/orchestrator/workflow/__tests__/config.test.ts` | ✅ green |
| 04-01-02 | 01 | FLOW-01, FLOW-02 | CLI | `node dist/cli/index.js workflow --help` | ✅ green |
| 04-01-03 | 01 | FLOW-01, FLOW-02 | CLI | `node dist/cli/index.js workflow status && node dist/cli/index.js workflow visualize` | ✅ green |
| 04-02-01 | 02 | FLOW-01, FLOW-02 | unit | `pnpm exec vitest run src/orchestrator/workflow/__tests__/types.test.ts src/orchestrator/workflow/__tests__/phase-checkpoint.test.ts src/orchestrator/workflow/__tests__/workflow-persistence.test.ts` | ✅ green |
| 04-02-02 | 02 | FLOW-01, FLOW-02 | CLI/docs | `node dist/cli/index.js workflow template apply bugfix` | ✅ green |

## Failure Rehearsal

1. **README 再次写回 implementation/commit/ci 阶段**
   - Failure mode: 用户会把 workflow 误解成“执行代码 + 跑 CI”的混合工作流。
   - Detection: Phase 4 文档 spot-check 与后续 Phase 6 docs guardrail 应直接暴露漂移。

2. **测试继续使用旧阶段名**
   - Failure mode: workflow 主代码虽是四阶段，但测试样例继续扩散 legacy 6 阶段语义。
   - Detection: 本阶段已把 `types` / `phase-checkpoint` / `workflow-persistence` 的示例统一切到四阶段。

## Validation Sign-Off

- [x] All tasks have automated verification
- [x] Includes at least one failure rehearsal
- [x] No watch-mode commands
- [x] `nyquist_compliant: true`

**Approval:** passed
