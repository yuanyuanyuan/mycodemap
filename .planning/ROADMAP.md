# Roadmap: CodeMap

## Milestones

- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)
- ✅ **v1.3 Kùzu-only 收敛与高信号债务清理** — Phases 13-16 (shipped 2026-03-24)
- ✅ **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (shipped 2026-03-26)
- ✅ **post-v1.4 ArcadeDB Node feasibility follow-up** — Phase 21 (completed 2026-03-28)
- ✅ **v1.6 CodeMap CLI dogfood reliability hardening** — Phase 25 (completed 2026-04-18)
- ✅ **post-v1.6 Symbol-level graph and experimental MCP thin slice** — Phase 26 (completed 2026-04-19)

## Overview

2026-04-18 起，active planning surface 不再继续 Docker / ArcadeDB 路线。用户已明确要求：**从 Phase 25 开始视为新版本，Phase 22-24 的未完成事项不再继续处理**。

因此当前 roadmap 的真实边界是：

- `v1.5` 保留为历史分支，只做记录，不再作为待续工作
- `v1.6` 从 `Phase 25` 起算，聚焦 Agent-facing CLI reliability / JSON contract / docs truth，并已完成
- `post-v1.6` 作为后续薄切片，完成了 symbol-level graph 与 experimental MCP 的最小纵向验证
- 当前没有 active milestone；未来若要继续新工作，必须另开新 phase 或新 milestone，不能自动回跳到 `Phase 22-24`

## Archived Milestone Detail

- `v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/v1.4-ROADMAP.md`、`.planning/milestones/v1.4-REQUIREMENTS.md`、`.planning/milestones/v1.4-MILESTONE-AUDIT.md`
- `post-v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/post-v1.4-ROADMAP.md`、`.planning/milestones/post-v1.4-REQUIREMENTS.md`、`.planning/milestones/post-v1.4-MILESTONE-AUDIT.md`
- `v1.6` roadmap / requirements / audit 已归档到 `.planning/milestones/v1.6-ROADMAP.md`、`.planning/milestones/v1.6-REQUIREMENTS.md`、`.planning/milestones/v1.6-MILESTONE-AUDIT.md`
- `v1.6` 的 phase 历史已归档到 `.planning/milestones/v1.6-phases/25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err/`
- `post-v1.6` 的 phase 历史已归档到 `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/`
- `v1.5` 当前仍保留的 phase 级历史工件位于 `.planning/milestones/v1.5-phases/22-real-arcadedb-server-live-smoke-gate/`；这些工件仅供追溯，不再构成 active backlog
- dormant seed 来源：`.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md`

## v1.6 CodeMap CLI dogfood reliability hardening

**Status:** Archived on 2026-04-19
**Archive:** `.planning/milestones/v1.6-ROADMAP.md`, `.planning/milestones/v1.6-REQUIREMENTS.md`, `.planning/milestones/v1.6-MILESTONE-AUDIT.md`
**Summary:** `Phase 25` 已把 `analyze find` 静默失败、相邻 CLI JSON contract 缺口与 AI docs / guardrail truth 收口完成；root roadmap 不再保留该 milestone 的详细 phase 级展开。

## post-v1.6 Symbol-level graph and experimental MCP thin slice

**Status:** Completed on 2026-04-19 after verification
**Positioning:** 这是 `v1.6` 之后的薄切片 follow-up，用来验证 symbol-level graph truth 与 experimental MCP 的最小可用纵向链路，不是回补 `v1.5`。

## Phases

- [x] **Phase 26: Implement symbol-level graph and experimental MCP thin slice** - 打通 `generate --symbol-level` → symbol truth / partial graph metadata → experimental local MCP stdio query / impact

### Phase 26: Implement symbol-level graph and experimental MCP thin slice
**Goal:** 先打通 `generate --symbol-level` → CodeGraph / SQLite 的最小纵向切片，让 `smart-parser` 的 symbol-level 调用真相成为后续 experimental MCP query / impact 的真实基础
**Requirements**: `P26-NOW-SYMBOL-GENERATE`、`P26-NOW-SQLITE-PATH`、`P26-NOW-PARTIAL-GRAPH-TRUTH`、`P26-NOW-MCP-STDIO`、`P26-NOW-SYMBOL-IMPACT`
**Depends on:** Phase 25
**Status**: Complete on 2026-04-19 after verification; all 3 plans passed
**Plans**: 3 completed plans (`26-01`, `26-02`, `26-03`)

Plans:
- [x] **26-01** Opt-in symbol-level generate + sqlite path + schema v3 round-trip
- [x] **26-02** Explicit `graphStatus` / partial graph truth through analyzer, generate, SQLite, and docs
- [x] **26-03** Experimental MCP stdio thin slice with `mcp start` / `mcp install` and `codemap_query` / `codemap_impact`

## v1.5 Isolated ArcadeDB Server-backed Prototype

**Status:** Closed on 2026-04-18 by explicit user direction
**Reason:** Docker / ArcadeDB 不再属于当前版本规划
**Historical note:** 22-24 的 phase 工件保留以便追溯，但不再继续执行、补齐或解 blocker

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 22. Live smoke gate | v1.5 | 2/2 | Closed | — |
| 23. Evidence & blast radius | v1.5 | 0/0 | Dropped | — |
| 24. Decision package | v1.5 | 0/0 | Dropped | — |
| 25. CLI dogfood hardening | v1.6 | 3/3 | Complete | 2026-04-18 |
| 26. Symbol graph + experimental MCP | post-v1.6 | 3/3 | Complete | 2026-04-19 |

## Current Routing Rule

- 不要再把 `Phase 22-24` 当成待恢复 blocker 或默认下一步
- `Phase 25` 是 `v1.6` 的起点与已完成交付，不再挂靠 `v1.5`
- `Phase 26` 已作为 `post-v1.6` 薄切片 follow-up 完成；如果继续新工作，应新开 milestone / phase scope，而不是回补已关闭版本
