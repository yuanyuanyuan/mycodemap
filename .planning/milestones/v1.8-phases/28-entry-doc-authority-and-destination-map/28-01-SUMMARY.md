---
phase: 28-entry-doc-authority-and-destination-map
plan: 01
subsystem: docs-governance
tags: [entry-docs, docs, routing, governance, migration-map]

requires: []
provides:
  - section-level migration map for `AGENTS.md`, root `CLAUDE.md`, and `.claude/CLAUDE.md`
  - destination ownership contract for moved operational content
  - Phase 29/30 guardrails for no-middle-layer and navigation-only sync
affects: [AGENTS.md, CLAUDE.md, .claude/CLAUDE.md, docs/rules, AI_GUIDE.md, RTK.md]

tech-stack:
  added: []
  patterns:
    - constitution/router/adapter entry-doc split
    - destination-first doc rewrite
    - minimal-navigation-sync guardrail

key-files:
  created:
    - .planning/phases/28-entry-doc-authority-and-destination-map/28-ENTRY-DOC-MIGRATION-MAP.md
    - .planning/phases/28-entry-doc-authority-and-destination-map/28-01-SUMMARY.md
  modified: []

key-decisions:
  - "把 AGENTS / root CLAUDE / .claude/CLAUDE 的 rewrite 输入固定为 keep/move/compress 三类，而不是只写抽象原则"
  - "对 destination 逐项标注 reuse-as-is vs targeted supplement，避免 Phase 29 误判现有 live docs 的覆盖程度"
  - "Phase 28 不修改 live nav docs；只有在 Phase 29/30 真出现 discoverability 缺口时才做最小导航同步"

patterns-established:
  - "entry docs 不再承接操作性内容；操作性内容必须回到现有 live docs / machine truth"
  - "navigation docs 只做路由，不能复写规则正文"

requirements-completed:
  - DEST-01
  - DEST-02
  - ROUTE-04

duration: 20min
completed: 2026-04-22
---

# Phase 28 Plan 01 Summary

**三份入口文档的 section 级迁移图、destination ownership 合同与 Phase 29/30 guardrails 已固定下来。**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-22T05:40:00Z
- **Completed:** 2026-04-22T06:00:03Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- 盘点了 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 的 keep / move / compress 边界，不再让 Phase 29 重新猜入口面职责。
- 为所有计划移出的操作性内容锁定了现有 destination surfaces：`docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md`、`docs/rules/README.md`、`AI_GUIDE.md`、`docs/ai-guide/INTEGRATION.md`、`RTK.md`、`.claude/rule-system.config.json`。
- 明确标注了哪些 destination 可直接复用、哪些只允许在 Phase 29 做 targeted supplement。
- 显式写下“no new governance middle layer / minimal navigation sync only”的后续 phase guardrails。

## Task Commits

未创建 git commit；遵守当前会话中的显式约束：除非用户单独要求，否则不执行 `git commit`。

## Files Created/Modified

- `.planning/phases/28-entry-doc-authority-and-destination-map/28-ENTRY-DOC-MIGRATION-MAP.md` - Phase 28 的核心交付物，包含 source inventory、consolidated move matrix、navigation sync 决策与 rewrite guardrails
- `.planning/phases/28-entry-doc-authority-and-destination-map/28-01-SUMMARY.md` - 当前 plan 的执行摘要

## Decisions Made

- 采用“按 source section 拆分 destination”而不是“按整份文件粗略归类”，因为 `.claude/CLAUDE.md` 的 mixed sections 必须拆回多个 authoritative docs。
- 把 `AI_GUIDE.md` 与 `docs/rules/README.md` 的 Phase 28 处理方式锁定为 “暂不改 live docs，本 phase 只给出 minimal-sync 判定标准”。
- 将 `AGENTS.md` 中的 `RTK` 长表和 `TODO-DEBT` 具体格式都视为可迁移的操作性内容，而非必须继续留在宪法层的正文。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - 本 plan 只生成 planning artifacts，不需要外部服务或人工环境配置。

## Next Phase Readiness

- Phase 29 已获得明确 rewrite 输入：哪些 section 保留、哪些移出、移出后去哪里维护。
- 当前无 blocker；下一步应进入 Phase 29 的 discuss/plan，随后按本工件重写 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`。

---
*Phase: 28-entry-doc-authority-and-destination-map*
*Completed: 2026-04-22*
