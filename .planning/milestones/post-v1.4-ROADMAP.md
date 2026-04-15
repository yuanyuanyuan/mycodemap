# Roadmap: CodeMap

## Milestones

- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)
- ✅ **v1.3 Kùzu-only 收敛与高信号债务清理** — Phases 13-16 (shipped 2026-03-24)
- ✅ **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (shipped 2026-03-26)
- ✅ **post-v1.4 ArcadeDB Node feasibility follow-up** — Phase 21 (completed 2026-03-28)

## Overview

`v1.4` 已于 2026-03-26 完成归档。当前 active planning 不再继续重写 design chain，而是先做一个单 phase follow-up：验证 ArcadeDB 在 Node.js 下是否值得进入正式 backend 路线。  
先证伪再实现是这里的关键边界：如果官方支持面、运行方式或实验成本不成立，就应该尽早输出 No-Go，而不是先写适配器再回头证明它不该存在。

## Archived Milestone Detail

- `v1.4` 详细 roadmap 已归档到 `.planning/milestones/v1.4-ROADMAP.md`
- `v1.4` requirement archive 已归档到 `.planning/milestones/v1.4-REQUIREMENTS.md`
- `v1.4` audit 结论见 `.planning/milestones/v1.4-MILESTONE-AUDIT.md`

## post-v1.4 ArcadeDB Node feasibility follow-up

## Phases

- [x] **Phase 21: Evaluate ArcadeDB Node integration feasibility** - 基于官方支持面验证 ArcadeDB 是否值得进入正式 backend 路线

### Phase 21: Evaluate ArcadeDB Node integration feasibility
**Goal**: 基于 ArcadeDB 官方支持面验证它是否能作为 CodeMap 的 KùzuDB 后继方案；输出 Node.js 接入可行性、架构 blast radius 与 Go/No-Go 决策建议
**Depends on**: `v1.4` shipped (`Phase 20` complete) + archived decision from `Phase 999.1`
**Requirements**: ARC-01, ARC-02, ARC-03, ARC-04, ARC-05
**Success Criteria** (what must be TRUE):
  1. 明确 ArcadeDB 在 Node.js 下的官方接入拓扑与不支持项，而不是把假设当事实
  2. 给出不污染现有 `filesystem` / `memory` / `kuzudb` / `auto` public surface 的最小实验路径
  3. 给出带证据的 blast radius、validation/benchmark strategy 与 Go/No-Go 建议
**Status**: Complete — evidence pack, blast-radius analysis, isolated smoke harness, validation design, decision report and next steps delivered
**Plans**: 2 plans completed on active surface

Seed artifacts:
- `.planning/archive/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb-seed/1000-CONTEXT.md`
- `.planning/archive/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb-seed/1000-RESEARCH.md`
- `.planning/archive/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb-seed/1000-01-PLAN.md`
- `.planning/archive/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb-seed/1000-02-PLAN.md`

Failure rehearsal:
- 如果官方 Node 支持仅停留在不适合当前 CLI/runtime 的模式，或需要引入高摩擦运行条件，必须输出 No-Go / delay，而不是继续承诺实现适配器。

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. ArcadeDB Evaluation | post-v1.4 | 2/2 | Complete | 2026-03-28 |
