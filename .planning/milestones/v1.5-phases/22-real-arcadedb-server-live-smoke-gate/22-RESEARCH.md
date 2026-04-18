# Phase 22: Real ArcadeDB server live smoke gate - Research

**Researched:** 2026-03-30
**Domain:** Real ArcadeDB server live smoke gate for an isolated prototype seam
**Confidence:** HIGH

<user_constraints>
## User Constraints (from ROADMAP / REQUIREMENTS / STATE)

### Locked Decisions
- `Phase 22` 只回答 `PROTO-01`：真实 ArcadeDB server 是否能通过 isolated live smoke，以及 env / auth / TLS 前置条件是否被明确记录。
- 没有真实 server live smoke，就不能偷跑到 benchmark、latency 或 productization；这些属于后续 `Phase 23` / `Phase 24`。
- 任何执行都必须保持在 isolated experiment surface；不得新增 `storage.type = arcadedb`、public config schema 或 shipped runtime integration。
- 若缺失可达 server、credentials、TLS 前提，或者 smoke 需要先改 public surface 才能跑通，`Phase 22` 必须允许输出 `blocked` / `fail`，而不是伪造通过。
- 必须至少预演一个失败模式，尤其是：无可达 server、Basic auth 失败、TLS/证书前提不满足、或 endpoint/schema 与 `scripts/experiments/arcadedb-http-smoke.mjs` 假设不一致。

### the agent's Discretion
- `Phase 22` artifact 的精确命名，只要能把 preflight、evidence、gate result 拆清楚
- 是否需要微调 experiment 文档或脚本说明，只要不把 experiment seam 变成产品面
- evidence 记录的脱敏粒度，只要不泄露 credentials 且足以支持后续决策

### Deferred Ideas (OUT OF SCOPE)
- `handshake latency` / `query latency` / `setup complexity` 的正式记录
- `remote config` / `auth` / `TLS` / `lifecycle` 的完整 blast-radius 审批包
- `storage.type = arcadedb`、schema 字段、runtime wiring 或迁移策略
- 公共 HTTP API / server 产品面、运维 hardening、production deployment

</user_constraints>

<research_summary>
## Summary

第一个结论是：**`Phase 22` 的核心不是“再发明一个新脚本”，而是把 `Phase 21` 已经定义好的 isolated smoke seam，升级为一个真正能做 Go/No-Go gate 的 live smoke 证据包。** `Phase 21` 已经给出了固定的 smoke 前置条件：`ARCADEDB_HTTP_URL`、`ARCADEDB_DATABASE`、`ARCADEDB_USERNAME`、`ARCADEDB_PASSWORD`，以及 `node --check` / `--help` / live smoke 命令三段验证路径。因此 `Phase 22` 不该重新讨论“用什么协议”，而应该直接基于现有 seam 验证真实 server 条件是否成立。来源：`.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md`

第二个结论是：**当前 experiment script 已足够作为 live smoke gate 的执行入口，但还不等于“证据已经成立”。** `scripts/experiments/arcadedb-http-smoke.mjs` 已明确 `Authorization: Basic ...`、`/api/v1/command/{database}` 与默认 Cypher 查询；它能离线跑 `--help`，也能在 env 齐全时尝试真实请求。但脚本只负责执行，不负责判断这个结果对 milestone 是否意味着“继续 / 停下”。因此 `Phase 22` 需要单独的 runbook、evidence 和 gate-result artifact，而不是把 stdout 当成最终结论。来源：`scripts/experiments/arcadedb-http-smoke.mjs`

第三个结论是：**最容易出错的地方不是 HTTP 调用本身，而是把外部前置条件伪装成“内部小修小补”。** 当前 storage contract 仍然只支持 `filesystem / kuzudb / memory / auto`，没有任何 remote/server-backed 字段；如果 live smoke 需要先改 config schema、runtime selection、或者 shipped error handling，说明这条路在 `Phase 22` 就已经触发 stop condition。换句话说，Phase 22 必须把“需要 public-surface change 才能 smoke”视为失败证据，而不是实现 TODO。来源：`src/interface/types/storage.ts`、`src/infrastructure/storage/StorageFactory.ts`

第四个结论是：**`Phase 22` 适合拆成两波，而不是一口气写成“去跑 smoke 然后看结果”。** Wave 1 先固化 runbook 和 gate rubric，让执行者清楚什么是 pass / blocked / fail，以及哪些信息必须脱敏记录；Wave 2 再执行 live smoke、收集证据、并输出 gate result。这样做的好处是：即使最终没有真实 server，Wave 1 仍然能交付清晰的失败前提，而不是让整个 phase 停留在口头假设。  

**Primary recommendation:**  
1. `22-01-PLAN.md` 先交付 `22-LIVE-SMOKE-RUNBOOK.md` 与 `22-GATE-CHECKLIST.md`，把 env/auth/TLS 前置条件、执行命令、脱敏规则、以及 `pass / blocked / fail` 判定写死；  
2. `22-02-PLAN.md` 再执行真实 smoke，并输出 `22-LIVE-SMOKE-EVIDENCE.md` 与 `22-GATE-RESULT.md`，要求结果只能是 `pass`、`blocked` 或 `fail` 之一；  
3. 若 `22-GATE-RESULT.md` 不是 `pass`，下一 phase 不得继续采集 benchmark 或讨论产品化。  
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `scripts/experiments/arcadedb-http-smoke.mjs` | 唯一允许的 live smoke 执行入口 | 已被 `Phase 21` 明确隔离在 experiment seam |
| `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md` | 现有 smoke contract / stop conditions | 定义了真实 live smoke 的合法前置条件 |
| `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-NEXT-STEPS.md` | follow-up boundary | 明确下一步只允许 isolated server-backed prototype |
| `src/interface/types/storage.ts` | storage public contract truth | 用于证明 Phase 22 不能修改 shipped surface |
| `src/infrastructure/storage/StorageFactory.ts` | runtime selection truth | 用于识别任何“要先改 runtime 才能 smoke”的错误前提 |

### Supporting
| Tool / Module | Purpose | When to Use |
|---------------|---------|-------------|
| `.planning/ROADMAP.md` | phase goal / success criteria | 确保计划只覆盖 `PROTO-01` |
| `.planning/REQUIREMENTS.md` | requirement / constraint / failure rehearsal | 用于派生 gate rubric |
| `.planning/STATE.md` | blockers / current focus | 记录外部依赖风险 |
| `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVALUATION-REPORT.md` | `NO-GO / CONDITIONAL` baseline | 防止错误回退到 direct replacement 叙事 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 两波 gate planning | 单 plan “跑完再说” | 更快，但容易把 blocked/fail 情况写成模糊结果 |
| 独立 evidence + gate result artifact | 只保留脚本 stdout | 可执行但不可审计，后续 Phase 23 无法安全承接 |
| 失败即停的 gate 语义 | 一边 blocked 一边继续 benchmark 规划 | 会把外部依赖缺口伪装成进展 |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Live smoke is a gate, not a demo
**What:** 把真实 server smoke 定义为 `pass / blocked / fail` gate，而不是只要脚本跑了就算完成。  
**Why:** `Phase 22` 的价值是决策，不是连通性表演。  
**Evidence:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`

### Pattern 2: Experiment seam must remain isolated
**What:** 所有 execution artifacts 都停留在 `.planning/phases/22-*` 和 `scripts/experiments/`。  
**Why:** 否则会提前污染 shipped storage/runtime surface。  
**Evidence:** `scripts/experiments/arcadedb-http-smoke.mjs`, `src/interface/types/storage.ts`

### Pattern 3: External preconditions are first-class evidence
**What:** 将 reachable server、credentials、TLS、auth mode、database existence 明确写入 runbook 与 evidence。  
**Why:** 这些条件决定 smoke 是否真实成立，不能当成“环境小问题”略过。  
**Evidence:** `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md`

### Anti-Patterns to Avoid
- 把 `--help` 或离线脚本检查误写成“live smoke succeeded”
- 为了通过 smoke 去改 `StorageType`、config schema 或 runtime fallback
- 在没有真实 server / credentials 时继续输出 optimistic pass
- 用未脱敏日志泄露 endpoint、username、password 或 token
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 把“没有环境”写成“以后再补”
**Failure mode:** 没有 server 或 credentials，却仍把 Phase 22 标成 ready for Phase 23。  
**Impact:** 后续 benchmark 和 approval work 建立在空前提上。

### Pitfall 2: 让 public-surface change 成为 smoke 前提
**Failure mode:** 先改 schema / runtime 才能调用 experiment。  
**Impact:** prototype gate 被偷换成 productization。

### Pitfall 3: 只保存成功路径，不保存失败诊断
**Failure mode:** blocked/fail 只出现在终端，不进入 phase artifact。  
**Impact:** reviewer 无法审计 stop reason，也无法判断是否该关闭路线。
</common_pitfalls>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `rg -n "ARCADEDB_HTTP_URL|ARCADEDB_DATABASE|ARCADEDB_USERNAME|ARCADEDB_PASSWORD|Authorization: Basic|No shipped runtime/config changes" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-LIVE-SMOKE-RUNBOOK.md` — 验证 runbook 固化 env/auth/isolation contract
2. `rg -n "Gate outcome: pass|Gate outcome: blocked|Gate outcome: fail|TLS preconditions|public-surface change required" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-GATE-CHECKLIST.md` — 验证 gate rubric 明确 pass/blocked/fail 语义
3. `node --check scripts/experiments/arcadedb-http-smoke.mjs` — 验证 experiment seam 仍可执行
4. `node scripts/experiments/arcadedb-http-smoke.mjs --help` — 验证 live smoke contract 仍可离线查看
5. `rg -n "Live smoke command|Observed outcome|Sanitized endpoint|Auth mode|TLS mode|Failure reason" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-LIVE-SMOKE-EVIDENCE.md` — 验证执行证据被完整记录
6. `rg -n "Gate outcome: (pass|blocked|fail)|Next action|Phase 23 unlocked|Phase 23 blocked" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-GATE-RESULT.md` — 验证 gate result 不是模糊叙事

### Why this is enough
- 1 和 2 锁住 `PROTO-01` 的前置条件与 gate 规则
- 3 和 4 保证 experiment seam 没有因为 planning 假设而脱离现实
- 5 和 6 保证成功/失败/阻断都能被后续 phase 与 reviewer 审计
</validation_architecture>

<sources>
## Sources

### Repo
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md`
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVALUATION-REPORT.md`
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-NEXT-STEPS.md`
- `scripts/experiments/arcadedb-http-smoke.mjs`
- `src/interface/types/storage.ts`
- `src/infrastructure/storage/StorageFactory.ts`
</sources>

---
*This research document is consumed by `gsd-plan-phase` and preserves the gate boundary: prove real live smoke first, then discuss latency or productization later.*
