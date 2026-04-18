---
phase: 20-design-drift-verification-docs-sync
plan: 01
subsystem: "verification-core-and-ready-fixture"
tags: [verification, schema, builder, drift, vitest]
requires: []
provides:
  - `DesignVerificationResult` / checklist / drift 正式类型
  - `buildDesignVerification()` conservative builder
  - `verify-ready.design.md` zero-unresolved ready-path baseline
affects: [phase-20-02, phase-20-03, design-verify-command]
tech-stack:
  added: []
  patterns: [conservative-evidence, reviewed-truth-first, fixture-first-regression]
key-files:
  created:
    - src/interface/types/design-verification.ts
    - src/cli/design-verification-builder.ts
    - src/cli/__tests__/design-verification-builder.test.ts
    - tests/fixtures/design-contracts/verify-ready.design.md
  modified:
    - src/interface/types/index.ts
key-decisions:
  - "Acceptance Criteria 直接映射为 checklist item；没有直接 evidence refs 就保持 needs-review"
  - "优先读取 reviewed handoff artifact；artifact 缺失时允许 fallback builder，但必须显式降级为 handoff-missing / review-needed"
requirements-completed: [VAL-04, VAL-05]
completed: 2026-03-26
---

# Phase 20-01 Summary

**Phase 20 的 verification core 已固定：正式 schema、conservative builder 与真正可 `readyForExecution=true` 的 baseline fixture 都已落地。**

## Accomplishments

- 新增 `design-verification` 正式类型，固定 `checklist`、`drift`、`diagnostics`、`readyForExecution` 的共享契约
- 新增 `buildDesignVerification()`，优先消费 reviewed handoff artifact，并在 artifact 缺失时显式降级为 `handoff-missing`
- 新增 `verify-ready.design.md` 与 focused regressions，锁住 ready / needs-review / blocked 三条最小路径

## Verification

- `rg -n "DesignVerificationResult|DesignVerificationChecklistItem|DesignDriftItem|DesignVerificationStatus" src/interface/types/design-verification.ts src/interface/types/index.ts`
- `rg -n "buildDesignVerification|handoff-missing|scope-extra|acceptance-unverified" src/cli/design-verification-builder.ts`
- `pnpm exec vitest run src/cli/__tests__/design-verification-builder.test.ts`

## Decisions & Deviations

- 关键决策：`readyForExecution=true` 只在 reviewed handoff artifact 已存在且 checklist 全部拿到直接证据时成立；fallback builder 只能给 `needs-review`
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动、验证证据与 summary
