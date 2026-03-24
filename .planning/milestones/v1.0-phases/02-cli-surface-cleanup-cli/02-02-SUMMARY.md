---
phase: 02-cli-surface-cleanup-cli
plan: 02
subsystem: "cli-compat"
tags: [cli, compatibility, deprecation, migration]
provides:
  - 为 server/watch/report/logs 提供统一的 removed-command 提示映射
  - 在 CLI parse 前拦截 removed commands 并返回非零退出码
  - 为四个 removed commands 增加自动化测试
affects: [phase-02-03, removed-commands, cli-ux]
tech-stack:
  added: []
  patterns: [pre-parse-removed-command-intercept, explicit-migration-guidance]
key-files:
  created:
    - src/cli/removed-commands.ts
    - src/cli/__tests__/removed-commands.test.ts
  modified:
    - src/cli/index.ts
key-decisions:
  - "removed commands 采用显式失败 + 指路说明，而不是 generic unknown command"
  - "拦截逻辑放在 parse 前，避免旧命令触发额外副作用"
duration: 15min
completed: 2026-03-24
---

# Phase 2: cli-surface-cleanup-cli Summary

**被移除的四个顶层命令现在会统一给出迁移提示，不再退化成无上下文的 unknown command。**

## Performance

- **Duration:** 15min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- 新增 `src/cli/removed-commands.ts`，统一维护 `server`、`watch`、`report`、`logs` 的迁移提示
- `src/cli/index.ts` 在 Commander parse 前拦截 removed commands，并以非零退出码退出
- `src/cli/__tests__/removed-commands.test.ts` 覆盖四个入口的命令特定提示与退出码行为

## Task Commits

1. **Task 1: 定义 removed-command 提示映射** - `no-commit (developer override)`
2. **Task 2: 在 CLI 入口接管 removed-command 调用** - `no-commit (developer override)`
3. **Task 3: 为 removed-command 行为补自动化测试** - `no-commit (developer override)`

## Files Created/Modified

- `src/cli/removed-commands.ts` - 定义 removed-command 映射与迁移文案
- `src/cli/index.ts` - 在 parse 前拦截 removed commands 并输出统一错误提示
- `src/cli/__tests__/removed-commands.test.ts` - 验证四个 removed commands 的非零退出码与迁移提示

## Decisions & Deviations

- 关键决策：`server` 只保留 `Server Layer` 命名边界说明，不重新暴露 HTTP API 入口
- 偏差：测试中先误抓 `stderr.write`，后修正为拦截 `console.error`；属于测试夹具修正，不影响产品行为

## Next Phase Readiness

removed-command UX 已稳定，可以继续同步 README、AI 文档、guardrail 脚本和 docs-sync 测试。
