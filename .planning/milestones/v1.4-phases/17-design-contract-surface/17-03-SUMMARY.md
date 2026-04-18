---
phase: 17-design-contract-surface
plan: 03
subsystem: "docs-guardrail"
tags: [design-contract, docs, guardrail, workflow-drift, ai-docs]
requires:
  - phase: 17-01
    provides: design contract 类型、schema 与 canonical 模板
  - phase: 17-02
    provides: design validate 命令、loader、fixtures
provides:
  - README / AI docs / rules 对 `design validate` 的正式入口说明
  - workflow 四阶段 truth 与 PATTERNS 文档对齐
  - docs guardrail 对 design surface 与 workflow drift 的自动阻断
affects: [phase-18, docs-guardrails, design-contract-surface]
tech-stack:
  added: []
  patterns: [docs-guardrail-backed-command-launch, design-first-docs-entry]
key-files:
  created:
    - .planning/phases/17-design-contract-surface/17-03-SUMMARY.md
  modified:
    - README.md
    - AI_GUIDE.md
    - CLAUDE.md
    - docs/ai-guide/COMMANDS.md
    - docs/ai-guide/OUTPUT.md
    - docs/ai-guide/PATTERNS.md
    - docs/ai-guide/PROMPTS.md
    - docs/rules/engineering-with-codex-openai.md
    - docs/product-specs/README.md
    - scripts/validate-docs.js
    - src/cli/__tests__/validate-docs-script.test.ts
key-decisions:
  - "把 design validate 文档化为正式输入面，而不是继续挂在 analyze/workflow 旁注里"
  - "workflow docs drift 必须与 design surface 同批修复并进入 guardrail"
requirements-completed: [DES-03]
duration: 25min
completed: 2026-03-25
---

# Phase 17: design-contract-surface Summary

**README、AI 文档、PATTERNS 与 docs guardrail 已围绕 `design validate` 和 workflow 四阶段真相完成同步收口。**

## Performance

- **Duration:** 25min
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- README / AI_GUIDE / COMMANDS / OUTPUT / PROMPTS 已能明确发现 `mycodemap design validate mycodemap.design.md --json`
- `docs/ai-guide/PATTERNS.md` 不再错误宣称 workflow 有 `commit` / `ci` 阶段，并把 design-first 协作入口写清
- `scripts/validate-docs.js` 与 fixture tests 已能自动阻断 design docs drift 和 workflow stage drift

## Task Commits

1. **Task 1: 同步入口文档与 AI 文档** - `no-commit (developer override)`
2. **Task 2: 扩展 docs guardrail 校验 design surface 与 workflow drift** - `no-commit (developer override)`
3. **Task 3: 固定 CLI docs sync 入口与最小回归** - `no-commit (developer override)`

## Files Created/Modified

- `README.md` - 增加 design contract 输入面说明与 `design validate` 示例
- `AI_GUIDE.md` - 增加 design validate 速用入口与类型定义速查
- `CLAUDE.md` - 把 `design validate` 加入检索/执行手册
- `docs/ai-guide/COMMANDS.md` - 新增 `design` 命令章节
- `docs/ai-guide/OUTPUT.md` - 新增 design validate 的 JSON 契约
- `docs/ai-guide/PATTERNS.md` - 修正 workflow 仍为四阶段，并加入 design-first 前置步骤
- `docs/ai-guide/PROMPTS.md` - 将“新功能实现”模板改为先校验 design contract
- `docs/rules/engineering-with-codex-openai.md` - 增加 design command 的验证要求
- `docs/product-specs/README.md` - 将 `DESIGN_CONTRACT_TEMPLATE.md` 纳入当前有效输入契约索引
- `scripts/validate-docs.js` - 增加 design surface 与 workflow drift 的高信号校验
- `src/cli/__tests__/validate-docs-script.test.ts` - 增加 design docs drift / PATTERNS drift fixture tests

## Decisions & Deviations

- 关键决策：不新增第二套 guardrail 入口，继续复用 `npm run docs:check` 与 `ci check-docs-sync`
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文档变更、校验证据与 summary

## Next Phase Readiness

Phase 17 的三个计划都已执行完毕；Phase 18 可以直接消费 `mycodemap.design.md`、`design validate` diagnostics 和已同步的文档 truth，开始 design-to-code mapping。
