# CodeMap

## What This Is

CodeMap 是一个面向 AI / Agent 的代码地图工具，用来给代码分析任务提供结构化、可预测、可机器消费的上下文。当前仓库是 brownfield 项目：既有 legacy CLI/分析管线，也有正在推进的 MVP3 分层架构，因此当前工作的重点不是“从零构建新产品”，而是把已有能力收敛到更清晰、更可信的产品边界上。

## Core Value

AI 能以稳定、机器可读的方式获得代码上下文，而不是被混杂的实现型工作流和不清晰的命令边界干扰。

## Current Milestone: v1.3 Kùzu-only 收敛与高信号债务清理

**Goal:** 在不重新打开 HTTP API 产品面的前提下，移除 `neo4j` 正式支持，把 graph storage 收敛到 Kùzu-only 主线，并清理当前影响产品可信度的高信号 unfinished / tech debt / docs drift。

**Target features:**
- 从 config / schema / runtime / tests / docs 中移除 `neo4j` 正式产品面，并为历史配置提供清晰迁移诊断
- 收口 `analyze` / `workflow` / `server` 边界上的未完成点，避免“文档说已收口、源码仍像过渡态”的漂移
- 清偿 `plugin-loader`、`parser`、`global-index`、`AnalysisHandler` 与 docs sync automation 的高信号技术债

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
- ✓ `v1.2` 已验证 Neo4j contract parity、失败语义与文档闭环，为本轮去支持化提供迁移基线 —— v1.2 / Phase 12

### Active

- [ ] graph storage 正式支持只保留 `filesystem` / `memory` / `kuzudb` / `auto`，历史 `neo4j` 配置得到显式迁移报错
- [ ] 当前 `analyze` / `workflow` / `server` / `plugin` / `parser` / `global-index` unfinished 与 TODO-DEBT 不再停留在主路径
- [ ] 文档同步自动化进入 CI / must-pass 路径，README / AI docs / rules / schema / guardrail 保持单一事实源

### Out of Scope

- 恢复或继续扩展 `neo4j` 支持 —— 用户已明确当前不需要，继续投入只会扩大维护面
- 重新公开 `mycodemap server` / 独立 HTTP API 产品面 —— `Server Layer` 仍是内部层，且当前 handler 仍需先消除 mock/unfinished 歧义
- 一次性引入 Kùzu-native 查询优化或新的图数据库后端 —— 本轮先做“去支持化 + 债务清偿”，不重开性能/扩展战线
- 直接建设插件 marketplace / 远程安装生态 —— 与当前可信度收口目标无关

## Context

- v1.0 已交付：当前 public CLI 聚焦 `init/generate/query/deps/cycles/complexity/impact/analyze/ci/workflow/export/ship`。
- `analyze` 已固定为 `find/read/link/show`，legacy alias 通过 `warnings[]` 提示迁移，但 `find` 仍存在 orchestrator fallback 路径上的过渡实现。
- `workflow` 已固定为 analysis-only 四阶段，但命令说明与实现细节仍保留“过渡能力”痕迹，需要继续收口。
- analyzer / header scanner 已共享 `.gitignore` 感知文件发现模块；docs guardrail 已覆盖这些边界，但 docs sync automation 尚未进入 CI 自动阻断链路。
- 仓库仍是 brownfield：legacy 分析管线与 MVP3 分层架构并存，但产品边界已收口到可被 AI 稳定消费的范围。
- `src/plugins/` 已从内部骨架升级为真实产品面，但 `plugin-loader` 仍存在热重载 debt。
- `KuzuDBStorage` / `Neo4jStorage` 已在 v1.2 达到 contract parity；当前新 milestone 的重点不是继续增强 Neo4j，而是把它安全移出正式产品面。
- 当前 `src/` 仍可检索到 `parser/index.ts`、`global-index.ts`、`AnalysisHandler.ts`、`plugin-loader.ts` 以及多种 parser implementation 的 TODO / TODO-DEBT。

## Constraints

- **Compatibility**: 当前 CLI 可能已有现存使用者 —— 删除或降级能力必须有迁移或清晰报错策略
- **Guardrails**: `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*`、`scripts/validate-docs.js`、相关测试必须同步
- **Architecture**: legacy 与 MVP3 并存 —— 不能假设某一侧已经被完全替换
- **Runtime**: Node.js 18+、ESM、严格 TypeScript —— 必须保持现有构建假设
- **Dependencies**: `kuzu` 仍是按需依赖 —— 不允许为了去支持化顺手把可选依赖升级成强依赖
- **Boundary**: `Server Layer` 仍是内部层 —— 禁止借 debt 清理顺手重开公共 HTTP API 产品面
- **No Neo4j**: 当前 milestone 不再承诺 `neo4j` 为受支持 backend —— 产品面、文档、测试与 schema 都必须一致
- **Integration**: 每个收口点都必须同时闭环“实现 / 文档 / guardrail / 验证”，而不是只修代码

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
| `v1.1` 优先做插件扩展点产品化 | 插件代码骨架已存在，投入产出比高于图数据库后端生产化 | ✓ Validated in Phases 07-09 |
| `v1.2` 聚焦图数据库后端生产化 | storage abstraction 已存在，backend productionization 比 HTTP API 更接近可交付主线 | ✓ Validated in Phases 10-12 |
| `v1.3` 不再支持 `neo4j` 正式产品面 | 用户明确当前不需要，继续保留只会放大文档、测试与维护成本 | — Pending |
| `v1.3` 先做去支持化与高信号 debt 清偿，再评估新能力 | 先修正现实与文档漂移，才能恢复 roadmap 的可信度 | — Pending |
| docs sync automation 必须进入自动验证链路 | 仅靠手动运行 `docs:check` 无法防止后续再次漂移 | — Pending |

## Current State

- **Shipped milestones:** `v1.0 AI-first 重构`、`v1.1 插件扩展点产品化`、`v1.2 图数据库后端生产化`
- **Milestone archive:** `.planning/MILESTONES.md`, `.planning/v1.0-MILESTONE-AUDIT.md`, `.planning/v1.1-MILESTONE-AUDIT.md`, `.planning/v1.2-MILESTONE-AUDIT.md`, `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.2-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`, `.planning/milestones/v1.1-REQUIREMENTS.md`, `.planning/milestones/v1.2-REQUIREMENTS.md`, `.planning/milestones/v1.2-phases/`
- **Current milestone:** `v1.3 Kùzu-only 收敛与高信号债务清理`
- **Current status:** 里程碑目标、requirements 与 roadmap 已定义；下一步进入 Phase 13 执行
- **Known debt to close in this milestone:** `neo4j` 产品面残留、`analyze`/`workflow`/`server` 边界 unfinished、`plugin-loader`/`parser`/`global-index`/`AnalysisHandler` debt、docs sync automation 未进 CI

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone**:
1. 审查 `What This Is` / `Core Value` 是否仍准确
2. 将已交付 requirement 移入 Validated
3. 将下一轮候选目标移入 Active
4. 更新 Current State / Context / Key Decisions

---
*Last updated: 2026-03-24 after starting v1.3 milestone*
