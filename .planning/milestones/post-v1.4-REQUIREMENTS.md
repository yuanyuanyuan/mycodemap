# Requirements Archive: post-v1.4 ArcadeDB Node feasibility follow-up

**Archived:** 2026-03-28
**Status:** SHIPPED

For current requirements, see `.planning/REQUIREMENTS.md`.

---

# Requirements: post-v1.4 ArcadeDB Node feasibility follow-up

**Defined:** 2026-03-27
**Core Value:** 在不破坏已交付 design chain 与现有 storage public surface 的前提下，为下一步 backend 路线提供可信的 Go/No-Go 决策。
**Latest Shipped Milestone:** `v1.4 设计契约与 Agent Handoff`
**Archive Reference:** `.planning/milestones/v1.4-REQUIREMENTS.md`

## Active Requirements

### Phase 21 — ArcadeDB Storage Backend Feasibility

- [x] **ARC-01**: 核实 ArcadeDB 对 Node.js 的官方接入面，明确 embedded、HTTP/JSON、Bolt 等模式的支持边界
- [x] **ARC-02**: 定义不污染当前 public storage surface 的最小实验路径，并明确所需环境、凭证与运行方式
- [x] **ARC-03**: 量化若将 ArcadeDB 提升为正式 backend 需要修改的配置、CLI、schema、文档与 fallback blast radius
- [x] **ARC-04**: 基于官方支持拓扑设计 smoke validation / benchmark strategy，禁止占位式性能结论
- [x] **ARC-05**: 产出带证据的 Go/No-Go 决策与后续 phase 建议

## Constraints

| Boundary | Why |
|----------|-----|
| 先验证官方支持面，再谈适配器实现 | 防止把未经证实的 Node 能力伪装成正式路线 |
| 不得先改 `StorageType` / `StorageFactory` / schema | 当前 phase 是 feasibility，不是 implementation |
| 不得污染已交付 `design validate → map → handoff → verify` public chain | `v1.4` 已 shipped，follow-up 不能反向破坏已交付边界 |
| 任何 benchmark 结论都必须绑定真实拓扑与运行前提 | 占位式性能结论会误导下一 milestone scope |

## Failure Rehearsal

- **风险模式 1**: 误把社区/非官方 Node 适配器当成官方支持面，导致结论建立在错误前提上
- **风险模式 2**: 先改配置和 CLI，再去验证可行性，结果把 blast radius 提前扩散到主路径
- **风险模式 3**: 只跑单机 happy path 或空 benchmark，就给出“ArcadeDB 更好”的结论

## Deferred

- **API-01**: 在 storage backend 路线明确后，再单独评估是否需要独立 HTTP API 产品面
- **OPT-01**: 基于 Kùzu-native 图查询进一步优化 callers / cycles / impact 的性能与查询计划
- **WKF-01**: 若未来确实需要多角色、多阶段的工程编排，再单独开 milestone 设计完整 workflow 产品面
- **INT-01**: 若 design contract 模式继续扩展，再评估 Figma / issue tracker / PR system 等外部设计输入集成

## Out of Scope

| Feature | Reason |
|---------|--------|
| 直接实现完整 `ArcadeDBStorage` 并宣称可替代 `KuzuDBStorage` | 当前 phase 先做 feasibility，不做正式 backend 实现 |
| 提前修改 `mycodemap.config.json`、storage schema 或 `StorageFactory` public contract | 会在证据不足前扩大 blast radius |
| 重新公开 `mycodemap server` / HTTP API 产品面 | 与当前 follow-up 的 storage 决策不直接相关 |
| 回头重开 `neo4j` 或跳去做 Kùzu 性能优化 | 会打断已批准的 `Phase 21` 主线 |
| 把 `workflow` 再扩成执行/发布编排器 | 与当前 phase 的用户价值无关 |

## Traceability

| Requirement | Phase | Status | Notes |
|-------------|-------|--------|-------|
| ARC-01 | Phase 21 | Satisfied | `21-EVIDENCE.md` 固化 `embedded / HTTP/JSON / Bolt` 官方支持矩阵 |
| ARC-02 | Phase 21 | Satisfied | `arcadedb-http-smoke.mjs` 与 `21-VALIDATION-DESIGN.md` 定义了不污染 public surface 的最小实验路径与 env contract |
| ARC-03 | Phase 21 | Satisfied | `21-BLAST-RADIUS.md` 量化了配置、schema、docs、runtime 与 fallback blast radius |
| ARC-04 | Phase 21 | Satisfied | `21-VALIDATION-DESIGN.md` 记录 smoke / benchmark strategy 与 stop conditions |
| ARC-05 | Phase 21 | Satisfied | `21-EVALUATION-REPORT.md` 与 `21-NEXT-STEPS.md` 给出 evidence-backed `NO-GO / CONDITIONAL` 决策与 follow-up 路线 |

**Coverage:**
- Active requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-28 after completing Phase 21 UAT closure*
