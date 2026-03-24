---
phase: 02-cli-surface-cleanup-cli
plan: 03
subsystem: "docs-guardrail"
tags: [docs, ai-docs, guardrail, validation]
provides:
  - 入口文档与 AI 文档统一切换到新的 public CLI surface
  - validate-docs guardrail 改为拦截 removed commands 回流
  - docs-sync 相关测试与编译后入口完成一致性验证
affects: [phase-03, docs-guardrails, ai-docs]
tech-stack:
  added: []
  patterns: [removed-command-docs-baseline, guardrail-backed-cli-surface]
key-files:
  created: []
  modified:
    - README.md
    - AI_GUIDE.md
    - ARCHITECTURE.md
    - docs/ai-guide/README.md
    - docs/ai-guide/COMMANDS.md
    - docs/SETUP_GUIDE.md
    - docs/AI_ASSISTANT_SETUP.md
    - docs/ai-guide/QUICKSTART.md
    - docs/ai-guide/INTEGRATION.md
    - scripts/validate-docs.js
    - src/cli/__tests__/validate-docs-script.test.ts
key-decisions:
  - "文档不再把 server/watch/report/logs 写成当前公开命令，而是统一改成迁移说明"
  - "guardrail 直接对 README、AI docs、setup docs 的命令面漂移设阻断检查"
duration: 20min
completed: 2026-03-24
---

# Phase 2: cli-surface-cleanup-cli Summary

**README、AI 文档、setup 文档和 docs guardrail 现在都围绕同一套精简后的 public CLI surface 收口。**

## Performance

- **Duration:** 20min
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- README、AI_GUIDE、ARCHITECTURE、AI docs、SETUP 文档不再把 `server`、`watch`、`report`、`logs` 描述为当前公开命令
- `scripts/validate-docs.js` 改为守护新的命令面基线，并新增“AI 文档重新写回 removed command”失败模式测试
- `npm run docs:check`、`node dist/cli/index.js ci check-docs-sync` 与编译后 `--help` 对同一套命令清单达成一致

## Task Commits

1. **Task 1: 更新所有入口文档中的保留命令清单** - `no-commit (developer override)`
2. **Task 2: 更新 docs guardrail 基线** - `no-commit (developer override)`
3. **Task 3: 验证 docs-sync 与 public surface 全链路一致** - `no-commit (developer override)`

## Files Created/Modified

- `README.md` - 删除 removed commands 公开章节并新增迁移说明
- `AI_GUIDE.md` - 更新 `Server Layer` 与 removed command 的边界表述
- `ARCHITECTURE.md` - 同步当前 public surface 与查询流说明
- `docs/ai-guide/README.md` - 更新入口说明与 removed-command 边界
- `docs/ai-guide/COMMANDS.md` - 替换 removed commands 章节为迁移表
- `docs/SETUP_GUIDE.md` - 用迁移表替换 watch onboarding 片段
- `docs/AI_ASSISTANT_SETUP.md` - 增加仓库维护者对 removed-command 文档漂移的护栏提示
- `docs/ai-guide/QUICKSTART.md` - 修正 `Server Layer` 命名边界速查
- `docs/ai-guide/INTEGRATION.md` - 用 `generate` 取代过时的 watch 建议
- `scripts/validate-docs.js` - 新增 removed-command 文档基线校验
- `src/cli/__tests__/validate-docs-script.test.ts` - 增加 removed-command 回流失败测试与 fixture 覆盖

## Decisions & Deviations

- 关键决策：除了计划内入口文档，还同步修正了 `QUICKSTART` 与 `INTEGRATION` 中的活跃错误建议，避免“guardrail 过了但 AI 仍被误导”
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动与 summary

## Next Phase Readiness

CLI surface、文档与 guardrail 已统一，Phase 3 可以在稳定 public command baseline 上推进 `analyze` 契约重构。
