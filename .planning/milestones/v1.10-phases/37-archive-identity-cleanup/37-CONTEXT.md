# Phase 37: Archive identity cleanup - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 37 只修 planning archive/live identity：
- 让维护者能明确区分当前 active planning truth 与 archived snapshot
- 让 `.planning/MILESTONES.md` 与 `.planning/RETROSPECTIVE.md` 不再被误读为当前执行面
- 为最新 archived milestone docs 补显式 snapshot note

本 phase 不重写全部历史 archive，也不扩展到非 planning docs。

</domain>

<decisions>
## Implementation Decisions

### Scope Guardrails
- current active truth 继续以根 `.planning/PROJECT.md` / `ROADMAP.md` / `REQUIREMENTS.md` / `STATE.md` 为准
- archive index 与 retrospective 只补 identity note，不改历史 lessons 正文
- 最新 archived `v1.9` roadmap / requirements / audit 补 snapshot note，作为当前最可能被打开的 archive surface

### Validation Strategy
- targeted grep 检查 active-vs-archive note
- `rtk proxy git diff --check`
- `rtk npm run docs:check` 作为回归 smoke（确保前两 phases 的 docs 变更仍然稳定）

</decisions>

<specifics>
## Specific Ideas

- 在 `.planning/MILESTONES.md` 顶部增加 “historical snapshot / current truth” 提示
- 在 `.planning/RETROSPECTIVE.md` 顶部增加 “lessons archive, not current planning surface” 提示
- 新增 `.planning/milestones/README.md`
- 在 `.planning/milestones/v1.9-ROADMAP.md` / `...REQUIREMENTS.md` / `...MILESTONE-AUDIT.md` 顶部增加 archive note

</specifics>

---

*Phase: 37-archive-identity-cleanup*
*Context gathered: 2026-04-23 after reviewing active planning files, milestone index, retrospective, and latest archive surfaces*
