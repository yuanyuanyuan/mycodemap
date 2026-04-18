# Phase 21: Evaluate ArcadeDB Node integration feasibility - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Source:** Roadmap Phase 21 goal + `ARC-01` / `ARC-02` / `ARC-03` / `ARC-04` / `ARC-05` + archived `1000` seed findings + current storage/config/docs scout + official ArcadeDB documentation

<domain>
## Phase Boundary

本阶段只回答一个问题：**ArcadeDB 在当前 CodeMap 的 Node.js / CLI / local-first 产品边界下，是否存在值得继续推进的官方接入路径。**

因此本阶段交付的不是 `ArcadeDBStorage` 实现，而是 evidence-first feasibility 结论：
1. 核实 ArcadeDB 在 Node.js 侧官方明确支持的拓扑与不支持项；
2. 定义一个不污染当前 `filesystem` / `memory` / `kuzudb` / `auto` public surface 的最小实验路径；
3. 量化若未来要把 ArcadeDB 变成正式 backend，需要改动哪些配置、CLI、schema、docs、tests 与 fallback truth；
4. 输出带证据的 `GO` / `NO-GO` / `CONDITIONAL` 决策建议。

本阶段**不**直接新增 `storage.type = "arcadedb"`、**不**扩写公开 config schema、**不**引入 server lifecycle / credentials UX、**不**承诺性能优于 KùzuDB、**不**把一个 server-backed backend 伪装成“只改 adapter”。

</domain>

<decisions>
## Implementation Decisions

### Connectivity topology
- **D-01:** `embedded` 不作为 Node.js runtime 的可行路径。当前官方 embedded 文档把该模式明确放在 JVM / Java API 语境下，因此不能再把“Node 直接嵌入 ArcadeDB”当成前提。
- **D-02:** `HTTP/JSON` 作为 Phase 21 的主实验路径，因为它是官方 server mode 下最直接、最少语言绑定假设的 Node 接入面。
- **D-03:** `Bolt` 只作为 secondary validation path；它可以用来验证官方 server mode 的兼容面，但不能反向把“兼容 Neo4j driver”偷换成“ArcadeDB 已自然适配现有 storage surface”。

### Experiment containment
- **D-04:** 本阶段只允许落地 evidence artifact、support matrix、实验脚本或 phase-level研究材料；不得修改当前 public storage/config/schema/CLI surface。
- **D-05:** 如果 ArcadeDB 需要显式 server process、database name、URI、auth、TLS、port、lifecycle 或 remote failure handling，这些都按**产品面变化**处理，不得降格为“适配器内部细节”。
- **D-06:** 任何最小实验都必须与已 shipped 的 `design validate → design map → design handoff → design verify` 主链和当前 storage contract 隔离；即便做代码 spike，也只能是 disposable harness，不得提前进入正式 runtime。

### Decision posture
- **D-07:** 本阶段输出必须是 `GO` / `NO-GO` / `CONDITIONAL` 之一；显式 `NO-GO` 是合格交付，不是失败。
- **D-08:** 禁止把 ArcadeDB 叙述成 KùzuDB 的 “drop-in embedded replacement for Node.js”。如果结论成立，也只能是“server-backed 条件性后续方向”，不是现成替代品。
- **D-09:** 当前 repo 已存在 storage truth 漂移：运行时 `auto` 已优先尝试 `kuzudb`，但 README 与 AI docs 仍写“`auto` 走 `filesystem`”。后续任何 ArcadeDB 量化都必须把这类已有漂移算进 blast radius，而不是假装当前 surface 已完全一致。

### Validation evidence
- **D-10:** 验证输出至少包含 support matrix、环境前提、smoke strategy、benchmark strategy、blast radius map 与最终建议；不接受“看起来应该可行”的 narrative-only 结论。
- **D-11:** 禁止 placeholder benchmark、禁止“ArcadeDB embedded 更快”之类脱离真实拓扑的性能判断；只有在官方支持拓扑与实验前提成立后，才允许定义后续对比方法。
- **D-12:** 必须至少预演一个失败模式。当前最具体的失败模式有两个：`(a)` 误把 embedded Java API 当成 Node SDK；`(b)` server-backed 实验需要的 `uri/auth/password` 等配置无法由当前 `storage` contract 表达，导致还没验证数据库能力就先撞上产品面缺口。

### the agent's Discretion
- support matrix 的精确表头与打分维度
- smoke script 放在 phase artifact、临时 harness 还是 research 附录，只要不进入 shipped runtime
- 是否补充 `PostgreSQL wire protocol` 作为旁证，只要不干扰 `HTTP/JSON primary + Bolt secondary` 主路线

</decisions>

<specifics>
## Specific Ideas

- `1000` seed 里最有价值的遗产不是实现计划，而是“先证伪 embedded 前提再谈 productization”这条负面边界，应直接继承。
- 当前 repo 的 storage public contract 仍是本地路径导向：`outputPath` / `databasePath` / `autoThresholds`。这与 ArcadeDB server mode 典型需要的 `host/port/database/auth` 不是一个配置维度，说明 Phase 21 不能偷懒写成“新增一个 adapter”。
- 现存 docs drift 也应纳入本 phase 认知基线：运行时 `auto` 已优先尝试 `kuzudb`，但 README / AI docs 仍保守写 `filesystem`。如果连现有后端 truth 都没完全对齐，就更不能轻率引入新的 server-backed backend 叙事。
- 失败预演优先采用实际风险模式，而不是抽象风险：例如用一个 Node spike 去尝试 embedded 方式会直接卡在 Java/JVM API 事实；用 HTTP/Bolt spike 则会立刻暴露当前 schema/config 无法表达远端连接参数。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / Requirement
- `.planning/PROJECT.md` — 当前产品边界、local-first 约束、follow-up 目标与现有高爆炸半径入口
- `.planning/REQUIREMENTS.md` — `ARC-01` 到 `ARC-05` 的正式 requirement 与验收口径
- `.planning/ROADMAP.md` — Phase 21 goal、success criteria、failure rehearsal 与当前状态
- `.planning/STATE.md` — 当前主线路由、已归档 milestone 与风险监控项

### Prior Decisions / Seed Artifacts
- `.planning/archive/phases/999.1-kuzu-primary-storage/999.1-CONTEXT.md` — Kùzu 作为当前正式 graph storage 的历史边界
- `.planning/archive/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb-seed/1000-CONTEXT.md` — Phase 21 的直接前身，记录了“先做 feasibility、不是直接实现 adapter”的初版边界
- `.planning/archive/phases/1000-evaluate-arcadedb-as-alternative-to-k-zudb-seed/1000-RESEARCH.md` — 对 embedded / client-server 支持面的首次证伪与初步 blast radius 拆解

### Current Storage Surface Truth
- `src/interface/types/storage.ts` — `StorageType`、`StorageConfig`、`IStorage` 的当前 public contract
- `src/infrastructure/storage/StorageFactory.ts` — 当前 runtime backend selection、`auto` 行为与 `kuzudb` fallback 事实
- `src/cli/config-loader.ts` — storage config 的允许字段、`neo4j` 迁移诊断与禁止字段
- `mycodemap.config.schema.json` — 当前配置 schema 只接受 `filesystem` / `kuzudb` / `memory` / `auto`
- `src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` — 现有 storage fallback 行为的测试事实

### Docs / Blast Radius Baseline
- `README.md` — 用户入口与当前 storage narrative；这里仍把 `auto` 写成保守走 `filesystem`
- `docs/ai-guide/COMMANDS.md` — AI 速查命令面；这里同样仍把 `auto` 叙述为保守走 `filesystem`
- `docs/rules/validation.md` — 失败预演、最小验证顺序与不能跳过 guardrail 的验证底线

### Official ArcadeDB References
- `https://arcadedb.com/embedded.html` — 官方 embedded mode 文档；用来确认它面向 JVM / Java API，而不是 Node embedded SDK
- `https://arcadedb.com/client-server.html` — 官方 client/server 文档；用来确认 HTTP/JSON、Bolt 与其他协议的正式 server-backed 支持面

### Codebase Conventions
- `.planning/codebase/CONVENTIONS.md` — public contract、docs sync、`--json` / human output 等仓库约束
- `.planning/codebase/STRUCTURE.md` — storage / CLI / docs / tests 在当前混合架构中的落点
- `.planning/codebase/CONCERNS.md` — high blast-radius entry points、docs coupling 与架构并存风险
- `.planning/codebase/TESTING.md` — focused regression、fixture、temp-dir 与 failure-first 测试习惯

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/interface/types/storage.ts`：当前 storage public contract 的唯一事实源，可直接用于 Phase 21 blast radius diff。
- `src/infrastructure/storage/StorageFactory.ts`：已经体现 optional dependency + runtime fallback 模式；后续若要 productize，可用它评估“server-backed backend 是否会破坏本地优先假设”。
- `src/cli/config-loader.ts` 与 `mycodemap.config.schema.json`：是配置面 blast radius 的第一落点，能直接揭示当前 schema 是否容纳远端连接字段。
- `src/infrastructure/storage/__tests__/fallback-mechanism.test.ts`：可作为后续验证 fallback 叙事是否被新 backend 冲击的回归基线。

### Established Patterns
- 当前 storage contract 以本地路径和显式 fallback 为主，不包含远端服务生命周期管理。
- public contract 变化必须同步 README、AI docs、rules 与 tests；storage 方向不是只改代码、不改 docs 的私有实现细节。
- 仓库偏好 evidence-first、fixture-first、failure-first；因此 feasibility 也应优先产出 support matrix 与 smoke strategy，而不是“先做一版看看”。
- 运行时真相与文档真相可能漂移，Phase 21 规划必须先识别 baseline drift，再讨论新增 backend。

### Integration Points
- 若未来继续 productize，第一批高 blast-radius 改动面会是 `src/interface/types/storage.ts`、`src/cli/config-loader.ts`、`mycodemap.config.schema.json`、`src/infrastructure/storage/StorageFactory.ts`、README 与 AI docs。
- 若当前 phase 仅做实验，最安全的落点是 phase-local artifact、research 附录或一次性 harness，而不是 `src/infrastructure/storage/adapters/` 正式适配器目录。
- 验证路径需要同时覆盖代码事实与文档事实，因为现存 `auto` narrative drift 已经证明 storage 决策会外溢到 docs surface。

</code_context>

<deferred>
## Deferred Ideas

- 直接实现生产级 `ArcadeDBStorage` —— 只有在 Phase 21 结论至少为 `CONDITIONAL GO` 后才有资格进入新 phase
- 把 ArcadeDB 暴露为正式 `storage.type`、补齐 `uri/auth/tls` 配置契约与 CLI UX —— future phase
- Kùzu → ArcadeDB 数据迁移工具、双写策略或 fallback 迁移计划 —— future phase
- 真正的性能对比与 benchmark 跑分 —— 先锁定官方支持拓扑和 smoke path，再进入后续 phase

</deferred>

---

*Phase: 21-evaluate-arcadedb-node-integration-feasibility*
*Context gathered: 2026-03-28*
