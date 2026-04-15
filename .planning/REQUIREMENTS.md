# Requirements: v1.5 Isolated ArcadeDB Server-backed Prototype

**Defined:** 2026-03-30
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Latest Completed Follow-up:** `post-v1.4 ArcadeDB Node feasibility follow-up`
**Archive Reference:** `.planning/milestones/post-v1.4-REQUIREMENTS.md`
**Seed Reference:** `.planning/seeds/SEED-001-evaluate-isolated-arcadedb-server-backed-prototype.md`

## Active Requirements

### Live Smoke Gate

- [ ] **PROTO-01**: 可达的 ArcadeDB server 必须能通过 isolated live smoke，且 env / auth / TLS 前置条件被明确记录

### Evidence & Isolation

- [ ] **PROTO-02**: 只有在 live smoke 成功后，才允许记录 `handshake latency`、`query latency` 与 `setup complexity`
- [ ] **PROTO-03**: 实验必须保持在 isolated prototype surface，不得新增 `storage.type = arcadedb`、public config schema 或 shipped runtime integration

### Approval & Decision

- [ ] **PROTO-04**: `remote config`、`auth`、`TLS`、`lifecycle`、`docs/runtime guidance` 的 blast radius 必须被量化，并作为显式审批输入
- [ ] **PROTO-05**: milestone 必须产出 evidence-backed `continue / pause / close` 决策与明确 next steps / stop conditions

## Constraints

| Boundary | Why |
|----------|-----|
| 先跑真实 live smoke，再谈 benchmark 或继续 prototype | 没有 live smoke，任何性能数字都是占位噪音 |
| prototype 不得先改 `StorageType` / `StorageFactory` / public schema | 当前 milestone 目标是验证隔离路线，不是偷渡实现 |
| `Phase 21` 的 direct replacement `NO-GO` 不得被回滚为默认前提 | 否则会重复已经被证伪的错误假设 |
| `remote config` / `auth` / `TLS` / `lifecycle` / `docs` 必须视为产品面变化 | 这些不是 adapter 内部细节，必须先显式审批 |

## Failure Rehearsal

- **风险模式 1**: 没有真实 ArcadeDB server 或凭证/TLS 条件不成立，却继续输出“后续应该 benchmark”的乐观计划
- **风险模式 2**: 为了让 smoke 跑通，先修改 `storage.type`、config schema 或 runtime wiring，导致证据和产品面耦合
- **风险模式 3**: live smoke 尚未稳定就记录性能数字，把 placeholder benchmark 伪装成决策依据
- **风险模式 4**: setup friction / docs cost 被低估，最后把“实验脚本可跑”错当成“用户可用”

## Deferred

- **PROD-01**: 若 isolated prototype 证明价值，再单独评估是否值得开启正式 backend productization milestone
- **MIG-01**: 若未来真要推进 backend，才评估从 KùzuDB 迁移的数据与兼容策略
- **API-01**: 是否重新考虑 `mycodemap server` / HTTP API 产品面，必须在 storage 路线明确后另开 milestone
- **OPS-01**: durability、observability、deployment hardening 等运维议题不属于当前 prototype milestone

## Out of Scope

| Feature | Reason |
|---------|--------|
| 直接实现 `ArcadeDBStorage` 并宣称可替代 `KuzuDBStorage` | `post-v1.4` 已明确 direct replacement `NO-GO` |
| 提前修改 `mycodemap.config.json`、storage schema 或 `StorageFactory` public contract | 会在证据不足前扩大 blast radius |
| 没有 live smoke 就发布 benchmark / latency claim | 会把占位数据误包装成正式结论 |
| 将 isolated experiment script 直接纳入 shipped runtime | 会污染当前 `filesystem` / `memory` / `kuzudb` / `auto` surface |
| 为 prototype 顺手重开公共 HTTP API / workflow orchestration | 与当前 milestone 的核心价值无关 |

## Traceability

| Requirement | Phase | Status | Notes |
|-------------|-------|--------|-------|
| PROTO-01 | Phase 22 | Pending | 真实 server live smoke 是第一阻断门，失败则 milestone 可直接停在证据收尾 |
| PROTO-02 | Phase 23 | Pending | benchmark 只能在 live smoke 成功后记录，且必须包含 `handshake/query/setup` 三维 |
| PROTO-03 | Phase 23 | Pending | prototype 必须保持 isolated，不得改 shipped storage/runtime contract |
| PROTO-04 | Phase 23 | Pending | config/auth/TLS/lifecycle/docs blast radius 先量化，再进入审批输入 |
| PROTO-05 | Phase 24 | Pending | 最终必须输出 `continue / pause / close` 决策，而不是含糊 optimism |

**Coverage:**
- Active requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after starting v1.5 milestone*
