---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: release-governance-unification
current_phase:
current_phase_name:
current_plan:
status: milestone_closed
last_updated: "2026-04-23T09:24:11+08:00"
last_activity: 2026-04-23
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# Session State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-23)

**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Current Focus:** `v1.9` release governance planning milestone has been archived; real npm / GitHub release remains out of scope until an explicit future `/release v1.9` command

## Position

**Milestone:** v1.9 — release-governance-unification
**Current Phase:** None — milestone phases archived
**Current Phase Name:** None
**Current Plan:** None
**Total Phases:** 4
**Total Plans in Milestone:** 4 complete
**Status:** Milestone planning closeout archived; no active phase is currently selected
**Progress:** [██████████] 100%
**Last Activity:** 2026-04-23
**Last Activity Description:** `v1.9` roadmap, requirements, audit, and Phase 31-34 artifacts were archived without git commit / tag / push

## Decisions Made

| Date | Summary | Rationale |
|------|---------|-----------|
| 2026-04-23 | `v1.9` milestone closeout prepared | Audit passed; open debug artifact was acknowledged as deferred; archive artifacts were generated without commit/tag/push |
| 2026-04-22 | `v1.9 release-governance-unification` started | User provided a concrete `/release` unified publishing plan and asked to open v1.9 from it |
| 2026-04-22 | Every milestone maps to one npm release | User decision: milestone closeout and npm release should be tied 1:1 |
| 2026-04-22 | Milestone version maps directly to npm version | User decision: `v1.9` maps to npm `1.9.0`; major jumps must be highlighted |
| 2026-04-22 | `/release` must include two explicit confirmation gates | Release is L3; AI may prepare and verify but must not autonomously publish |
| 2026-04-22 | `/release` remains a thin orchestrator | Reuse GSD closeout, release script and GitHub Actions rather than rebuilding them |
| 2026-04-22 | Phase 31 completed | `docs/rules/release.md`, deployment / checklist sync, and routing-only entry-doc changes are now authoritative |
| 2026-04-22 | Phase 32 completed | `.claude/skills/release/SKILL.md` now encodes refusal cases, version mapping, and both confirmation gates |
| 2026-04-22 | Phase 33 completed | docs guardrails, pre-release guardrail, docs-sync, and failure rehearsal evidence all passed |
| 2026-04-22 | Phase 34 planned | Milestone audit found checklist authority drift, so `REL-01` / `DOC-02` / `VAL-01` were reopened for a focused gap-closure phase before closeout |
| 2026-04-22 | Phase 34 completed | `pre-release-checklist.md` no longer recommends direct helper execution, `release.md` command examples are aligned, and `REL-01` / `DOC-02` / `VAL-01` are satisfied again |
| 2026-04-22 | `v1.8 entry-docs-structure-consolidation` started | `v1.7` 已归档，下一步工作聚焦入口文档结构收敛而不是恢复旧 backlog |
| 2026-04-22 | `v1.8` completed with constitution / router / adapter rewrite | 三份入口文档已回到单一职责，discoverability sweep 与零重复验证已完成 |
| 2026-04-22 | `v1.7` archived as `init-and-rule-hardening` | Phase 27 rule-control hardening and Phase 999.1 init infrastructure convergence are both complete and form one coherent closeout milestone |
| 2026-04-18 | `v1.5` closed without continuation | User explicitly said Docker / ArcadeDB are no longer needed and prior unfinished work should not continue |

## Blockers

- No active blockers remain for closing `v1.9` as a planning milestone after the Phase 34 authority-gap fix.
- Real npm release, tag creation, and remote push remain out of scope until a future explicit `/release v1.9` command plus both confirmation gates.

## Deferred Items

Items acknowledged and deferred at `v1.9` milestone closeout preparation on 2026-04-23:

| Category | Item | Status |
|----------|------|--------|
| debug | mycodemap-install-runtime-deps | awaiting_human_verify |
| governance | entry-doc duplicate drift detection automation | deferred_to_future_milestone |
| governance | ghost commands / validation trust / archive identity cleanup | deferred_to_future_milestone |
| release | actual npm/GitHub release for v1.9.0 | out_of_scope_until_explicit_release_command |
| release | non-Claude runtime release wrappers | deferred_to_future_milestone |
| release | GitHub Actions publish polling | deferred_to_future_milestone |

## Accumulated Context

### Roadmap Evolution

- 2026-04-18: 用户明确关闭旧版 Docker / ArcadeDB continuation，并将 `Phase 25` 视为 `v1.6`
- 2026-04-19: Phase 26 completed as `post-v1.6` symbol-level graph / experimental MCP thin slice
- 2026-04-19: Phase 27 completed as repo-local rule-control hardening
- 2026-04-21: Phase 999.1 completed as `mycodemap init` infrastructure convergence
- 2026-04-22: `v1.7` archived；Phase 27 与 Phase 999.1 均已移入 `v1.7-phases`
- 2026-04-22: `v1.8` initialized to consolidate `AGENTS.md` / `CLAUDE.md` / `.claude/CLAUDE.md` structure and routing
- 2026-04-22: Phase 28 completed with `28-ENTRY-DOC-MIGRATION-MAP.md`, `28-01-SUMMARY.md`, and `28-VERIFICATION.md`
- 2026-04-22: Phase 29 completed with rewritten `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, plus `engineering-with-codex-openai.md` supplements for moved execution detail
- 2026-04-22: Phase 30 completed with live docs / AI index / guardrail terminology sync and zero-duplication verification
- 2026-04-22: `v1.9` initialized from `/home/stark/.claude/plans/ticklish-sprouting-church.md` as release governance unification
- 2026-04-22: Phase 31 completed with authoritative release workflow docs, milestone-bound deployment / checklist rules, and release routing
- 2026-04-22: Phase 32 completed with Claude `/release` skill, refusal matrix, version mapping, and both confirmation gates
- 2026-04-22: Phase 33 completed with docs guardrails, pre-release check, docs-sync, failure rehearsal coverage, and milestone-complete planning state
- 2026-04-22: Phase 34 planned to remove `pre-release-checklist.md` helper-first authority drift and refresh `VAL-01` proof before milestone closeout
- 2026-04-22: Phase 34 completed; `/release` is again the only recommended release entry and v1.9 is back to closeout-ready state
- 2026-04-23: `v1.9` closeout archive artifacts generated; Phase 31-34 moved to `.planning/milestones/v1.9-phases/`

### Verified Existing Capabilities

- `design validate → design map → design handoff → design verify` 已作为正式协作链路 shipped
- `Phase 25` 已收口 `analyze find` diagnostics truth、相邻 CLI JSON status contract 与 AI docs guardrails
- `Phase 26` 已收口 opt-in symbol-level generate、partial graph truth 与 experimental local MCP query / impact
- `Phase 27` 已收口 repo-local rule control、hooks / CI backstop、scoped rule-context 注入与 executable QA
- `Phase 999.1` 已收口 canonical `.mycodemap/config.json`、receipt-led init reconciler、hook/rule packaging、docs sync 与 package smoke
- `docs/rules/validation.md` 与 `docs/rules/engineering-with-codex-openai.md` 已能作为验证顺序与工程执行细节的 live 文档归宿
- `AI_GUIDE.md` 与 `docs/rules/README.md` 已能作为工具发现与导航表达的 live 文档归宿
- `Phase 29` 已移除 entry docs 中的执行回路、命令清单、RTK 长表与会话级 mem payload
- `Phase 30` 已证明 live discoverability 面不再把 `CLAUDE.md` 标成执行手册
- `Phase 31` 已把 `/release` 的 authority surface 固定在 `docs/rules/release.md`
- `Phase 32` 已把 `/release` 的运行时行为固定到 `.claude/skills/release/SKILL.md`
- `Phase 33` 已证明 release docs / skill / routing / validation 面当前一致且可 dry-run

### Risks To Watch

- Release operations are L3: do not run `npm version`, create tags, or push without an explicit `/release v{X.Y}` invocation and both confirmation gates
- `package.json` current version to npm `1.9.0` is a major jump and must be highlighted again during any real release
- `gsd-sdk query init.new-milestone` currently reports stale current milestone metadata; use durable planning files as truth
- `gsd milestone.complete` / `audit-open` behavior still needs real-output verification during a future explicit `/release` dogfood
- Do not hardcode `NPM_TOKEN` or other publishing secrets
- Do not let `/release` rebuild existing release tooling; keep it a thin orchestrator
