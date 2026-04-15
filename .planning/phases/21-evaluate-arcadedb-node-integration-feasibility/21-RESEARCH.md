# Phase 21: Evaluate ArcadeDB Node integration feasibility - Research

**Researched:** 2026-03-28
**Domain:** ArcadeDB official Node support topology vs CodeMap local-first storage surface
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `embedded` 不作为 Node.js runtime 可行路径；`HTTP/JSON` 是主实验面，`Bolt` 仅作 secondary validation。
- 当前 phase 只允许 evidence artifact、support matrix、研究文档和隔离实验脚本；不得修改 `storage.type`、config schema、public CLI 或 shipped storage adapter。
- 任何 server process、URI、database、auth、TLS、remote failure handling 都按**产品面变化**处理，不能伪装成“适配器内部细节”。
- Phase 21 必须输出 `GO` / `NO-GO` / `CONDITIONAL` 之一，且显式 `NO-GO` 是合格结果。
- 任何 benchmark 结论都必须绑定真实官方支持拓扑与实验前提；禁止 placeholder benchmark。
- 必须至少预演一个失败模式，当前最关键的是：把 embedded Java API 错当 Node SDK，或在可行性未证明前就被 `uri/auth/password` 等配置面缺口卡住。

### the agent's Discretion
- support matrix 的精确维度与最终 artifact 拆分方式
- 隔离 smoke harness 的目录与命名，只要不进入 shipped runtime
- 是否补充 PostgreSQL wire protocol 作为旁证，只要不偏离 `HTTP/JSON primary` 主路线

### Deferred Ideas (OUT OF SCOPE)
- 直接实现生产级 `ArcadeDBStorage`
- 正式公开 `storage.type = "arcadedb"` 与配套 `uri/auth/tls` 契约
- Kùzu → ArcadeDB 数据迁移或双写策略
- 基于真实服务的大规模 benchmark 跑分

</user_constraints>

<research_summary>
## Summary

第一个结论是：**`Phase 21` 的主问题不是“ArcadeDB 能不能连上”，而是“官方支持的 Node 接入拓扑，值不值得为当前 repo 打开一个新的 server-backed 产品面”。** ArcadeDB 官方 client/server 文档明确给出 HTTP/JSON 与 Bolt 作为 Node 可用协议，同时 embedded/client-server 对比表明确写出 embedded 的多语言客户端是 `JVM only`、接口是 `Java API`。这意味着原先把 ArcadeDB 想成 “KùzuDB 的 Node embedded 替代品” 的前提已经失效；后续规划不能再以 “先写 adapter 再验证” 为默认路线。来源：`https://arcadedb.com/client-server.html`、`https://arcadedb.com/embedded.html`

第二个结论是：**`HTTP/JSON` 明显比 `Bolt` 更适合作为本 phase 的主实验路径。** 原因不是 Bolt 不官方，而是 HTTP/JSON 更接近“任何有 HTTP 的语言都能直连”的最小支持面，Node 18+ 也自带 `fetch`，无需引入 Neo4j 驱动心智；而 Bolt 一旦成为主路线，就很容易把“兼容 Neo4j driver”偷换成“恢复 Neo4j 风格产品面”，这与当前 repo 对 `uri / username / password` 的明确拒绝相冲突。来源：`https://arcadedb.com/client-server.html`、[`src/cli/config-loader.ts`](src/cli/config-loader.ts)

第三个结论是：**当前 repo 对 server-backed ArcadeDB 的 blast radius 比表面看起来更大，而且已有 storage truth 漂移会进一步放大评估成本。** 代码层面，`StorageType` 仍只公开 `filesystem / kuzudb / memory`，`StorageConfig` 只允许 `outputPath / databasePath / autoThresholds`，schema 同样没有远端连接字段；更关键的是，运行时 `StorageFactory` 的 `auto` 已优先尝试 `kuzudb`，而 README 和 AI docs 还在写 “auto 保守走 filesystem”。这说明 Phase 21 不能以“当前 surface 已经完全一致”为前提做判断，必须把已有 drift 视为 blast radius baseline。来源：[`src/interface/types/storage.ts`](src/interface/types/storage.ts)、[`src/infrastructure/storage/StorageFactory.ts`](src/infrastructure/storage/StorageFactory.ts)、[`README.md`](README.md)、[`docs/ai-guide/COMMANDS.md`](docs/ai-guide/COMMANDS.md)

第四个结论是：**最小可执行路线仍然值得保留一个隔离 HTTP smoke harness，但它的定位必须是“证据工具”，不是产品代码”。** 一个只依赖 Node 内建能力、通过环境变量驱动的 `scripts/experiments/arcadedb-http-smoke.mjs`，足以验证：HTTP endpoint 是否通、认证和 database 选择参数长什么样、Node runtime 在无 driver 情况下是否能稳定打通官方路径。它不应该接入 `src/infrastructure/storage/`，也不应该提前修改 README / schema / CLI 帮助。来源：`https://arcadedb.com/client-server.html`、[`21-CONTEXT.md`](.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-CONTEXT.md)

第五个结论是：**决策输出应拆成两层：`validation design` 负责说明怎样验证，`evaluation report` 负责在证据齐备后给出单一主建议。** 否则最常见的失败是把“将来可以 benchmark”误写成“现在已经适合替代 KùzuDB”。本 phase 需要的不是高大上的 benchmark 数字，而是对 `ARC-01 ~ ARC-05` 的闭环回答：官方支持面、最小实验路径、blast radius、validation/benchmark strategy、以及 `GO/NO-GO/CONDITIONAL`。这天然对应两波计划：Wave 1 先交 support truth + blast radius + isolated harness，Wave 2 再交 validation design + evaluation report + next steps。

**Primary recommendation:**  
1. 用 `21-01-PLAN.md` 先固化 `21-EVIDENCE.md`、`21-BLAST-RADIUS.md` 和 `scripts/experiments/arcadedb-http-smoke.mjs`，明确官方支持面、现有 public surface 限制与隔离实验路径；  
2. 用 `21-02-PLAN.md` 基于 Wave 1 产物产出 `21-VALIDATION-DESIGN.md`、`21-EVALUATION-REPORT.md`、`21-NEXT-STEPS.md`，把 `ARC-04` / `ARC-05` 变成可审计文档；  
3. 在决策报告里明确主建议：**`NO-GO for direct embedded/drop-in replacement` + `CONDITIONAL for isolated server-backed follow-up`**。  
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `src/interface/types/storage.ts` | 当前 storage public contract | blast radius 评估的第一事实源 |
| `src/infrastructure/storage/StorageFactory.ts` | runtime backend selection / fallback truth | 必须量化 `auto`、fallback 与远端 backend 的冲突面 |
| `src/cli/config-loader.ts` | config parser truth | 当前显式拒绝 `uri / username / password`，直接定义 Phase 21 的产品面缺口 |
| `mycodemap.config.schema.json` | storage schema truth | 证明 server-backed backend 不是“无感新增类型” |
| `README.md` / `docs/ai-guide/COMMANDS.md` | 当前 docs narrative | 记录现有 `auto` 叙事与 runtime truth 的漂移 |
| `scripts/experiments/arcadedb-http-smoke.mjs` | 隔离 HTTP smoke harness | 最小可验证 Node path，不污染 shipped runtime |

### Supporting
| Tool / Module | Purpose | When to Use |
|---------------|---------|-------------|
| `.planning/archive/phases/1000-*/1000-RESEARCH.md` | 已证伪 embedded 假设的 seed 事实 | 继承结论，但不照搬旧 plan 的执行范围 |
| `src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` | storage fallback baseline | 防止 experiment narrative 误伤现有 storage truth |
| `docs/rules/validation.md` | 验证顺序与失败预演底线 | 约束 Phase 21 不能用占位式 benchmark 交差 |
| `https://arcadedb.com/client-server.html` | 官方 client/server 支持矩阵 | HTTP/JSON、Bolt、认证、协议能力的 primary source |
| `https://arcadedb.com/embedded.html` | 官方 embedded 定位 | `JVM languages` / `Java API` 的 primary source |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTTP/JSON primary | Bolt-first validation | 更像图数据库迁移路径，但更容易混入 Neo4j 心智与额外依赖 |
| Isolated smoke harness | 直接新增 `ArcadeDBStorage` | 看起来更“快”，但会提前污染 public surface |
| Explicit `NO-GO / CONDITIONAL` report | 只写中性研究笔记 | 风险被推迟到下一 phase，等于没有完成 feasibility |
| Blast-radius baseline with docs/runtime drift | 只统计 types/schema | 会系统性低估 storage 相关文档与 fallback 外溢成本 |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Evidence-first feasibility before implementation
**What:** 先固化官方支持矩阵、blast radius 和 stop conditions，再决定是否值得进入后续 backend phase。  
**Why:** 当前最大风险是错误前提，不是代码复杂度。  
**Evidence:** `.planning/REQUIREMENTS.md`, `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-CONTEXT.md`

### Pattern 2: Server-backed backend is a product-surface change
**What:** 把 `uri`、`database`、`username`、`password`、`protocol`、`tls`、服务进程与认证模式都算入正式产品面。  
**Why:** 这些字段当前不在 storage contract 里，新增后会外溢到 schema、docs、error handling 和 setup guide。  
**Evidence:** `src/interface/types/storage.ts`, `src/cli/config-loader.ts`, `mycodemap.config.schema.json`

### Pattern 3: Prefer the most dependency-light official path
**What:** Phase 21 以 Node 内建 HTTP 能力走 `HTTP/JSON`，只把 Bolt 作为 secondary cross-check。  
**Why:** 这样能最小化“因为引入 driver/协议栈而放大实验范围”的风险。  
**Evidence:** `https://arcadedb.com/client-server.html`

### Pattern 4: Baseline drift must be measured, not ignored
**What:** 在 `21-BLAST-RADIUS.md` 显式记录运行时 `auto -> kuzudb` 与 docs `auto -> filesystem` 的差异。  
**Why:** 如果连现有 storage truth 都漂了，后续关于 ArcadeDB 的“新增成本”就会被系统性低估。  
**Evidence:** `src/infrastructure/storage/StorageFactory.ts`, `README.md`, `docs/ai-guide/COMMANDS.md`

### Pattern 5: Decision package separates validation design from final recommendation
**What:** 先定义 `21-VALIDATION-DESIGN.md`，再写 `21-EVALUATION-REPORT.md` 和 `21-NEXT-STEPS.md`。  
**Why:** 避免把“如何验证”与“已经验证完”的语义混在一起。  
**Evidence:** `.planning/REQUIREMENTS.md`, `docs/rules/validation.md`

### Anti-Patterns to Avoid
- 把 `embedded` 写成 Node 可行路径
- 因为 Bolt 官方支持，就默认等于“可以恢复 Neo4j 风格配置面”
- 在 support matrix 未完成前就修改 `StorageType` / schema / README
- 只跑 happy-path 连接 demo 就下 `GO` 结论
- 忽略 `auto` 现有 docs/runtime drift，假装当前 baseline 很干净
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 把官方支持“协议存在”误当成“产品面可接受”
**Failure mode:** 只要 HTTP 或 Bolt 能连上，就直接建议新增 backend。  
**Impact:** 忽略配置、认证、TLS、lifecycle、fallback 和 docs 改造成本。

### Pitfall 2: 用 experiment script 偷渡正式 runtime
**Failure mode:** 把 smoke harness 放进 `src/infrastructure/storage/` 或让 CLI 直接引用。  
**Impact:** feasibility phase 被无意升级成 implementation phase。

### Pitfall 3: 只看代码面，不看 docs/runtime drift
**Failure mode:** blast radius 只数 `StorageType` 和 schema，不统计 README / AI docs / runtime selection truth。  
**Impact:** 后续 phase scope 明显失真。

### Pitfall 4: 以 benchmark 占位叙事逃避 stop conditions
**Failure mode:** 没有真实 smoke 成功，就先写“ArcadeDB 可能更快”。  
**Impact:** 决策建立在空数据上，下一 milestone scope 会被误导。

### Pitfall 5: 把 `NO-GO` 当成失败而不敢写
**Failure mode:** 最终报告只给模糊结论，不愿明确拒绝 direct replacement。  
**Impact:** Phase 21 失去存在价值，风险被向后转移。
</common_pitfalls>

<code_examples>
## Code Examples

### Recommended isolated smoke entry
```bash
node scripts/experiments/arcadedb-http-smoke.mjs --help
```

### Recommended required env contract
```bash
ARCADEDB_HTTP_URL=http://localhost:2480
ARCADEDB_DATABASE=mydb
ARCADEDB_USERNAME=root
ARCADEDB_PASSWORD=secret
ARCADEDB_CYPHER='MATCH (n) RETURN count(n) AS total LIMIT 1'
```

### Recommended decision line
```markdown
Decision: NO-GO for direct embedded/drop-in replacement; CONDITIONAL for isolated server-backed follow-up
```
</code_examples>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `rg -n "Embedded \| JVM only|HTTP/JSON \| Client/server|Bolt \| Client/server" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVIDENCE.md` — 验证官方支持矩阵已固化
2. `rg -n "auto -> kuzudb|auto -> filesystem|uri|username|password|tls|serverLifecycle" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-BLAST-RADIUS.md` — 验证 blast radius 已把现存 drift 与正式接入字段都量化
3. `node --check scripts/experiments/arcadedb-http-smoke.mjs` — 验证隔离 smoke harness 可离线通过语法检查
4. `node scripts/experiments/arcadedb-http-smoke.mjs --help` — 验证脚本在无服务环境下仍能输出 env contract
5. `pnpm exec vitest run src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` — 锁住现有 storage fallback baseline，避免 Phase 21 叙事反向破坏既有 truth
6. `rg -n "Decision:|NO-GO for direct replacement|CONDITIONAL for isolated server-backed follow-up" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVALUATION-REPORT.md` — 验证最终决策不是模糊文字

### Why this is enough
- 1 和 2 锁住 `ARC-01 ~ ARC-03` 的事实面与 blast radius 面
- 3 和 4 保证最小实验路径具备离线可验证性，而不是只留口头方案
- 5 让 Phase 21 保持对现有 storage truth 的敬畏，不把“新后端评估”变成“顺手改现有 fallback”
- 6 确保 `ARC-05` 最终是单一主建议，而不是技术随笔
</validation_architecture>

<sources>
## Sources

### External
- `https://arcadedb.com/embedded.html`
- `https://arcadedb.com/client-server.html`

### Repo
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-CONTEXT.md`
- `.planning/archive/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb-seed/1000-RESEARCH.md`
- `src/interface/types/storage.ts`
- `src/infrastructure/storage/StorageFactory.ts`
- `src/cli/config-loader.ts`
- `mycodemap.config.schema.json`
- `README.md`
- `docs/ai-guide/COMMANDS.md`
- `docs/rules/validation.md`
</sources>

---
*This research document is consumed by `gsd-plan-phase` and preserves the phase boundary: feasibility first, productization later only if evidence warrants it.*
