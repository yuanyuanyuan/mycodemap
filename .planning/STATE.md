---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: entry-docs-structure-consolidation
current_phase: none
current_phase_name: none
current_plan: none
status: complete
last_updated: "2026-04-22T15:24:35+08:00"
last_activity: 2026-04-22
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
  percent: 100
---

# Session State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-22)

**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Current Focus:** Between milestones — maintain `v1.8` shipped entry-doc structure and wait for the next scoped milestone

## Position

**Milestone:** v1.8 — entry-docs-structure-consolidation
**Current Phase:** none
**Current Phase Name:** none
**Current Plan:** none
**Total Phases:** 3
**Total Plans in Milestone:** 3 complete
**Status:** v1.8 archived; between milestones
**Progress:** [██████████] 100%
**Last Activity:** 2026-04-22
**Last Activity Description:** v1.8 archived to milestones and phase directories cleaned up

## Decisions Made

| Date | Summary | Rationale |
|------|---------|-----------|
| 2026-04-22 | `v1.8 entry-docs-structure-consolidation` started | `v1.7` 已归档，下一步工作聚焦入口文档结构收敛而不是恢复旧 backlog |
| 2026-04-22 | 当前 milestone 直接采用 `docs/brainstorms/2026-04-22-rules-entry-docs-phase1-structure-consolidation-requirements.md` 作为 canonical requirements source | 产品级结构决策已收敛，无需额外外部 research |
| 2026-04-22 | `v1.8` roadmap 使用 `Phase 28-30` | 延续主整数 phase 编号，不把 `999.1` 特殊 follow-up 视作默认顺延编号 |
| 2026-04-22 | 一期范围固定为结构角色澄清与内容迁移 | 不把自审系统、ghost commands 修复或 archive 身份治理并入本 milestone |
| 2026-04-22 | 入口文档角色锁定为宪法 / 路由 / Claude adapter | 这是 current milestone 的核心约束，后续 phases 只围绕该结构收口 |
| 2026-04-22 | 复用现有 live docs 承接迁移内容 | 避免新建治理中间层制造第二轮入口膨胀 |
| 2026-04-22 | Phase 28 completed with explicit entry-doc migration map | 先锁定 `source section → destination truth`，再进入 Phase 29 rewrite，避免重写时重新猜 authority split |
| 2026-04-22 | Phase 29 completed with constitution/router/adapter rewrite | 三份入口文档已回到单一职责，剩余工作转为 discoverability sweep 与零重复验证 |
| 2026-04-22 | Phase 30 completed with discoverability sweep | live docs、machine-readable indexes 与 guardrail comments 已统一到 `CLAUDE.md = 入口路由` |
| 2026-04-22 | `v1.7` archived as `init-and-rule-hardening` | Phase 27 rule-control hardening and Phase 999.1 init infrastructure convergence are both complete and form one coherent closeout milestone |
| 2026-04-21 | `Phase 999.1` completed | Init reconciler, canonical `.mycodemap/config.json`, hooks/rules assets, docs sync, and package smoke landed |
| 2026-04-19 | `Phase 27` completed | Repo-local rule control, hooks / CI backstop, scoped rule-context injection, and executable QA landed |
| 2026-04-19 | `Phase 26` classified as `post-v1.6` thin slice follow-up | Scope is real new work after `v1.6`, but still a single-phase follow-up rather than a reopened old milestone |
| 2026-04-18 | `v1.5` closed without continuation | User explicitly said Docker / ArcadeDB are no longer needed and prior unfinished work should not continue |
| 2026-04-18 | `Phase 25` reclassified as `v1.6` | Phase 25 is the start of the new version rather than an out-of-band tail under v1.5 |

## Blockers

- No active blockers.
- Do not automatically restore `Phase 22-24`.

## Deferred Items

Items carried forward or explicitly deferred at milestone initialization on 2026-04-22:

| Category | Item | Status |
|----------|------|--------|
| debug | mycodemap-install-runtime-deps | awaiting_human_verify |
| governance | entry-doc duplicate drift detection automation | deferred_to_future_milestone |
| governance | ghost commands / validation trust / archive identity cleanup | deferred_to_future_milestone |

## Accumulated Context

### Roadmap Evolution

- 2026-04-18: 用户明确关闭旧版 Docker / ArcadeDB continuation，并将 `Phase 25` 视为 `v1.6`
- 2026-04-19: Phase 26 completed as `post-v1.6` symbol-level graph / experimental MCP thin slice
- 2026-04-19: Phase 27 completed as repo-local rule-control hardening
- 2026-04-21: Phase 999.1 completed as `mycodemap init` infrastructure convergence
- 2026-04-22: `v1.7` archived；下一步必须从 fresh requirements 重新定 scope
- 2026-04-22: `v1.8` initialized to consolidate `AGENTS.md` / `CLAUDE.md` / `.claude/CLAUDE.md` structure and routing
- 2026-04-22: Phase 28 context captured with section-level destination mapping rules for the three entry docs
- 2026-04-22: Phase 28 completed with `28-ENTRY-DOC-MIGRATION-MAP.md`, `28-01-SUMMARY.md`, and `28-VERIFICATION.md`
- 2026-04-22: Phase 29 completed with rewritten `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, plus `engineering-with-codex-openai.md` supplements for moved execution detail
- 2026-04-22: Phase 30 completed with live docs / AI index / guardrail terminology sync and zero-duplication verification

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

### Risks To Watch

- 不要再把已关闭的 `v1.5` 历史分支误当成 active blocker
- 不要为了入口文档收敛新增治理中间层或生成式 drift 系统
- 未来若再改 CLI / JSON contract，必须同步更新 AI docs 与 guardrail
- 不要把 `rtk` 从执行包装层误写成 CodeMap 产品能力
- `.planning/phases/` 中残留的历史 phase 工件不应被误判为 `v1.8` active scope
- `gsd-sdk query init.milestone-op` 曾返回与 `roadmap.analyze` 不一致的 phase count；当前不阻断 v1.8，但建议后续排查 GSD infra
