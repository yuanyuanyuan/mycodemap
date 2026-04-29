---
phase: 38-codex-release-entry-surface
plan: 01
subsystem: release-governance
tags: [release, codex, skill, docs, authority]

requires:
  - docs/rules/release.md
  - .claude/skills/release/SKILL.md
provides:
  - Codex repo-local `/release` runtime adapter
  - runtime-adapter note in the authoritative release rules doc
  - completed `RELF-01`, `SAFE-01`, `SAFE-02`
affects:
  - .agents/skills/release/SKILL.md
  - docs/rules/release.md
  - .planning/ROADMAP.md
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md
  - .planning/PROJECT.md

tech-stack:
  added: []
  patterns:
    - codex-runtime-adapter
    - rules-doc-first authority
    - thin-wrapper-over-existing-release-tooling

key-files:
  created:
    - .agents/skills/release/SKILL.md
    - .planning/phases/38-codex-release-entry-surface/38-CONTEXT.md
    - .planning/phases/38-codex-release-entry-surface/38-DISCUSSION-LOG.md
    - .planning/phases/38-codex-release-entry-surface/38-01-PLAN.md
    - .planning/phases/38-codex-release-entry-surface/38-VALIDATION.md
    - .planning/phases/38-codex-release-entry-surface/38-VERIFICATION.md
    - .planning/phases/38-codex-release-entry-surface/38-01-SUMMARY.md
  modified:
    - docs/rules/release.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/PROJECT.md
    - .planning/MILESTONES.md

key-decisions:
  - "先做 Codex-first wrapper，不同时扩 Kimi parity"
  - "Codex wrapper 只能是 runtime adapter，不能复制第二套 release workflow"
  - "只给 `docs/rules/release.md` 增加最小 runtime-adapter note，不扩写 README / AI guide"

requirements-completed:
  - RELF-01
  - SAFE-01
  - SAFE-02

duration: session
completed: 2026-04-23
---

# Phase 38 Plan 01 Summary

**Phase 38 已完成：Codex 现在也有 repo-local `/release` 入口，但它仍严格回到同一条 `docs/rules/release.md` authority chain。**

## Accomplishments

- 新建 `.agents/skills/release/SKILL.md`，为 Codex runtime 固定 release wrapper、refusal cases、双确认门与 helper delegation。
- 在 `docs/rules/release.md` 增加最小 runtime-adapter note，明确 Claude / Codex skill 都只是薄适配器，不能替代规则文档。
- 保持 README、AI guide 与 entry docs 不复制 `Confirmation Gate #1` / `#2` 等 release workflow 正文。
- 将 milestone planning truth 从 `Phase 38` 推进到 `Phase 39`。

## Task Commits

未创建 git commit；继续遵守当前会话“不自动 commit / tag / push”的约束。

## Next Phase Readiness

- `Phase 39` 现在可以专注在 GitHub Actions publish polling / structured report。
- `RELF-01` 已关闭，后续只需继续守住 release authority 不漂移。
