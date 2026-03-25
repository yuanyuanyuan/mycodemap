# Roadmap: CodeMap

## Milestones

- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)
- ✅ **v1.3 Kùzu-only 收敛与高信号债务清理** — Phases 13-16 (shipped 2026-03-24)
- 🟡 **v1.4 设计契约与 Agent Handoff** — Phases 17-20 (in progress 2026-03-25)

## Overview

`v1.4` 选择“人类设计 → AI 执行”的桥接主线，而不是立即打开 HTTP API、Kùzu 性能优化或泛化 workflow 编排。执行顺序按风险从高到低收敛：先定义 design contract 输入面并修复已观察到的 workflow docs drift → 再建立 design-to-code scope mapping → 再生成稳定的 handoff package 与人类审批边界 → 最后把 design drift verification 与 docs/CI guardrail 固定下来。

## Phases

- [x] **Phase 17: Design Contract Surface** - 定义设计输入契约、loader/diagnostics，并修复 workflow docs drift 入口问题
- [ ] **Phase 18: Design-to-Code Mapping** - 将 design contract 映射到代码范围、依赖、测试与风险
- [ ] **Phase 19: Handoff Package & Human Gates** - 生成 agent handoff 产物并保留人类审批边界
- [ ] **Phase 20: Design Drift Verification & Docs Sync** - 固化设计验收映射、漂移检测与文档/CI 护栏

## Phase Details

### Phase 17: Design Contract Surface
**Goal**: 建立一个清晰、可验证、可被 AI 直接消费的 design contract 输入面，并先修复会污染新能力信任度的 workflow docs drift
**Depends on**: Phase 16 (v1.3 shipped)
**Requirements**: DES-01, DES-02, DES-03
**Success Criteria** (what must be TRUE):
  1. 人类可以用明确文件格式表达目标、约束、验收标准和非目标，而不是只靠自由提示词
  2. design contract 缺字段、字段歧义或结构错误时，CLI 返回结构化 diagnostics，而不是隐式猜测
  3. `README.md` / `AI_GUIDE.md` / `docs/ai-guide/PATTERNS.md` 与 workflow / new surface 的真实语义保持一致
**Plans**: 3 plans
**Completed**: 2026-03-25 (execute + verify-work)

Plans:
- [x] 17-01: 定义 design contract schema、类型与产物路径约定
- [x] 17-02: 实现 loader / validator / diagnostics baseline
- [x] 17-03: 同步 README / AI docs / rules / guardrails，并修复 workflow docs drift

### Phase 18: Design-to-Code Mapping
**Goal**: 让 CodeMap 能把设计意图映射到真实代码范围，而不是只返回分散的搜索结果
**Depends on**: Phase 17
**Requirements**: MAP-01, MAP-02, MAP-03
**Success Criteria** (what must be TRUE):
  1. design contract 能解析出 candidate files / modules / symbols，并给出原因链
  2. 输出同时包含 dependencies、test impact、risk、confidence 与 unknowns，足以支持人类 review
  3. 无匹配、过宽命中或高风险范围会被显式阻断并要求人类补充设计
**Plans**: 3 plans

Plans:
- [ ] 18-01: 基于现有 `query` / `analyze` / `impact` 组合构建 scope resolver
- [ ] 18-02: 丰富映射结果的 dependency / test / risk / unknowns 元数据
- [ ] 18-03: 固定 no-match / over-broad / high-risk 失败语义与测试夹具

### Phase 19: Handoff Package & Human Gates
**Goal**: 产出一份既能给人类审核，也能给 AI agent 直接执行的 handoff package，同时不破坏现有 public contract
**Depends on**: Phase 18
**Requirements**: HOF-01, HOF-02, HOF-03, HOF-04
**Success Criteria** (what must be TRUE):
  1. handoff package 同时提供 human-readable summary 与 machine-readable JSON
  2. approvals、assumptions、open questions 在 handoff artifact 中持久可追踪
  3. 新能力不通过给 `analyze` 增加新 intent 或给 `workflow` 恢复 `commit` / `ci` phase 来偷渡实现
**Plans**: 3 plans

Plans:
- [ ] 19-01: 定义 handoff artifact schema、summary 模板与输出路径
- [ ] 19-02: 实现 handoff generation 与 approval / assumption / open-question 追踪
- [ ] 19-03: 在不破坏 `workflow` 四阶段语义的前提下集成 handoff 入口

### Phase 20: Design Drift Verification & Docs Sync
**Goal**: 把 design contract 的验收标准真正接入验证链路，并用 docs / CI guardrail 固定新的协作模式
**Depends on**: Phase 19
**Requirements**: VAL-04, DOC-07, VAL-05
**Success Criteria** (what must be TRUE):
  1. design contract 的 acceptance criteria 能映射为实现后验证清单和 drift 报告
  2. README / AI docs / rules / guardrail tests 与 new handoff surface 完整同步
  3. 至少一个 end-to-end 示例证明“人类设计 → handoff → AI 执行准备 → drift 验证”闭环，并覆盖失败预演
**Plans**: 3 plans

Plans:
- [ ] 20-01: 实现 design-vs-implementation drift 检查与 acceptance checklist
- [ ] 20-02: 将 design docs / handoff docs sync 校验接入 CI / must-pass 验证
- [ ] 20-03: 编写端到端示例、失败预演与 milestone audit 证据

## Progress

## Backlog

> Archived: `Phase 999.1` 已于 2026-03-25 从 active planning surface 归档至 `.planning/archive/phases/999.1-kuzu-primary-storage/`，不再参与主线 progress 路由。

### Phase 1000: Evaluate FalkorDB as alternative to KùzuDB (BACKLOG RESEARCH)

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Archived decision from Phase 999.1
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 1000 to break down)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 17. Design Contract Surface | v1.4 | 3/3 | Complete | 2026-03-25 |
| 18. Design-to-Code Mapping | v1.4 | 0/3 | Planned | — |
| 19. Handoff Package & Human Gates | v1.4 | 0/3 | Planned | — |
| 20. Design Drift Verification & Docs Sync | v1.4 | 0/3 | Planned | — |
| 1000. FalkorDB Evaluation | Backlog | 0/0 | Context only | — |
