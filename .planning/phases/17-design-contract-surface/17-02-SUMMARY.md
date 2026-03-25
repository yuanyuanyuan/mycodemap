---
phase: 17-design-contract-surface
plan: 02
subsystem: "design-cli"
tags: [design-contract, cli, validation, diagnostics, vitest]
requires:
  - phase: 17-01
    provides: design contract 类型、schema 常量与 canonical 模板
provides:
  - `design validate` 的正式 CLI 入口
  - design contract loader / validator / diagnostics baseline
  - 顶层 help、fixtures 与 focused regression tests
affects: [phase-17-03, design-contract-surface, docs-guardrails]
tech-stack:
  added: []
  patterns: [markdown-section-validation, json-first-diagnostics, dedicated-design-command]
key-files:
  created:
    - src/cli/design-contract-loader.ts
    - src/cli/commands/design.ts
    - src/cli/__tests__/design-contract-loader.test.ts
    - src/cli/commands/__tests__/design-command.test.ts
    - tests/fixtures/design-contracts/valid-basic.design.md
    - tests/fixtures/design-contracts/missing-acceptance.design.md
  modified:
    - src/cli/index.ts
    - src/cli/__tests__/index-help.test.ts
key-decisions:
  - "保持独立 `design` 命令，不把新语义塞进 analyze/workflow"
  - "JSON 模式直接输出纯结构化 payload，失败用 exit code 表达"
requirements-completed: [DES-02]
duration: 25min
completed: 2026-03-25
---

# Phase 17: design-contract-surface Summary

**`design validate` 已成为正式 CLI 入口，并能对 Markdown design contract 返回稳定的结构化 diagnostics。**

## Performance

- **Duration:** 25min
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- 新增 CLI-owned `design-contract-loader`，支持默认路径、section 解析、缺失/重复/空/未知 section 诊断
- 新增 `mycodemap design validate [file] --json`，失败路径输出机器可读 JSON 且返回非零 exit code
- 顶层 `--help` 已能发现 `design` 命令，并通过 focused Vitest + `dist` smoke test 验证

## Task Commits

1. **Task 1: 实现 design contract loader / validator / diagnostics** - `no-commit (developer override)`
2. **Task 2: 暴露 design validate 命令并支持机器输出** - `no-commit (developer override)`
3. **Task 3: 注册顶层命令并补 CLI help 回归** - `no-commit (developer override)`

## Files Created/Modified

- `src/cli/design-contract-loader.ts` - 提供 design contract 的默认路径发现、Markdown 解析与 diagnostics 组装
- `src/cli/commands/design.ts` - 暴露 `design validate` 子命令与 human/json 输出
- `src/cli/index.ts` - 注册顶层 `design` 命令
- `src/cli/__tests__/design-contract-loader.test.ts` - 覆盖成功、缺失、重复、空、未知 section 等失败模式
- `src/cli/commands/__tests__/design-command.test.ts` - 覆盖 JSON 输出、exit code 与 help surface
- `src/cli/__tests__/index-help.test.ts` - 锁定顶层 help 已包含 `design`
- `tests/fixtures/design-contracts/valid-basic.design.md` - 成功路径 fixture
- `tests/fixtures/design-contracts/missing-acceptance.design.md` - 缺失必填 section 的失败 fixture

## Decisions & Deviations

- 关键决策：`--json` 直接成为机器消费主路径，不额外引入 `--structured` 以扩大 v1 surface
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动、测试证据与 summary

## Next Phase Readiness

`17-03` 已可直接消费新的 `design` 命令与 fixtures，把 README / AI docs / PATTERNS / docs guardrail 一次对齐并锁住 workflow drift。
