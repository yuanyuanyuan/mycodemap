# Roadmap: CodeMap

## Milestones

- ✅ **v1.7 init-and-rule-hardening** — Phases 27, 999.1 (shipped 2026-04-22)
- ✅ **post-v1.6 Symbol-level graph and experimental MCP thin slice** — Phase 26 (completed 2026-04-19)
- ✅ **v1.6 CodeMap CLI dogfood reliability hardening** — Phase 25 (completed 2026-04-18)
- ✅ **post-v1.4 ArcadeDB Node feasibility follow-up** — Phase 21 (completed 2026-03-28)
- ✅ **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (shipped 2026-03-26)
- ✅ **v1.3 Kùzu-only 收敛与高信号债务清理** — Phases 13-16 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)

## Overview

Current active milestone: none. The latest completed milestone is `v1.7 init-and-rule-hardening`, which closed Phase 27 repo-local rule-control hardening and Phase 999.1 `mycodemap init` infrastructure convergence.

Do not resume the historical Docker / ArcadeDB `Phase 22-24` branch by default. If future work needs that direction, start a fresh milestone with explicit requirements.

## Archived Milestone Detail

- `v1.7` roadmap / requirements / audit are archived to `.planning/milestones/v1.7-ROADMAP.md`, `.planning/milestones/v1.7-REQUIREMENTS.md`, `.planning/milestones/v1.7-MILESTONE-AUDIT.md`
- `v1.6` roadmap / requirements / audit are archived to `.planning/milestones/v1.6-ROADMAP.md`, `.planning/milestones/v1.6-REQUIREMENTS.md`, `.planning/milestones/v1.6-MILESTONE-AUDIT.md`
- `post-v1.6` phase history is archived to `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/`
- `v1.5` historical phase artifacts remain under `.planning/milestones/v1.5-phases/`; these are trace-only and not active backlog

## Phases

No active phases are currently selected. Start the next milestone with `$gsd-new-milestone /data/codemap`.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 22. Live smoke gate | v1.5 | 2/2 | Closed | — |
| 23. Evidence & blast radius | v1.5 | 0/0 | Dropped | — |
| 24. Decision package | v1.5 | 0/0 | Dropped | — |
| 25. CLI dogfood hardening | v1.6 | 3/3 | Complete | 2026-04-18 |
| 26. Symbol graph + experimental MCP | post-v1.6 | 3/3 | Complete | 2026-04-19 |
| 27. Rule control system + hooks/CI QA | v1.7 | 6/6 | Complete | 2026-04-19 |
| 999.1. mycodemap init enhancements | v1.7 | 5/5 | Complete | 2026-04-21 |

## Backlog

No active backlog item is currently selected. Phase 999.1 has been archived as part of v1.7.

## Current Routing Rule

- `$gsd-new-milestone /data/codemap` is the correct next planning entry point.
- Do not treat `Phase 22-24` as pending work.
- Keep the open debug session visible as a deferred item rather than a default next action.
