---
phase: 01-positioning-baseline
plan: 01
subsystem: "docs-entry"
tags: [docs, positioning, ai-first, ai-guide]
provides:
  - 统一 README、AI_GUIDE 与 docs/ai-guide/README 的 AI-first 定位文案
  - 明确 AI/Agent 是主要消费者、人类开发者是配置与维护角色
  - 将过渡能力从首屏核心卖点降级为边界说明
affects: [phase-02, positioning-baseline, ai-docs]
tech-stack:
  added: []
  patterns: [entry-first repositioning, docs-first baseline]
key-files:
  created: []
  modified:
    - README.md
    - AI_GUIDE.md
    - docs/ai-guide/README.md
key-decisions:
  - "入口层统一使用 AI-first 代码地图工具表述"
  - "保留过渡能力事实，但不再把 workflow/server/ship 等当作首屏卖点"
duration: 25min
completed: 2026-03-24
---

# Phase 1: positioning-baseline Summary

**入口文档已统一切换到 AI-first 代码地图工具叙事，并把过渡能力从首屏核心价值中降级。**

## Performance

- **Duration:** 25min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- README 首屏改为 AI-first 代码地图工具叙事，并新增产品定位表说明主要消费者、输出契约和命名边界
- AI_GUIDE 与 docs/ai-guide/README 使用同一套定位词汇，去掉了把 `ship` 当成首屏推荐命令的入口叙事

## Task Commits

1. **Task 1: 重写 README 的产品定位与 AI 文档入口** - `no-commit (developer override)`
2. **Task 2: 同步 AI 入口文档的定位词汇与推荐入口** - `no-commit (developer override)`

## Files Created/Modified

- `README.md` - 重写首屏定位、特性排序、产品定位表和过渡能力说明
- `AI_GUIDE.md` - 重排 AI 入口速查表与产品定位速查
- `docs/ai-guide/README.md` - 明确 AI-first 入口原则与文档使用顺序

## Decisions & Deviations

- 关键决策：入口层只做定位与导航，不把命令删除、四意图重构或 workflow 简化伪装成已经实现的事实
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动与 summary

## Next Phase Readiness

详细 AI 文档、架构边界和 docs guardrail 已有稳定入口词汇，可继续执行 `01-02` 的契约与护栏同步。
