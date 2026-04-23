---
phase: 34-release-authority-gap-closure
plan: 01
subsystem: release-governance
tags: [release, docs, validation, authority, closeout]

requires:
  - .planning/v1.9-MILESTONE-AUDIT.md
  - .planning/phases/33-release-validation-and-dry-run-readiness/33-VERIFICATION.md
provides:
  - a single recommended `/release` entry across rules + checklist
  - refreshed `VAL-01` proof that explicitly detects authority drift
  - restored `v1.9` closeout-ready planning state
affects:
  - docs/rules/pre-release-checklist.md
  - docs/rules/release.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
  - .planning/PROJECT.md

tech-stack:
  added: []
  patterns:
    - single-entry release governance
    - audit-driven authority drift repair
    - verification that checks for regressions in documentation routing

key-files:
  created:
    - .planning/phases/34-release-authority-gap-closure/34-CONTEXT.md
    - .planning/phases/34-release-authority-gap-closure/34-01-PLAN.md
    - .planning/phases/34-release-authority-gap-closure/34-VALIDATION.md
    - .planning/phases/34-release-authority-gap-closure/34-VERIFICATION.md
    - .planning/phases/34-release-authority-gap-closure/34-01-SUMMARY.md
  modified:
    - docs/rules/pre-release-checklist.md
    - docs/rules/release.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/PROJECT.md

key-decisions:
  - "继续保持 `/release vX.Y` 为唯一推荐入口；manual exception 只能在等价 closeout + 双确认之后存在"
  - "将 `$gsd-complete-milestone` 命令写法对齐到 release rules，避免 GSD surface 自己出现第二套入口"
  - "把 authority drift 本身写进 verification rehearsal，避免 `VAL-01` 再次只证明命令通过、不证明规则一致"

patterns-established:
  - "milestone audit 发现的文档 authority drift 必须在后续 verification 中成为显式回归检测项"

requirements-completed:
  - REL-01
  - DOC-02
  - VAL-01

duration: session
completed: 2026-04-22
---

# Phase 34 Plan 01 Summary

**`v1.9` 的 release authority drift 已关闭：`pre-release-checklist.md` 不再推荐绕过 `/release` 直跑 helper，closeout-ready 规划状态也已恢复。**

## Performance

- **Duration:** session
- **Started:** 2026-04-22T23:16:35+08:00
- **Completed:** 2026-04-22T23:16:35+08:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- 清理了 `docs/rules/pre-release-checklist.md` 中的 helper-first 竞争入口，把 `/release vX.Y` 恢复为唯一推荐发布入口。
- 将 `docs/rules/release.md` 的 closeout 命令示例统一为 `$gsd-complete-milestone v{X.Y}`，避免 release governance surface 自己出现命令漂移。
- 新增 `34-VALIDATION.md` 与 `34-VERIFICATION.md`，把 authority drift 变成显式回归检测项，而不再只依赖“命令通过”的弱证明。
- 将 `.planning/ROADMAP.md`、`.planning/REQUIREMENTS.md`、`.planning/STATE.md`、`.planning/PROJECT.md` 恢复到 `Phase 34` complete / `v1.9` ready for closeout 状态。

## Task Commits

未创建 git commit；当前继续遵守“先落地 phase 工件和验证，再由用户决定是否提交 / closeout”的会话约束。

## Decisions Made

- `REL-01` / `DOC-02` / `VAL-01` 的修复范围只锁定 audit 识别出的 authority drift，不顺手扩展到真实 publish dogfood。
- 手动例外流仍可存在，但只能描述为与 `/release` 等价的受控补救路径，不能重新成为推荐主入口。
- Phase 34 的 verification 必须显式检查 helper-first drift 是否回归，避免之后的 milestone audit 再次发现同类遗漏。

## Deviations from Plan

None.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- `v1.9` 所有 phases 已再次完成，可立即重跑 milestone audit；若 audit 通过或只剩 tech debt，再决定是否进入 milestone closeout。
