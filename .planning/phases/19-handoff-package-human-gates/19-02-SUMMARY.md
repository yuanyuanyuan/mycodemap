---
phase: 19-handoff-package-human-gates
plan: 02
subsystem: "handoff-traceability-and-gates"
tags: [handoff, approvals, assumptions, open-questions, gates]
requires:
  - phase: 19-01
    provides: canonical handoff schema and artifact path
provides:
  - `buildDesignHandoff()` canonical builder
  - approval / assumption / open-question provenance
  - `blocked-mapping` / `review-required` gate semantics
affects: [phase-19-03, verify-work, agent-handoff]
tech-stack:
  added: []
  patterns: [provenance-first, explicit-gates, failure-first-handoff]
key-files:
  created: []
  modified:
    - src/cli/design-handoff-builder.ts
    - src/cli/__tests__/design-handoff-builder.test.ts
    - tests/fixtures/design-contracts/handoff-pending-review.design.md
key-decisions:
  - "review-needed 与 blocker 分离：存在 unresolved item 时生成 artifact，但 `readyForExecution=false`"
  - "mapping blocker 时返回 `blocked-mapping`，不在失败 scope 上继续猜 handoff"
requirements-completed: [HOF-02, HOF-03]
completed: 2026-03-25
---

# Phase 19-02 Summary

**handoff 已不再只是模板，而是基于 design + mapping truth 生成的可追踪 canonical payload。**

## Accomplishments

- `buildDesignHandoff()` 现在同时消费 `loadDesignContract()` 与 `resolveDesignScope()`，生成同源 markdown/json truth
- `approvals`、`assumptions`、`openQuestions` 全部带 `sourceRefs`，并显式区分 `approved` / `needs-review`
- `review-required` 与 `blocked-mapping` 两类 gate 语义已落地，并由 success / review-needed / blocked 回归锁住

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/cli/__tests__/design-handoff-builder.test.ts`
- `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-pending-review.design.md --json`
- `node dist/cli/index.js design handoff tests/fixtures/design-contracts/no-match.design.md --json`

## Decisions & Deviations

- 关键决策：`readyForExecution=false` 不等于 crash path；CLI 失败只留给 blocker diagnostics
- 偏差：baseline fixture 采用空 `Open Questions` section 来预演 review-needed 风险，因此 success path 也可能进入 non-blocking review 状态
