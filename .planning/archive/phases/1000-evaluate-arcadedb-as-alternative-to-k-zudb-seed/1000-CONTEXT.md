# Phase 1000: Evaluate ArcadeDB Node integration feasibility - Context

**Phase:** 1000
**Status:** Ready for replanning
**Gathered:** 2026-03-25
**Source:** execute-phase blocker review + official ArcadeDB documentation

<domain>
## Phase Boundary

本阶段的目标不是直接实现 `ArcadeDBStorage`，而是先验证 **ArcadeDB 在 Node.js / CLI 运行时下是否存在官方支持、可接受 blast radius 的接入路径**，再决定是否值得进入后续实现 phase。

本阶段必须回答：

1. ArcadeDB 对 Node.js 的官方支持面到底是什么？
2. 这些支持面是否符合 CodeMap 当前“本地 CLI + 受控配置面”的产品约束？
3. 如果只存在 server-backed 路径，新增的运行方式、凭证与文档成本是否值得接受？

**成功标准**:
1. 明确记录 ArcadeDB 的 Node.js 支持矩阵（embedded / HTTP / Bolt）
2. 明确量化正式接入 `arcadedb` 所需的配置、CLI、schema、文档 blast radius
3. 输出带证据的 Go / No-Go / Conditional 决策与后续路线建议

</domain>

<decisions>
## Implementation Decisions

### 评估优先于实现
- **D-01:** `1000` 先做 evaluation + bounded experiment，不再预设“完整适配器实现”是默认路径
- 任何进入产品代码面的实现都应在后续 phase 明确批准后进行

### 官方支持面优先
- **D-02:** 不得再假设 Node.js 存在 ArcadeDB embedded SDK
- 仅允许基于 ArcadeDB 官方文档明确支持的接入方式做判断和实验

### 主线隔离
- **D-03:** `1000` 继续作为 backlog research，与 `v1.4` 主线隔离
- 本阶段不允许把 backlog 决策写回 `Phase 18-20` 的执行路由

### server-backed 成本必须显式化
- **D-04:** 若 ArcadeDB 只提供 client/server 路径，则把服务进程、凭证、网络协议、部署说明视为**产品面变化**
- 这些成本不能被伪装成“只是换了一个驱动”

### 有界实验原则
- **D-05:** 实验优先放在隔离脚本或 phase artifact 中，不直接扩展 `storage.type`、schema 或公开 CLI surface
- 优先选择不引入新产品依赖的最小实验路径

### 验证约束
- **D-06:** 性能或可行性结论必须建立在**真实支持拓扑**上；不允许沿用“ArcadeDB embedded 更快”这类未验证占位判断
- 在实验无法落地前，只能定义 benchmark / smoke strategy，不得伪造结果

### 决策出口
- **D-07:** 如果 ArcadeDB 无法满足当前 Node/CLI 约束，应明确输出 `NO-GO`
- 比起发明不受支持的兼容层，清晰地终止错误路线更可接受

### Claude's Discretion
- 选择 HTTP/JSON 还是 Bolt 作为最小实验路径
- 决策矩阵中的维度权重
- 后续 phase 应拆成“实验实现”还是“替代方案比较”

</decisions>

<canonical_refs>
## Canonical References

### Repo source of truth
- `.planning/ROADMAP.md` — backlog phase 1000 目标与计划入口
- `.planning/REQUIREMENTS.md` — ARC-01 ~ ARC-05 验收边界
- `.planning/PROJECT.md` — 主线与 backlog 隔离原则
- `.planning/archive/phases/999.1-kuzu-primary-storage/999.1-CONTEXT.md` — Kùzu 主线的历史背景
- `src/interface/types/storage.ts` — 当前 StorageType surface
- `src/infrastructure/storage/StorageFactory.ts` — 当前 backend 选择与 fallback 逻辑
- `src/cli/config-loader.ts` — 当前配置输入面与 Neo4j 字段封禁
- `mycodemap.config.schema.json` — 当前公开 schema
- `README.md` — 用户可见存储说明
- `docs/ai-guide/COMMANDS.md` — AI-facing public command surface

### External source of truth
- `https://arcadedb.com/client-server.html` — client/server 模式、HTTP/Bolt/Gremlin/Postgres 协议说明
- `https://arcadedb.com/embedded.html` — embedded 仅适用于 JVM / Java API 的说明

</canonical_refs>

<code_context>
## Existing Code Insights

### 当前正式存储面
- `StorageType` 仅包含 `filesystem` / `kuzudb` / `memory`
- `config-loader` 当前只接受 `type / outputPath / databasePath / autoThresholds`
- `config-loader` 显式拒绝 `uri / username / password` 这类 Neo4j 风格字段
- `README` 与 `docs/ai-guide/COMMANDS.md` 只公开 `filesystem / kuzudb / memory / auto`

### 对 ArcadeDB 的潜在影响
- 如果 ArcadeDB 只能用 client/server，则需要新增 URL、凭证、数据库名、协议、TLS/连接说明
- 这会同时影响配置 schema、CLI 错误消息、README、AI guide 和 fallback 文案
- 因此 ArcadeDB 不是“替换一个适配器文件”这么简单

</code_context>

<specifics>
## Specific Questions To Resolve

1. Node.js 最小可行路径应选 HTTP/JSON 还是 Bolt？
2. 如何在不扩大 public surface 的前提下做 smoke experiment？
3. 如果要把 `arcadedb` 变成正式 backend，最小新增字段集是什么？
4. 何种条件下应判定为 `NO-GO` 而不是继续实现？

### 预期产物
- `1000-EVIDENCE.md` — 官方支持矩阵与错误前提清单
- `1000-ARCHITECTURE-IMPACT.md` — 代码 / 配置 / 文档 blast radius
- `scripts/experiments/arcadedb-http-smoke.mjs` — 隔离实验脚本
- `1000-EVALUATION-REPORT.md` — 决策报告

</specifics>

<deferred>
## Deferred Ideas

- 不在本阶段直接实现生产级 `ArcadeDBStorage`
- 不在本阶段修改 `storage.type`、schema、README 公共契约
- 不在本阶段恢复 Neo4j 风格公开配置
- 不在本阶段做 Kùzu → ArcadeDB 数据迁移工具

</deferred>

---

*Phase: 1000-evaluate-arcadedb-as-alternative-to-k-zudb*
*Context gathered: 2026-03-25*
