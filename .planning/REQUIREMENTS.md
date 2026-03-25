# Requirements: v1.4 设计契约与 Agent Handoff

**Defined:** 2026-03-25
**Core Value:** 人类负责设计决策，AI 在明确设计契约和代码上下文约束下稳定产出实现范围与验证边界。
**Latest Shipped Milestone:** `v1.3 Kùzu-only 收敛与高信号债务清理`

## v1.4 Requirements

### Design Contract Surface

- [ ] **DES-01**: 人类可以通过受文档约束的 design contract 文件描述 feature goal、constraints、acceptance criteria 与 explicit exclusions
- [ ] **DES-02**: CLI / loader 会验证 design contract 的必填字段、格式错误与歧义输入，并返回机器可读 diagnostics
- [ ] **DES-03**: design contract 的示例、字段说明与 guardrail fixtures 同步写入 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*` 与 `docs/rules/*`

### Design-to-Code Mapping

- [ ] **MAP-01**: CodeMap 能基于 design contract 中的目标、关键词与范围边界，输出 candidate files / modules / symbols
- [ ] **MAP-02**: 映射结果必须包含 confidence、dependencies、test impact、risk 与 unknowns，而不是只给文件列表
- [ ] **MAP-03**: 当设计描述过宽、无匹配或命中过多高风险文件时，系统返回显式“需要人类补充设计”诊断，而不是继续假装可以规划

### Handoff Package

- [ ] **HOF-01**: 系统能生成面向人类审核的 handoff summary，包含目标、范围、非目标、风险、验证清单与 open questions
- [ ] **HOF-02**: 系统能生成 machine-readable handoff JSON，供 AI agent 直接消费 touched files、constraints、tests、approvals 与 assumptions
- [ ] **HOF-03**: approved decisions / assumptions / open questions 在 handoff artifact 中可追踪，避免多轮 agent 执行后语义漂移
- [ ] **HOF-04**: handoff 能力不得通过扩写 `analyze` intent 或恢复 `workflow` 的 `commit` / `ci` phase 来实现；必须保持既有 public contract 稳定

### Verification & Drift Control

- [ ] **VAL-04**: CodeMap 能把 design contract 的 acceptance criteria 映射为验证清单，并在实现后输出 design-vs-implementation drift 报告
- [ ] **DOC-07**: `README.md`、`AI_GUIDE.md`、`docs/ai-guide/PATTERNS.md`、`docs/rules/*` 与 guardrail tests 必须反映真实 workflow 和新 handoff surface，并修复当前 workflow stage drift
- [ ] **VAL-05**: 至少覆盖 3 类失败模式：缺失 design sections、scope 无匹配/过宽、handoff 与 docs / command contract 失 sync

## v2 Requirements

### Deferred

- **API-01**: 在 design contract / handoff surface 稳定后，再单独评估是否需要独立 HTTP API 产品面
- **OPT-01**: 基于 Kùzu-native 图查询进一步优化 callers / cycles / impact 的性能与查询计划
- **WKF-01**: 若未来确实需要多角色、多阶段的工程编排，再单独开 milestone 设计完整 workflow 产品面
- **INT-01**: 若 design contract 模式被验证，再评估 Figma / issue tracker / PR system 等外部设计输入集成

## Out of Scope

| Feature | Reason |
|---------|--------|
| 让 CodeMap 直接自动写代码并提交 | 当前目标是设计交接与执行边界，不是 autonomous executor |
| 把 `workflow` 重新扩成 `find/read/link/show/commit/ci` 六阶段 | 这会重开已经收口的 public contract 漂移 |
| 设计编辑器 / 白板 / 实时协作 UI | 会把产品焦点从代码地图拉向设计工具 |
| 重新公开 `mycodemap server` / HTTP API 产品面 | 与当前 milestone 的用户价值不直接相关 |
| 优先做 Kùzu 性能优化或恢复 `neo4j` | 属于其他候选路线，不是本 milestone 主线 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DES-01 | Phase 17 | Pending |
| DES-02 | Phase 17 | Pending |
| DES-03 | Phase 17 | Pending |
| MAP-01 | Phase 18 | Pending |
| MAP-02 | Phase 18 | Pending |
| MAP-03 | Phase 18 | Pending |
| HOF-01 | Phase 19 | Pending |
| HOF-02 | Phase 19 | Pending |
| HOF-03 | Phase 19 | Pending |
| HOF-04 | Phase 19 | Pending |
| VAL-04 | Phase 20 | Pending |
| DOC-07 | Phase 20 | Pending |
| VAL-05 | Phase 20 | Pending |

**Coverage:**
- v1.4 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after defining v1.4 milestone*
