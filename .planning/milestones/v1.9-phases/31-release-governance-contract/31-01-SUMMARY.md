---
phase: 31-release-governance-contract
plan: 01
subsystem: release-governance
tags: [release, docs, governance, routing, safety]

requires: []
provides:
  - authoritative `/release` workflow in `docs/rules/release.md`
  - milestone-bound release semantics in deployment and pre-release rules
  - routing-only release pointers in `AGENTS.md`, `CLAUDE.md`, and `docs/rules/README.md`
affects: [docs/rules/release.md, docs/rules/deployment.md, docs/rules/pre-release-checklist.md, docs/rules/README.md, AGENTS.md, CLAUDE.md]

tech-stack:
  added: []
  patterns:
    - single-source release governance
    - thin orchestrator documentation
    - routing-only entry-doc updates

key-files:
  created:
    - .planning/phases/31-release-governance-contract/31-CONTEXT.md
    - .planning/phases/31-release-governance-contract/31-01-PLAN.md
    - .planning/phases/31-release-governance-contract/31-01-SUMMARY.md
  modified:
    - docs/rules/release.md
    - docs/rules/deployment.md
    - docs/rules/pre-release-checklist.md
    - docs/rules/README.md
    - AGENTS.md
    - CLAUDE.md

key-decisions:
  - "将 `docs/rules/release.md` 固定为 `/release` 的单一权威文档，不在 entry docs 复制流程正文"
  - "将 milestone `vX.Y → X.Y.0` 作为正式规则写入 rules 层，并高亮 `0.5.2-beta.1 → 1.9.0` 的 major jump"
  - "将 `/release` 明确为 thin orchestrator：closeout 复用 GSD、机械发布复用 `scripts/release.sh`、远程发布复用 `.github/workflows/publish.yml`"

patterns-established:
  - "发布治理正文只在 `docs/rules/release.md` 维护"
  - "AGENTS / CLAUDE 只负责 L3 边界与路由，不承载第二套 release 手册"

requirements-completed:
  - REL-01
  - REL-02
  - DOC-01
  - DOC-02
  - DOC-03

duration: session
completed: 2026-04-22
---

# Phase 31 Plan 01 Summary

**`/release` 的文档契约已落地：rules 层现在能解释 milestone closeout、版本映射、双确认门与机械发布委托边界。**

## Performance

- **Duration:** session
- **Started:** 2026-04-22T17:29:30+08:00
- **Completed:** 2026-04-22T17:29:30+08:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- 将 `docs/rules/release.md` 固定为 `/release` 单一权威工作流，写清 `vX.Y → X.Y.0`、`v1.9 → 1.9.0`、`0.5.2-beta.1 → 1.9.0`、双确认门、失败处理与禁止事项。
- 将 `docs/rules/deployment.md` 与 `docs/rules/pre-release-checklist.md` 同步成 milestone-bound release 语义，不再把 npm 发布视为孤立的包操作。
- 在 `docs/rules/README.md`、`AGENTS.md`、`CLAUDE.md` 增加最小路由，让维护者能定位 release 权威文档，同时保持 entry docs 只做边界和导航。
- 收紧 `docs/rules/release.md` 的机械发布描述：`/release` 默认委托 `scripts/release.sh`，而不是在工作流文档里重写 helper 逻辑。

## Task Commits

未创建 git commit；当前继续沿用“先完成 phase 工件和验证，再由用户决定是否提交”的会话约束。

## Decisions Made

- `docs/rules/release.md` 作为唯一 release workflow truth，任何新增规则都应继续回写到这里。
- `scripts/release.sh` 只是 Gate #2 之后的 mechanical helper，不能替代 `/release` 的安全门。
- `pre-release-checklist.md` 的“发布前准备”改为优先使用 `/release vX.Y`，避免 rules 内部自相矛盾。

## Deviations from Plan

None - plan executed as written, and a small consistency fix was applied to keep `pre-release-checklist.md` aligned with the new unified `/release` entry.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- `Phase 32` 可以直接开始：实现 `.claude/skills/release/SKILL.md` 作为 thin safety orchestrator。
- 当前无需新增 research；事实来源已经收敛在 rules、planning state、`package.json`、`scripts/release.sh` 与 `.github/workflows/publish.yml`。
