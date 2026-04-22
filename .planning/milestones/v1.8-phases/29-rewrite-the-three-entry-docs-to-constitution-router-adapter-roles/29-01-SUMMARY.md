---
phase: 29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles
plan: 01
subsystem: docs-governance
tags: [entry-docs, docs, routing, governance, authority]

requires: []
provides:
  - constitution/router/adapter split across `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`
  - moved operational content anchored in `docs/rules/engineering-with-codex-openai.md`
  - clean removal of mem payload / command-table / checklist drift from entry docs
affects: [AGENTS.md, CLAUDE.md, .claude/CLAUDE.md, docs/rules/engineering-with-codex-openai.md]

tech-stack:
  added: []
  patterns:
    - constitution only at `AGENTS.md`
    - router only at root `CLAUDE.md`
    - Claude adapter only at `.claude/CLAUDE.md`

key-files:
  created:
    - .planning/phases/29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles/29-DISCUSSION-LOG.md
    - .planning/phases/29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles/29-CONTEXT.md
    - .planning/phases/29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles/29-01-PLAN.md
    - .planning/phases/29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles/29-01-SUMMARY.md
  modified:
    - AGENTS.md
    - CLAUDE.md
    - .claude/CLAUDE.md
    - docs/rules/engineering-with-codex-openai.md

key-decisions:
  - "不在入口文档保留任何压缩版执行政策；一律改成路由或移交 authoritative docs"
  - "将任务初始化模板与 AI 友好文档细则补写到工程规则文档，而不是继续挂在 root `AGENTS.md` / `.claude/CLAUDE.md`"
  - "把 AGENTS 尾部误混入的 mem payload 视为 authority drift 并彻底移除"

patterns-established:
  - "入口文档回答『谁定权 / 去哪读 / 去哪改』，不回答规则正文"
  - "运行时或会话级 payload 不得进入 repo-level authority docs"

requirements-completed:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - DEST-03

duration: 35min
completed: 2026-04-22
---

# Phase 29 Plan 01 Summary

**三份入口文档已重写成宪法 / 路由 / Claude adapter，并把被移出的工程性细节收口到现有 live docs。**

## Performance

- **Duration:** 35 min
- **Started:** 2026-04-22T07:24:35Z
- **Completed:** 2026-04-22T07:24:35Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `AGENTS.md` 只保留仓库级治理协议、证据协议、任务分级、改动边界、验证/交付底线与 RTK 原则，不再承载 docs-sync 长表、RTK 速查或 mem payload。
- 根 `CLAUDE.md` 收敛成纯入口路由：只保留角色分工、加载顺序、按问题路由与编辑归宿，不再保留执行回路、验证命令、默认值、dogfood 或 checklist。
- `.claude/CLAUDE.md` 收敛成 Claude adapter：只说明 authority chain 与 Claude-specific loading note，不再重复通用政策。
- `docs/rules/engineering-with-codex-openai.md` 补上任务初始化最小模板与 AI 友好文档补充，使 moved operational content 有现成归宿。

## Task Commits

未创建 git commit；遵守当前会话中的显式约束：除非用户单独要求，否则不执行 `git commit`。

## Decisions Made

- 根 `CLAUDE.md` 采用“按问题路由 + 编辑归宿”双表述，而不是保留压缩版执行摘要。
- `AGENTS.md` 继续保留仓库级 docs-sync 底线，但把详细触发表与 authoring 规范下沉到 `docs/rules/engineering-with-codex-openai.md`。
- `AGENTS.md` 尾部的 `<claude-mem-context>` 被视为非规范性运行时载荷，直接移出 authority surface。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `rtk git diff --check` 通过 `rtk` 包装时返回非零但无输出；回退到 `rtk proxy git diff --check` 后定位到 3 处 Markdown trailing whitespace，并已修复。

## User Setup Required

None.

## Next Phase Readiness

- Phase 30 已可开始：全局 discoverability sweep、入口角色标签同步、zero-duplication verification。
- 当前无 blocker；下一步应更新导航型文档与 machine-readable indexes，然后用 docs guardrail 证明没有重复规范面。
