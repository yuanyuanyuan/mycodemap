---
phase: 39-publish-polling-and-reporting
plan: 01
subsystem: release-governance
tags: [release, publish-status, polling, reporting, docs]

requires:
  - src/cli/commands/ship/monitor.ts
  - docs/rules/release.md
  - .agents/skills/release/SKILL.md
provides:
  - standalone `publish-status` follow-up command
  - strict truth-first publish snapshot resolver
  - human summary + machine-readable JSON/structured output
  - completed `RELF-02`, `SAFE-01`, `SAFE-02`
affects:
  - src/cli/commands/publish-status.ts
  - src/cli/commands/ship/monitor.ts
  - src/cli/index.ts
  - docs/rules/release.md
  - .agents/skills/release/SKILL.md
  - docs/ai-guide/COMMANDS.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
  - .planning/PROJECT.md

tech-stack:
  added: []
  patterns:
    - read-only publish follow-up command
    - strict truth-first GitHub Actions snapshot
    - shared human + machine output contract

key-files:
  created:
    - src/cli/commands/publish-status.ts
    - src/cli/commands/__tests__/publish-status-command.test.ts
    - .planning/phases/39-publish-polling-and-reporting/39-VALIDATION.md
    - .planning/phases/39-publish-polling-and-reporting/39-VERIFICATION.md
    - .planning/phases/39-publish-polling-and-reporting/39-01-SUMMARY.md
  modified:
    - src/cli/commands/ship/monitor.ts
    - src/cli/commands/ship/__tests__/monitor.test.ts
    - src/cli/index.ts
    - docs/rules/release.md
    - .agents/skills/release/SKILL.md
    - docs/ai-guide/COMMANDS.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/PROJECT.md

key-decisions:
  - "publish-status 是独立 follow-up 命令，不塞回 `/release` 主流程"
  - "默认只做一次 snapshot，不隐式扩成长期 watch"
  - "terminal summary 与 machine-readable JSON 共用同一条 truth source"
  - "不能精确确认时返回 `ambiguous` / `unavailable`，不能猜最新 publish run"

requirements-completed:
  - RELF-02
  - SAFE-01
  - SAFE-02

duration: session
completed: 2026-04-23
---

# Phase 39 Plan 01 Summary

**Phase 39 已完成：仓库现在有一个独立、只读、strict truth-first 的 `publish-status` follow-up surface，用来复核 publish workflow snapshot truth，而不是把状态查询塞回 `/release`。**

## Accomplishments

- 新建 `src/cli/commands/publish-status.ts`，要求显式 `--tag` + `--sha`，默认输出终端摘要，并支持 `--json` / `--json --structured`。
- 扩展 `src/cli/commands/ship/monitor.ts`，新增共享的 `snapshotPublishStatus(...)`，支持 `pending / success / failure / ambiguous / unavailable`。
- 保留 `monitorCI(...)` 现有 watch 路径，但改为复用严格匹配 helper，而不是猜“最新一条 run”。
- 更新 `docs/rules/release.md`、`.agents/skills/release/SKILL.md` 与 `docs/ai-guide/COMMANDS.md`，把 `publish-status` 明确定位成 follow-up observability only。
- 将 milestone planning truth 从 `Phase 39` 推进到 `Phase 40 readiness gate evaluation`。

## Task Commits

未创建 git commit；继续遵守当前会话“不自动 commit / tag / push”的约束。

## Next Phase Readiness

- `Phase 40` 现在可以专注评估 release readiness 是否应该进入 CI / pre-release gate。
- `RELF-02` 已关闭，后续主要风险集中在 `warn-only / fallback` 与 hard gate 边界是否能被正确建模。
