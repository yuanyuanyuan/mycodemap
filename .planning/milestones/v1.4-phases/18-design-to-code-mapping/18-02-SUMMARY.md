---
phase: 18-design-to-code-mapping
plan: 02
subsystem: "design-map-enrichment"
tags: [design-map, enrichment, risk, confidence, test-impact]
requires:
  - phase: 18-01
    provides: mapping contract、resolver baseline、design map command
provides:
  - `dependencies` / `testImpact` / `risk` / `confidence` / `unknowns` enrichment
  - human/json 双输出围绕同一份 mapping truth
  - 快路径 enrichment，避免对 stale code map 盲跑高成本 analyze
affects: [phase-18-03, design-map-output-contract]
tech-stack:
  added: []
  patterns: [local-fast-path, optional-analyze-enrichment, explicit-unknowns]
key-files:
  created: []
  modified:
    - src/cli/design-scope-resolver.ts
    - src/cli/__tests__/design-scope-resolver.test.ts
    - src/cli/commands/__tests__/design-map-command.test.ts
    - src/cli/commands/design.ts
key-decisions:
  - "优先使用本地 import/test 快路径，再在 indexed candidate 上选择性调用 analyze read/link"
  - "`unknowns` 成为正式字段，而不是留给 reviewer 自己猜"
requirements-completed: [MAP-02]
completed: 2026-03-25
---

# Phase 18-02 Summary

**mapping 输出现在不只给候选范围，还会显式给出依赖、测试影响、风险、置信度与未知项。**

## Accomplishments

- 为每个 candidate 补齐 `dependencies`、`testImpact`、`risk`、`confidence`、`unknowns`
- 新增源码快照与本地依赖/测试快路径，避免 stale code map 下的慢路径反复失败
- human renderer 与 JSON renderer 都围绕同一份 `DesignMappingResult` 输出，不再分叉

## Verification

- `npm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts`
- `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json`

## Decisions & Deviations

- 关键决策：保留 `intent: 'read'` / `intent: 'link'` seam，但只在 indexed candidate 上选择性启用
- 偏差：`test impact` 先以本地文件名快匹配 + test-linker fallback 组合落地，避免把单一 `testFile` 硬抄成完整结论
