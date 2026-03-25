---
phase: 17-design-contract-surface
plan: 01
subsystem: "design-contract"
tags: [design-contract, interface, cli-schema, docs-template]
provides:
  - design contract 的正式类型定义与 diagnostics 基线
  - 单一来源的默认路径、必填 sections 与 heading alias 规则
  - 可直接复制的 `mycodemap.design.md` canonical 模板
affects: [phase-17-02, phase-17-03, design-contract-surface]
tech-stack:
  added: []
  patterns: [interface-owned-contract, cli-owned-schema, template-as-canonical-source]
key-files:
  created:
    - src/interface/types/design-contract.ts
    - src/cli/design-contract-schema.ts
    - docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md
  modified:
    - src/interface/types/index.ts
key-decisions:
  - "设计输入以 Markdown sections 为人类编写面，机器稳定性由 validator 保证"
  - "类型语义放在 Interface Layer，路径与 alias 规则收口在 CLI schema helper"
duration: 15min
completed: 2026-03-25
---

# Phase 17: design-contract-surface Summary

**design contract 的类型、CLI schema 常量与可复制模板已完成收口，Phase 17 后续实现不再需要在漂移输入上猜需求。**

## Performance

- **Duration:** 15min
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- 新增 `DesignContract`、`NormalizedDesignContract` 与 diagnostics 相关正式类型，给后续 loader/validator 提供稳定语义基线
- 固定 `mycodemap.design.md` 默认路径、必填 sections 和常见 heading aliases，避免命令和测试各自硬编码
- 发布 `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`，把“目标/限制/验收/非目标”收敛成可复制模板

## Task Commits

1. **Task 1: 定义 design contract 正式类型与 section 标识** - `no-commit (developer override)`
2. **Task 2: 固定默认路径、required sections 与 alias schema** - `no-commit (developer override)`
3. **Task 3: 发布 canonical Markdown template** - `no-commit (developer override)`

## Files Created/Modified

- `src/interface/types/design-contract.ts` - 定义 design contract、diagnostics 和 normalized contract 正式类型
- `src/interface/types/index.ts` - 导出新的 design contract 类型，供后续 CLI/测试复用
- `src/cli/design-contract-schema.ts` - 固定默认路径、必填 sections、canonical heading 和 alias 归一化规则
- `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md` - 提供 `mycodemap.design.md` 的 canonical authoring template

## Decisions & Deviations

- 关键决策：先锁定 contract 事实源，再进入 loader / command 实现，避免 `17-02` 在不稳定输入上返工
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动与 summary

## Next Phase Readiness

`17-02` 已具备实现 loader / validator / `design validate` 的最低前置条件；后续只需消费现有类型与 schema helper，不必再重复定义路径或 section 语义。
