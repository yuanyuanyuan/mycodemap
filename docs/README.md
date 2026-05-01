# docs/ - 文档信息架构

> **v2.0 里程碑上下文**：当前文档体系对应 CodeMap v2.0（”agent-native-foundation”）。v2.0 引入了 CLI-as-MCP 自动网关、接口契约 Schema、WASM-first 构建基础等核心能力。详见下方 [v2.0 文档索引](#v20-文档索引)。

本目录采用”入口文档短、细节文档分层”的结构。

## 目录职责

- `docs/rules/`：开发、测试、验证、发布规则。
- `docs/design-docs/`：当前仍有效的设计文档。
- `docs/exec-plans/`：活跃计划、已完成计划、技术债跟踪。
- `docs/generated/`：生成内容与归档说明。
- `docs/product-specs/`：当前仍有效的产品规格与验收边界。
- `docs/references/`：外部参考、设计系统、工具链资料。
- `docs/archive/`：历史方案、迁移遗留、过期文档索引。
- `docs/ai-guide/`：AI / Agent 集成指南（v2.0 新增）。
- `src/cli/interface-contract/`：接口契约 Schema 定义（单一 Schema 生成 parser、MCP tool 定义、`--help-json`、shell 补全）。

## 当前状态

- `docs/` 根层当前只保留仍在使用的操作指南：`AI_ASSISTANT_SETUP.md`、`SETUP_GUIDE.md`。
- 2026-03-15 已把历史重构设计、历史需求草稿、Go 支持计划和过期计划统一移入 `docs/archive/`。
- `docs/design-docs/` 与 `docs/product-specs/` 当前不再保留旧稿；历史内容请从 `docs/archive/README.md` 进入。
- 新增内容优先写入分层目录，不再把新设计或新计划继续堆到根层。

### v2.0 功能状态

v2.0（"agent-native-foundation"）已引入以下核心能力，相关文档已就位：

| 功能 | 状态 | 文档位置 |
|------|------|----------|
| **CLI-as-MCP 自动网关** | 已交付 | `docs/ai-guide/INTEGRATION.md` |
| `codemap doctor` 持续健康诊断 | 已交付 | `AI_GUIDE.md` + `src/cli/doctor/` |
| `codemap benchmark` WASM/Native 性能对比 | 已交付 | `AI_GUIDE.md` |
| `--schema` 接口契约输出 | 已交付 | `AI_GUIDE.md` + `src/cli/interface-contract/` |
| WASM-first 构建基础 | 已交付 | `AI_GUIDE.md` + `src/cli/loaders/` |
| AI-First 默认输出（JSON/NDJSON） | 已交付 | `AI_GUIDE.md` |
| Failure-to-Action 协议 | 已交付 | `docs/rules/harness.md` |

## 建议阅读顺序

1. `../AGENTS.md`
2. `../CLAUDE.md`
3. `../ARCHITECTURE.md`
4. 与任务最相关的 `docs/rules/*`
5. 与任务最相关的现行文档；如需历史背景，再看 `docs/archive/README.md`
6. 如需过程信息，再看 `docs/exec-plans/*`

## v2.0 文档索引

以下文档涵盖 v2.0 核心功能，按主题分类：

### AI / Agent 集成
- `docs/ai-guide/INTEGRATION.md` — CLI-as-MCP 自动网关配置指南（动态 tool 注册、20+ 命令自动暴露）
- `docs/ai-guide/AI_ASSISTANT_SETUP.md` — AI 助手（Kimi、Claude、Codex、Cursor、Copilot）集成配置
- `AI_GUIDE.md` — CodeMap CLI / MCP / AI 使用总览（含 `doctor`、`benchmark`、`--schema` 用法）

### 接口契约与 Schema
- `src/cli/interface-contract/` — 单一 Schema 源文件（生成 parser、MCP tool 定义、`--help-json`、shell 补全）
- 运行 `codemap --schema` 可输出完整契约 JSON，供 Agent 自省

### Harness 与 Agent 控制
- `docs/rules/harness.md` — Harness 设计、Agent 控制、上下文分层、权限升级策略
- `docs/rules/harness.md` — Failure-to-Action 协议（每个错误返回 `rootCause` + `remediationPlan` + `confidence` + `nextCommand`）

### 架构与构建
- `ARCHITECTURE.md` — 架构分层、依赖方向、模块边界
- `src/cli/loaders/` — WASM-first 构建基础（`tree-sitter` → `web-tree-sitter`；`better-sqlite3` → `node:sqlite` / `sql.js`）

## 维护规则

- 入口文档只做导航，不复述大段细节。
- 规则进 `docs/rules/`，设计理由进 `docs/design-docs/`，计划进 `docs/exec-plans/`。
- 需求与验收进 `docs/product-specs/`，生成物说明进 `docs/generated/`，外部资料进 `docs/references/`。
- 历史文档进入 `docs/archive/`，并补全归档时间、归档原因、当前依据。
- 若文档更新影响执行协议或入口路径，要同步检查 `AGENTS.md`、`CLAUDE.md`、`ARCHITECTURE.md`、`README.md`。
