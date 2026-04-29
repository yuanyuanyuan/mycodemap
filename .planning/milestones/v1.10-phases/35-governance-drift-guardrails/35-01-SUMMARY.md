---
phase: 35-governance-drift-guardrails
plan: 01
subsystem: docs-governance
tags: [entry-docs, guardrail, governance, docs, routing]

requires:
  - AGENTS.md
  - CLAUDE.md
  - .claude/CLAUDE.md
  - docs/rules/README.md
provides:
  - entry-doc governance drift detection inside existing docs guardrails
  - categorized failure output for duplicate policy, ghost commands, ghost routes, and authority routing drift
  - completed `GOV-01~03`
affects:
  - scripts/validate-docs.js
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
  - .planning/PROJECT.md

tech-stack:
  added: []
  patterns:
    - guardrail-on-existing-entrypoint
    - categorized-docs-drift-failures
    - router-only entry-doc enforcement

key-files:
  created:
    - .planning/phases/35-governance-drift-guardrails/35-DISCUSSION-LOG.md
    - .planning/phases/35-governance-drift-guardrails/35-CONTEXT.md
    - .planning/phases/35-governance-drift-guardrails/35-01-PLAN.md
    - .planning/phases/35-governance-drift-guardrails/35-VALIDATION.md
    - .planning/phases/35-governance-drift-guardrails/35-VERIFICATION.md
    - .planning/phases/35-governance-drift-guardrails/35-01-SUMMARY.md
  modified:
    - scripts/validate-docs.js
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/PROJECT.md

key-decisions:
  - "用 snippet-level docs guardrail 而不是新建治理 CLI"
  - "把高信号 drift 分类成四类，避免未来审计只看到 generic docs failure"
  - "Phase 35 只加 backstop，不顺手扩 scope 到 validation truth 或 archive identity"

requirements-completed:
  - GOV-01
  - GOV-02
  - GOV-03

duration: session
completed: 2026-04-23
---

# Phase 35 Plan 01 Summary

**Phase 35 已完成：entry-doc governance drift 现在会在现有 `docs:check` / `ci check-docs-sync` 路径中被自动发现。**

## Accomplishments

- 为 `AGENTS.md` / `CLAUDE.md` / `.claude/CLAUDE.md` / `docs/rules/README.md` 增加了 entry-doc governance baseline guardrail。
- 新增四类失败标签：`duplicate-policy`、`ghost-command`、`ghost-route`、`authority-routing`。
- 保持 `docs:check` 和 `ci check-docs-sync` 为唯一触发入口，没有新增治理脚本或独立流程。
- 将 milestone planning truth 推进到 `Phase 36`。

## Task Commits

未创建 git commit；继续遵守当前会话“不自动 commit / tag / push”的约束。

## Next Phase Readiness

- `Phase 36` 现在可以直接处理 validation truth alignment，因为 governance drift detection baseline 已经就位。
