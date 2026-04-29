---
gsd_state_version: 1.0
milestone: v1.11
milestone_name: release-followup-hardening
current_phase: 40 — completed
current_phase_name: readiness-gate-evaluation
current_plan: 40-01 complete
status: complete
last_updated: "2026-04-29T17:15:00+08:00"
last_activity: 2026-04-29
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# Session State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-23)

**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Current Focus:** No active milestone. Start the next milestone when ready.

## Position

**Milestone:** v1.11 — release-followup-hardening
**Current Phase:** 40 — completed
**Current Phase Name:** readiness-gate-evaluation
**Current Plan:** 40-01 — complete
**Total Phases:** 3 planned
**Total Plans in Milestone:** 3 planned
**Status:** Complete (closed)
**Progress:** [██████████] 100%
**Last Activity:** 2026-04-29
**Last Activity Description:** Phase 40 completed — quality rules refactored to three-layer gate semantics (hard / warn-only / fallback), standalone readiness-gate CLI command created, ship pipeline updated to handle fallback states

## Decisions Made

| Date | Summary | Rationale |
|------|---------|-----------|
| 2026-04-23 | `v1.11 release-followup-hardening` started | User accepted opening the next milestone skeleton after `v1.10` closeout |
| 2026-04-23 | `v1.11` scope fixed to `RELF-01~03` | These are the only explicitly named release follow-ups already carried forward from `v1.9` / `v1.10` requirements |
| 2026-04-23 | `Phase 38` chooses Codex as the first non-Claude runtime target | The repo already uses `.agents` / Codex patterns and the current execution environment is Codex, so this is the lowest-friction authority-preserving path |
| 2026-04-23 | Kimi parity deferred beyond `Phase 38` | The milestone needs one proven non-Claude wrapper path before considering multi-runtime expansion |
| 2026-04-23 | `Phase 38` completed with a Codex repo-local wrapper | `.agents/skills/release/SKILL.md` now exists and still routes back to `docs/rules/release.md` rather than becoming a second release authority |
| 2026-04-23 | `publish-status` fixed as a standalone follow-up command | User explicitly chose a separate read-only surface instead of thickening `/release` |
| 2026-04-23 | `publish-status` fixed to snapshot-only by default | Follow-up observability must not silently grow into long-running polling |
| 2026-04-23 | `publish-status` must support terminal summary + machine-readable JSON | Humans and agents both need the same truth source, with `--structured` removing prose |
| 2026-04-23 | `publish-status` must stay strict truth-first | If exact run truth is not unique or not confirmable, return `ambiguous` / `unavailable` instead of guessing the latest publish run |
| 2026-04-23 | `Phase 39` completed | standalone `publish-status` now reuses strict GitHub Actions snapshot truth and docs frame it as follow-up observability only |
| 2026-04-23 | `v1.11` roadmap uses `Phase 38-40` | Phase numbering continues after `v1.10` and maps 1:1 to `RELF-01~03` |
| 2026-04-23 | `v1.10 governance-debt-cleanup` started | User explicitly chose “治理债清理” as the next milestone after `v1.9` closeout |
| 2026-04-23 | `v1.10` scope fixed to governance debt cleanup | Deferred items already named duplicate drift detection, ghost commands / validation trust, and archive identity as the next governance slice |
| 2026-04-23 | External research skipped for `v1.10` | This is brownfield governance cleanup; current docs, guardrails, and planning archives already provide the required truth |
| 2026-04-23 | `v1.10` roadmap uses `Phase 35-37` | Phase numbering continues after `v1.9` because `--reset-phase-numbers` was not requested |
| 2026-04-23 | Phase 35 completed | Existing docs guardrails now detect entry-doc duplicate policy drift, ghost commands / routes, and authority-routing regressions |
| 2026-04-23 | Phase 36 completed | Validation quick truth and gate semantics now read consistently across README, AI guide, validation rule, and engineering rule |
| 2026-04-23 | Phase 37 completed | Active planning truth, milestone index, retrospective, and latest archive snapshots now have explicit archive/live identity labels |
| 2026-04-23 | `v1.10` milestone closeout prepared | Audit passed; roadmap, requirements, audit, and phase artifacts were archived without commit/tag/push |
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

- No active blocker remains after `Phase 40` completion.
- Milestone v1.11 has been closed on 2026-04-29.
- Real npm release, tag creation, and remote push remain out of scope until a future explicit `/release v1.9` command plus both confirmation gates.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-29:

| Category | Item | Status |
|----------|------|--------|
| debug | mycodemap-install-runtime-deps | awaiting_human_verify |
| release | actual npm/GitHub release for v1.9.0 | out_of_scope_until_explicit_release_command |

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
- 2026-04-23: `v1.10` initialized to clear deferred governance debt around duplicate drift detection, validation trust, and archive/live identity
- 2026-04-23: Phase 35 completed; `scripts/validate-docs.js` now enforces entry-doc governance drift categories inside existing docs guardrails
- 2026-04-23: Phase 36 completed; cross-doc validation quick truth is now locked by `scripts/validate-docs.js`
- 2026-04-23: Phase 37 completed; milestone index, retrospective, and latest `v1.9` archive docs now carry explicit historical snapshot identity notes
- 2026-04-23: `v1.10` closeout archive artifacts generated; Phase 35-37 moved to `.planning/milestones/v1.10-phases/`
- 2026-04-23: `v1.11` initialized as `release-followup-hardening` to scope `RELF-01~03` without triggering real publish actions
- 2026-04-23: `Phase 38` activated as `codex-release-entry-surface`; planning scope is now Codex-first, with Kimi parity explicitly deferred
- 2026-04-23: `Phase 38` completed; Codex now has a repo-local release adapter and release docs carry a minimal runtime-adapter note
- 2026-04-23: `Phase 39` completed; `publish-status` now exposes snapshot-only, strict truth-first publish follow-up status in both terminal and machine-readable forms

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
- `scripts/validate-docs.js` 与 `node dist/cli/index.js ci check-docs-sync` 已提供现有 docs governance enforcement hook point，可作为 `v1.10` 的最小实现载体
- `Phase 35` 已把 entry-doc duplicate policy、ghost command / route 与 authority-routing drift 接入现有 docs guardrail
- `Phase 36` 已把 validation quick truth、`report-only` 语义与 `warn-only / fallback` 语义对齐到四份 live docs
- `Phase 37` 已把 current active planning truth 与 latest archived milestone snapshots 的身份边界写实
- `Phase 38` 已为 Codex 补齐 repo-local release entry surface，并保持 `docs/rules/release.md` 仍是单一 authority
- `Phase 39` 已为 GitHub Actions publish 链补齐独立 `publish-status` follow-up surface，能显式返回 `pending / success / failure / ambiguous / unavailable`

### Risks To Watch

- 不要为 `v1.11` 新增与 `/release` 并行的 competing release entry；任何 wrapper 只能 route / delegate 到现有 authority
- Codex wrapper 必须保持 repo-local governance adapter 身份，不能演变成第二套 release handbook
- GitHub Actions polling 必须保持读取 / 汇报属性，不要隐式触发 rerun、publish 或其他 side effects
- `publish-status` 必须保持 snapshot-only 默认值，不要在没有显式需求时回长成常驻 watch
- readiness gate evaluation 不能把 `warn-only / fallback` 误写成 hard gate success
- Release operations are L3: do not run `npm version`, create tags, or push without an explicit `/release v{X.Y}` invocation and both confirmation gates
- `package.json` current version to npm `1.9.0` is a major jump and must be highlighted again during any real release
- `gsd-sdk query init.new-milestone` currently reports stale current milestone metadata; use durable planning files as truth
- `gsd milestone.complete` / `audit-open` behavior still needs real-output verification during a future explicit `/release` dogfood
- Do not hardcode `NPM_TOKEN` or other publishing secrets
- Do not let release follow-up work rebuild existing release tooling; keep `/release` and its delegates thin

**Planned Phase:** 40 () — 1 plans — 2026-04-23T19:57:24+08:00
