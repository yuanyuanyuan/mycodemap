---
phase: 02-cli-surface-cleanup-cli
plan: 01
subsystem: "cli-surface"
tags: [cli, commander, help, tree-sitter]
provides:
  - 移除主 CLI 对 server/watch/report/logs 的顶层注册
  - 顶层 help 输出与实际 public surface 保持一致
  - 为 help surface 增加专门回归测试
affects: [phase-02-02, phase-02-03, cli-surface]
tech-stack:
  added: []
  patterns: [help-surface-regression-test, public-command-surface-tightening]
key-files:
  created:
    - src/cli/__tests__/index-help.test.ts
  modified:
    - src/cli/index.ts
    - src/cli/tree-sitter-check.ts
key-decisions:
  - "先收紧 Commander 注册和 help 输出，再处理 removed-command 兼容提示"
  - "help 回归测试直接验证 source 入口，而不是依赖手工 eyeballing"
duration: 15min
completed: 2026-03-24
---

# Phase 2: cli-surface-cleanup-cli Summary

**主 CLI 已移除四个越界命令的公开注册，并新增 help surface 回归测试锁住新边界。**

## Performance

- **Duration:** 15min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `src/cli/index.ts` 不再把 `server`、`watch`、`report`、`logs` 注册为当前 public CLI 顶层命令
- `src/cli/tree-sitter-check.ts` 不再把 `watch` 当成当前 public command 的正常 tree-sitter 入口
- `src/cli/__tests__/index-help.test.ts` 新增顶层 help 回归测试，锁定保留命令与移除命令边界

## Task Commits

1. **Task 1: 移除主 CLI 的四个公共命令注册** - `no-commit (developer override)`
2. **Task 2: 清理与 removed commands 相关的顶层命令辅助列表** - `no-commit (developer override)`
3. **Task 3: 新增顶层 help surface 回归测试** - `no-commit (developer override)`

## Files Created/Modified

- `src/cli/index.ts` - 收紧公共命令注册表，仅保留当前 public surface
- `src/cli/tree-sitter-check.ts` - 去掉 `watch` 的 public command tree-sitter 依赖
- `src/cli/__tests__/index-help.test.ts` - 验证 help 输出不再暴露四个已移除命令

## Decisions & Deviations

- 关键决策：不顺手删除 `src/server/`、`src/cli-new/` 或 `workflow/ship`，严格聚焦主 CLI surface
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动与 summary

## Next Phase Readiness

主 CLI surface 已有稳定事实源，`02-02` 可以基于此接管 removed-command 的显式迁移提示。
