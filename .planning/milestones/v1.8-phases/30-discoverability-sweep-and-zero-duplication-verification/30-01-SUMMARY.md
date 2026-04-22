---
phase: 30-discoverability-sweep-and-zero-duplication-verification
plan: 01
subsystem: docs-governance
tags: [entry-docs, docs, routing, discoverability, verification]

requires:
  - .planning/phases/29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles/29-VERIFICATION.md
provides:
  - synchronized entry-doc role labels across live docs and machine-readable indexes
  - zero-duplication evidence for entry docs vs destination docs
  - final discoverability sweep for `v1.8`
affects: [README.md, AI_GUIDE.md, docs/rules/README.md, ARCHITECTURE.md, docs/ai-guide/INTEGRATION.md, ai-document-index.yaml, llms.txt, scripts/validate-docs.js]

tech-stack:
  added: []
  patterns:
    - navigation-only sync
    - machine-readable index terminology lock
    - docs-focused zero-duplication verification

key-files:
  created:
    - .planning/phases/30-discoverability-sweep-and-zero-duplication-verification/30-DISCUSSION-LOG.md
    - .planning/phases/30-discoverability-sweep-and-zero-duplication-verification/30-CONTEXT.md
    - .planning/phases/30-discoverability-sweep-and-zero-duplication-verification/30-01-PLAN.md
    - .planning/phases/30-discoverability-sweep-and-zero-duplication-verification/30-01-SUMMARY.md
  modified:
    - README.md
    - AI_GUIDE.md
    - docs/rules/README.md
    - ARCHITECTURE.md
    - docs/ai-guide/INTEGRATION.md
    - ai-document-index.yaml
    - llms.txt
    - scripts/validate-docs.js

key-decisions:
  - "只同步 live docs / machine-readable indexes / guardrail comments，不追改 archive 或 brainstorm 历史文档"
  - "将 `CLAUDE.md` 的统一称呼锁为入口路由，而不是执行手册"
  - "在 `docs/rules/README.md` 补一条入口角色约束，但不把规则正文复制进去"

patterns-established:
  - "导航文档只回答去哪读/去哪改，不维护第二套规则正文"
  - "AI index 与 live docs 必须使用同一套入口角色术语"

requirements-completed:
  - ROUTE-01
  - ROUTE-02
  - ROUTE-03

duration: 25min
completed: 2026-04-22
---

# Phase 30 Plan 01 Summary

**v1.8 discoverability sweep 已完成；live docs、索引与 guardrail comments 已统一到 `CLAUDE.md = 入口路由` 的新 truth。**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-22T07:24:35Z
- **Completed:** 2026-04-22T07:24:35Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- 更新 `README.md`、`AI_GUIDE.md`、`ARCHITECTURE.md`、`docs/ai-guide/INTEGRATION.md`，把 `CLAUDE.md` 从“执行手册”改成“入口路由 / 下一步阅读导航”。
- 更新 `ai-document-index.yaml` 与 `llms.txt`，确保机器可读索引与 live docs 的入口角色称呼一致。
- 在 `docs/rules/README.md` 增加最小入口角色约束，明确 `AGENTS.md` 定权、根 `CLAUDE.md` 路由、规则正文留在 `docs/rules/*`。
- 同步 `scripts/validate-docs.js` 中的旧称呼注释，避免后续检索把 `CLAUDE.md` 拉回“执行手册”语义。

## Task Commits

未创建 git commit；遵守当前会话中的显式约束：除非用户单独要求，否则不执行 `git commit`。

## Decisions Made

- 不修改 archive / brainstorm / completed 历史文档，因为它们记录历史上下文，不是 live discoverability truth。
- `docs/rules/README.md` 只补 1 条导航说明，不复制任何执行规则正文。
- `scripts/validate-docs.js` 的 comment 虽非用户文档，但会影响 repo truth 检索，因此同步术语。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- `v1.8` 所有 phases 已完成，可进入 milestone audit → complete → cleanup lifecycle。
- 非阻断观察：`gsd-sdk query init.milestone-op` 当前曾返回 `phase_count: 1` / `completed_phases: 1`，与 `roadmap.analyze` 的 `3` phases 不一致；建议作为 GSD infra follow-up 记录，不阻断本 milestone。
