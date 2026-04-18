# Roadmap: CodeMap

## Milestones

- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)
- ✅ **v1.3 Kùzu-only 收敛与高信号债务清理** — Phases 13-16 (shipped 2026-03-24)
- ✅ **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (shipped 2026-03-26)
- ✅ **post-v1.4 ArcadeDB Node feasibility follow-up** — Phase 21 (completed 2026-03-28)
- ⏹ **v1.5 Isolated ArcadeDB Server-backed Prototype** — Phases 22-24 (closed 2026-04-18; user explicitly dropped further Docker / ArcadeDB continuation)
- ✅ **v1.6 CodeMap CLI dogfood reliability hardening** — Phase 25 (completed 2026-04-18)

## Overview

2026-04-18 起，active planning surface 不再继续 Docker / ArcadeDB 路线。用户已明确要求：**从 Phase 25 开始视为新版本，Phase 22-24 的未完成事项不再继续处理**。

因此当前 roadmap 的真实边界是：

- `v1.5` 保留为历史分支，只做记录，不再作为待续工作
- `v1.6` 从 `Phase 25` 起算，聚焦 Agent-facing CLI reliability / JSON contract / docs truth
- 未来若要继续新工作，必须另开新 phase 或新 milestone，不能自动回跳到 `Phase 22-24`

## Archived Milestone Detail

- `v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/v1.4-ROADMAP.md`、`.planning/milestones/v1.4-REQUIREMENTS.md`、`.planning/milestones/v1.4-MILESTONE-AUDIT.md`
- `post-v1.4` roadmap / requirements / audit 已归档到 `.planning/milestones/post-v1.4-ROADMAP.md`、`.planning/milestones/post-v1.4-REQUIREMENTS.md`、`.planning/milestones/post-v1.4-MILESTONE-AUDIT.md`
- `v1.5` 的历史上下文保留在 `.planning/milestones/v1.5-phases/22-real-arcadedb-server-live-smoke-gate/`、`.planning/phases/23-*`、`.planning/phases/24-*`；这些工件仅供追溯，不再构成 active backlog
- dormant seed 来源：`.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md`

## v1.6 CodeMap CLI dogfood reliability hardening

## Phases

- [x] **Phase 25: CodeMap CLI dogfood reliability hardening** - 收敛 2026-04-17 dogfood 发现的 `analyze find` 静默失败、扫描配置偏差与 JSON 诊断缺口

### Phase 25: CodeMap CLI dogfood reliability hardening
**Goal**: 基于 `docs/exec-plans/completed/2026-04-17-eatdogfood-codemap-cli.md` 修复 `analyze -i find` 的静默失败风险，并把短期/中期/长期建议收敛成可验证的 CLI 契约改进
**Depends on**: `docs/exec-plans/completed/2026-04-17-eatdogfood-codemap-cli.md`
**Requirements**: `P25-SC1`、`P25-SC2`、`P25-SC3`、`P25-SC4`、`P25-SC5`、`P25-DOGFOOD-COMPLEXITY`、`P25-DOGFOOD-CI-RISK`、`P25-DOGFOOD-WORKFLOW`、`P25-DOCS`
**Success Criteria** (what must be TRUE):
  1. `analyze -i find -k SourceLocation --json --structured` 这类底层扫描失败场景不再伪装成可信的 0 结果，必须返回显式 warning / failure / `partialFailure` 诊断之一
  2. `analyze find` 的 include/exclude 与 TypeScript 解析策略经过核对，不能绕开 `generate/query` 已使用的配置感知扫描边界
  3. JSON 消费方只读 stdout 时，也能区分“真实 0 命中”和“扫描链路部分失败”
  4. 相邻 dogfood CLI 契约缺口（`complexity -f --json`、`ci assess-risk --json`、`workflow start --json`）被收口为稳定机器输出或显式状态 truth
  5. 若 CLI 输出契约、默认推荐路径或 AI 使用模式发生变化，必须同步更新 `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md` 或明确写出无需更新原因
  6. `rtk` 只作为 token 节省/命令包装工具处理，不进入 CodeMap 产品依赖、功能说明或修复范围
**Status**: Complete on 2026-04-18 after verification; all 3 plans passed
**Plans**: 3 plans across 3 waves

Failure rehearsal:
- 如果底层 scanner 报错但命令仍以 `confidence.score = low`、`resultCount = 0` 形式成功返回，且 JSON 中没有可机读失败信号，本 milestone 必须判定失败。

## v1.5 Isolated ArcadeDB Server-backed Prototype

**Status:** Closed on 2026-04-18 by explicit user direction
**Reason:** Docker / ArcadeDB 不再属于当前版本规划
**Historical note:** 22-24 的 phase 工件保留以便追溯，但不再继续执行、补齐或解 blocker

## Phases

- [ ] **Phase 22: Real ArcadeDB server live smoke gate** - closed without continuation
- [ ] **Phase 23: Isolated prototype evidence & blast-radius pack** - dropped with v1.5 closure
- [ ] **Phase 24: Continue/Pause/Close decision package** - dropped with v1.5 closure

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 22. Live smoke gate | v1.5 | 2/2 | Closed | — |
| 23. Evidence & blast radius | v1.5 | 0/0 | Dropped | — |
| 24. Decision package | v1.5 | 0/0 | Dropped | — |
| 25. CLI dogfood hardening | v1.6 | 3/3 | Complete | 2026-04-18 |

## Current Routing Rule

- 不要再把 `Phase 22-24` 当成待恢复 blocker 或默认下一步
- `Phase 25` 是 `v1.6` 的起点与已完成交付，不再挂靠 `v1.5`
- 新工作需要新的 milestone / phase scope，而不是回补已关闭版本
