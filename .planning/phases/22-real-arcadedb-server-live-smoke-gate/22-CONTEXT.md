# Phase 22: Real ArcadeDB server live smoke gate - Context

**Gathered:** 2026-03-30
**Status:** Ready for execution
**Source:** Roadmap Phase 22 goal + `PROTO-01` + `22-RESEARCH.md` + `22-VALIDATION.md` + `21-VALIDATION-DESIGN.md` + `scripts/experiments/arcadedb-http-smoke.mjs`

<domain>
## Phase Boundary

本阶段只回答一个基础设施问题：**真实 ArcadeDB server 能否在当前 isolated experiment seam 下完成 live smoke，并把 env / auth / TLS / setup 前置条件记录成可审计 gate。**

因此本阶段只允许交付：
1. 最小 `CONTEXT` / runbook / gate checklist；
2. 真实 live smoke 的执行证据；
3. 单一 gate result：`pass`、`blocked` 或 `fail`。

本阶段**不**扩写 shipped `storage.type`、**不**修改 public config/schema、**不**引入 shipped runtime integration、**不**提前开始 benchmark / latency 叙事。

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
- All implementation choices are at the agent's discretion — pure infrastructure phase.
- 所有执行都必须停留在 `.planning/phases/22-*` 与 `scripts/experiments/` 的隔离边界内；不得为了 smoke 成功而改 shipped runtime/config surface。

</decisions>

<specifics>
## Specific Ideas

- No additional grey-area requirements — infrastructure phase.
- 真实执行入口固定为 `scripts/experiments/arcadedb-http-smoke.mjs`，而不是新增第二套临时 smoke harness。
- 如果缺失 reachable server、credentials、database 或 TLS 前提，本阶段应诚实输出 `blocked` / `fail`，而不是乐观推进到 `Phase 23`。

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/22-real-arcadedb-server-live-smoke-gate/22-RESEARCH.md`
- `.planning/phases/22-real-arcadedb-server-live-smoke-gate/22-VALIDATION.md`
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md`
- `scripts/experiments/arcadedb-http-smoke.mjs`
- `src/interface/types/storage.ts`
- `src/infrastructure/storage/StorageFactory.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/experiments/arcadedb-http-smoke.mjs` 已经固定了 `/api/v1/command/{database}` + `Authorization: Basic` 的 smoke contract。
- `21-VALIDATION-DESIGN.md` 已定义 Phase 22 应继承的 env contract、最小 smoke checks 与 stop conditions。
- `src/interface/types/storage.ts` 与 `src/infrastructure/storage/StorageFactory.ts` 证明当前 shipped storage surface 仍只支持 `filesystem` / `kuzudb` / `memory` / `auto`，没有 ArcadeDB public contract。

### Established Patterns
- 先把 gate 规则写死，再做真实执行，防止把 blocked/fail 包装成“部分成功”。
- experiment seam 必须与 shipped runtime 解耦；任何需要 public-surface change 的 smoke 都属于失败证据。

### Integration Points
- 本 phase 的合法落点只有 `.planning/phases/22-real-arcadedb-server-live-smoke-gate/` 与 `scripts/experiments/arcadedb-http-smoke.mjs` 的调用验证。
- `Phase 23` 只有在 `Gate outcome: pass` 时才允许解锁。

</code_context>

<deferred>
## Deferred Ideas

- benchmark / latency / setup complexity 的正式记录
- remote config / auth / TLS / lifecycle / docs 的完整 blast-radius 审批包
- `storage.type = arcadedb`、public schema、runtime wiring 或迁移策略

</deferred>

---

*Phase: 22-real-arcadedb-server-live-smoke-gate*
*Context gathered: 2026-03-30*
