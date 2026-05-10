---
gsd_state_version: 1.0
milestone: v2.7
milestone_name: agent-effectiveness-validation
current_phase: null
current_phase_name: null
current_plan: null
status: defining_requirements
last_updated: "2026-05-10T14:00:00.000Z"
last_activity: 2026-05-10
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Session State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-10)

**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Current Focus:** `v2.7 agent-effectiveness-validation` — `codemap agent-metrics` 命令

## Position

**Milestone:** `v2.7 agent-effectiveness-validation`
**Current Phase:** Not started (defining requirements)
**Current Plan:** —
**Total Phases:** TBD (pending roadmap)
**Total Plans in Milestone:** 0
**Status:** Defining requirements
**Progress:** [----------] 0/? phases complete
**Last Activity:** 2026-05-10
**Last Activity Description:** Milestone v2.7 started from agent-effectiveness-validation requirements doc

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-10 — Milestone v2.7 started

## Decisions Made

| Date | Summary | Rationale |
|------|---------|-----------|
| 2026-05-10 | Start `v2.5 deep-analysis-hooks` | User confirmed scope covers `PY-07` / `PY-08` and `HOOK-01~03` |
| 2026-05-10 | Research-first before requirements | User explicitly chose to run research before scoping requirements |
| 2026-05-10 | Keep reserved `Phase 70` numbering | `Phase 70` was already deferred out of `v2.4`; preserving it avoids rewriting milestone history |
| 2026-05-10 | Split `v2.5` into 4 phases | Separate Python call-graph, Python complexity, topology+dedup, and hook reminder for clearer verification boundaries |
| 2026-05-10 | Lock Phase 70 to high-confidence symbol-level call graph | Standard-scope static calls only; dynamic calls unresolved; no inferred edges or file-level dual writeback |
| 2026-05-10 | Start `v2.7 agent-effectiveness-validation` | User confirmed agent-metrics as independent milestone; v2.6 polish deferred |
| 2026-05-10 | New command `codemap agent-metrics` not extending `benchmark` | benchmark focuses on parser/storage performance; agent-metrics focuses on agent effectiveness; separate concerns |

## Active Milestone Scope

| Requirement | Summary | Planned Phase |
|-------------|---------|---------------|
| (TBD) | Token 成本分析 per-query-type | — |
| (TBD) | 报告输出 human-readable + JSON | — |
| (TBD) | CI 门禁 max-tokens-per-query 阈值 | — |
| (TBD) | 命令结构 agent-metrics token / report | — |

## Deferred Items

| Category | Item | Target Milestone |
|----------|------|------------------|
| polish | POL-01: Complexity calculation unify | v2.6 polish-and-stabilize |
| polish | POL-02: MCP blank-line filter | v2.6 polish-and-stabilize |
| polish | POL-03: Edge ID normalization | v2.6 polish-and-stabilize |
| polish | POL-04: Interface Contract 1.0.0 | v2.6 polish-and-stabilize |
| deep-analysis | PY-07: Python call-graph extraction | v2.5 deep-analysis-hooks |
| deep-analysis | PY-08: Python complexity truth | v2.5 deep-analysis-hooks |
| deep-analysis | HOOK-01: hub/bridge detection | v2.5 deep-analysis-hooks |
| deep-analysis | HOOK-02: hook mechanism | v2.5 deep-analysis-hooks |
| deep-analysis | HOOK-03: node dedup | v2.5 deep-analysis-hooks |
| agent-integration | Auto-Provisioned Agent Skills | v3.0+ |
| agent-integration | MCP `verify_contract` Tool | v3.0+ |
| parser | Parser extension Rust/Java/C++ (Tree-sitter grammar) | v3.0+ |
| governance | actual npm/GitHub release for v1.9.0 | out_of_scope_until_explicit_release_command |

## Risks To Watch

- token 估算的启发式公式需要基于实际数据校准，不能凭空设定
- 默认阈值需要先跑一次 token report 看数据分布，否则可能过松或过紧
- 查询场景从 git history 提取的策略需要确认——不是所有 commit 都有清晰的 ground truth
- agent-metrics 不应与现有 benchmark 命令产生职责重叠

---
*State initialized for v2.7 on 2026-05-10*
