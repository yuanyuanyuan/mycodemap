# CodeMap

## What This Is

CodeMap 是一个面向 AI / Agent 的代码地图工具，用来给代码分析任务提供结构化、可预测、可机器消费的上下文。当前仓库是 brownfield 项目：既有 legacy CLI/分析管线，也有正在推进的 MVP3 分层架构，因此当前工作的重点不是“从零构建新产品”，而是把已有能力收敛到更清晰的产品边界上。

## Core Value

AI 能以稳定、机器可读的方式获得代码上下文，而不是被混杂的实现型工作流和不清晰的命令边界干扰。

## Current Milestone: v1.2 图数据库后端生产化（已完成）

**Goal:** 把图数据库后端从“接口已存在但主流程不可达”的占位能力，推进到“可被选择、可持久化、可验证”的正式产品能力，同时不重新打开 HTTP API 产品面。

**Target features:**
- 收口 graph storage selection / diagnostics / main-path activation
- 让 KùzuDB 达到真实持久化、查询与分析最小闭环
- 让 Neo4j 达到同一 storage contract，并补齐文档、guardrail 与失败验证

## Requirements

### Validated

- ✓ 代码库已经能生成代码地图和结构化分析结果 —— existing
- ✓ 代码库已经提供 `query` / `deps` / `cycles` / `complexity` / `impact` / `analyze` 等分析能力 —— existing
- ✓ 代码库已经具备 CI / 文档护栏与发布自动化 —— existing
- ✓ 代码库已经存在 MVP3 分层模块：`src/interface/`、`src/infrastructure/`、`src/domain/`、`src/server/` —— existing
- ✓ 产品与入口文档已收口为 AI-first 代码地图工具定位 —— v1.0 / Phase 1
- ✓ 默认输出契约已收口为“机器可读优先 + 人类显式入口”—— v1.0 / Phase 1
- ✓ `Server Layer` 与公共 `server` CLI 命令的命名边界已明确 —— v1.0 / Phase 1
- ✓ 公共 CLI 已移除越界命令，并统一为受控 public surface —— v1.0 / Phase 2
- ✓ `analyze` 公共契约已收口为 `find` / `read` / `link` / `show` 四意图 —— v1.0 / Phase 3
- ✓ `workflow` 已收口为 analysis-only 四阶段 —— v1.0 / Phase 4
- ✓ `ship` must-pass 检查已复用 `ci` gate checks —— v1.0 / Phase 5
- ✓ 扫描类命令已共享 `.gitignore` 感知文件发现模块，文档护栏已与实现对齐 —— v1.0 / Phase 6
- ✓ `mycodemap.config.json` 已成为正式插件配置入口，包含 schema/defaults/loader —— v1.1 / Phase 07
- ✓ `generate` 已在显式插件配置下真正运行插件，并把结果写入 `pluginReport` / `Plugin Summary` —— v1.1 / Phase 08
- ✓ 插件失败会以结构化 diagnostics 暴露，good-plugin / broken-plugin 混合场景不再拖垮主流程 —— v1.1 / Phase 08
- ✓ README / AI 文档 / docs guardrail / built-in + user plugin E2E 已与插件产品面对齐 —— v1.1 / Phase 09
- ✓ 图数据库后端已成为正式可选存储面，`generate` / `export` / 内部 runtime 可进入配置化 backend —— v1.2 / Phase 10
- ✓ KùzuDB 已具备真实持久化、更新、查询与最小分析闭环 —— v1.2 / Phase 11
- ✓ Neo4j 已达到同一 storage contract，graph storage 文档 / guardrail / 成功失败验证闭环 —— v1.2 / Phase 12

### Active

- 暂无 —— 等待下一轮 milestone 定义（候选项见 `.planning/REQUIREMENTS.md` 的 deferred / out-of-scope 区域）

### Out of Scope

- 直接建设插件 marketplace / 远程安装生态 —— 本地插件链路刚稳定，继续扩生态层的成本/风险比过高
- 重新公开 `mycodemap server` / 独立 HTTP API 产品面 —— `Server Layer` 边界已稳定，且当前 handler 仍是 mock 级骨架
- 将图数据库工作与历史 Nyquist 扩围债务并行推进 —— 会重演 scope 漂移
- 仅为过程性 git/tag 收尾而定义新 milestone —— 过程约束不能替代产品目标

## Context

- v1.0 已交付：当前 public CLI 聚焦 `init/generate/query/deps/cycles/complexity/impact/analyze/ci/workflow/export/ship`。
- `analyze` 已固定为 `find/read/link/show`，legacy alias 通过 `warnings[]` 提示迁移。
- `workflow` 已固定为 analysis-only 四阶段，`ship` CHECK 阶段复用 `ci` gate checks。
- analyzer / header scanner 已共享 `.gitignore` 感知文件发现模块；docs guardrail 已覆盖这些边界。
- 仓库仍是 brownfield：legacy 分析管线与 MVP3 分层架构并存，但 v1.0 已把产品边界收口到可被 AI 稳定消费的范围。
- `src/plugins/` 已从内部骨架升级为真实产品面：有正式配置入口、主流程接入、结构化 diagnostics 与 docs/guardrail/e2e 证据。
- `KuzuDBStorage` / `Neo4jStorage` 已改为 snapshot-backed real persistence，并通过共享 helper 维持最小 contract parity。

## Constraints

- **Compatibility**: 当前 CLI 可能已有现存使用者 —— 删除命令必须有迁移或清晰报错策略
- **Guardrails**: `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*`、`scripts/validate-docs.js`、相关测试必须同步
- **Architecture**: legacy 与 MVP3 并存 —— 不能假设某一侧已经被完全替换
- **Runtime**: Node.js 18+、ESM、严格 TypeScript —— 必须保持现有构建假设
- **Optional Dependencies**: `kuzu` / `neo4j-driver` 仍是按需依赖 —— 不能把默认安装路径强行升级为必须依赖
- **Boundary**: `Server Layer` 仍是内部层 —— 禁止借图数据库工作顺手重开公共 HTTP API 产品面
- **Scope**: 当前 milestone 必须单线程收敛，只围绕 graph storage 闭环推进
- **Integration**: 新能力必须像 v1.1 一样同时闭环“配置/运行时/文档/guardrail/验证”五个面，而不是只做局部技术实现

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 产品定位收敛为 AI-first 代码地图工具 | 需要让核心用户、默认输出和命令边界一致 | ✓ Validated in Phase 1 |
| 默认输出以机器可读结果为主 | AI 是主要消费者，结构化结果比自然语言更稳定 | ✓ Validated in Phase 1 |
| 收缩 public CLI，移除越界命令 | 避免用户把产品误解成 watcher / report / server 工具箱 | ✓ Validated in Phase 2 |
| `analyze` 收口为四意图公共契约 | 减少 AI 消费时的歧义与 schema 漂移 | ✓ Validated in Phase 3 |
| `workflow` 只保留分析阶段 | 避免把实现 / commit / CI 混入同一产品面 | ✓ Validated in Phase 4 |
| `ship` 必须复用 `ci` gate checks | 保持 must-pass 检查单一事实源 | ✓ Validated in Phase 5 |
| 用共享发现模块统一扫描规则 | 解决 analyzer / scanner / docs 对 `.gitignore` 与默认 exclude 的漂移 | ✓ Validated in Phase 6 |
| Server Layer 架构概念与公共 `server` CLI 命令分离讨论 | 需要避免“架构层保留”被误读成“公共命令必须保留” | ✓ Validated in Phase 1 |
| `v1.1` 优先做插件扩展点产品化 | 插件代码骨架已存在，投入产出比高于图数据库后端生产化 | ✓ Validated in Phases 07-09 |
| 新 milestone 延续 Phase `07+` 编号 | 保留跨 milestone 的 traceability 与历史连续性 | ✓ Validated in Phases 07-09 |
| 只有显式 `plugins` 段才启用 runtime | 避免旧项目被 normalized defaults 悄悄改变行为 | ✓ Validated in Phase 08 |
| 用 `pluginReport` / `Plugin Summary` 作为插件结果单一事实源 | 降低 CLI、AI docs 与实现之间的契约漂移 | ✓ Validated in Phases 08-09 |
| 插件文档必须进入 docs guardrail，而不只停留在 README | 避免插件产品面再次出现“实现改了、AI 文档没跟上” | ✓ Validated in Phase 09 |
| `v1.2` 聚焦图数据库后端生产化 | 代码里已有 storage abstraction，但 graph DB backend 仍停留在 fallback/TODO，比 HTTP API 更接近可交付主线 | ✓ Validated in Phases 10-12 |
| 先收口 storage activation path，再做 backend-specific 持久化 | 如果 `generate` 仍硬编码 `filesystem`，只实现 adapter 仍然无法进入正式主流程 | ✓ Validated in Phases 10-11 |
| `v1.2` 只承诺 storage contract parity，不在本轮引入新的公共 API 面 | 避免 graph storage 工作再次把产品边界拉宽 | ✓ Validated in Phase 12 |

## Current State

- **Shipped milestones:** `v1.0 AI-first 重构`、`v1.1 插件扩展点产品化`、`v1.2 图数据库后端生产化`
- **Milestone archive:** `.planning/MILESTONES.md`, `.planning/v1.0-MILESTONE-AUDIT.md`, `.planning/v1.1-MILESTONE-AUDIT.md`, `.planning/v1.2-MILESTONE-AUDIT.md`, `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.2-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`, `.planning/milestones/v1.1-REQUIREMENTS.md`, `.planning/milestones/v1.2-REQUIREMENTS.md`, `.planning/milestones/v1.2-phases/`
- **Current milestone:** `v1.2 图数据库后端生产化（已完成）`
- **Current status:** Phase 10-12 已完成并验证通过；当前等待下一轮 milestone 定义
- **Known non-blocking debt:** Phase 01 / 02 的 Nyquist 工件仍不完整；历史 archive/setup 文档仍可继续扩展 guardrail；当前运行约束未创建 git tag/commit

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone**:
1. 审查 `What This Is` / `Core Value` 是否仍准确
2. 将已交付 requirement 移入 Validated
3. 将下一轮候选目标移入 Active
4. 更新 Current State / Context / Key Decisions

---
*Last updated: 2026-03-24 after completing v1.2 milestone*
