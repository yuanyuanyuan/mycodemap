# Changelog

All notable changes to this project will be documented in this file.

## [0.5.2-beta.0] - 2026-04-19 - Trusted Publishing Verification

### 🛠️ Infrastructure

- **ci**: 升级 `publish.yml` 到 `actions/checkout@v6`、`actions/setup-node@v6`、Node `24` 与 `npm@11.5.1`
- **release**: OIDC trusted publishing 路径移除显式 `--provenance`，保留 `NPM_TOKEN` fallback 以兼容 registry 偶发问题

### 📝 Documentation

- **release**: 同步 `llms.txt`、`AI_GUIDE.md`、`AI_DISCOVERY.md`、`ai-document-index.yaml` 到 `v0.5.2-beta.0`
- **changelog**: 新增 beta 验证版本条目，用于自动发布链路验证与 GitHub Release 说明

## [0.5.1] - 2026-04-19 - Rule Control Hardening & Release Sync

### 🚀 New Features

- **rules**: 发布 repo-local rule control baseline，包括 capability report、validator exit-code contract、hooks/CI backstop、scoped subagent rule context 与 executable QA
- **workflow**: Claude / Codex 执行流现在会在常见执行路径中注入 scoped `<rule_context>`，减少规则遗漏与 prompt 串味

### 📝 Documentation

- **release**: 同步 `llms.txt`、`AI_GUIDE.md`、`AI_DISCOVERY.md`、`ai-document-index.yaml` 到 `v0.5.1`
- **changelog**: 补齐本版本发布条目，确保 pre-release guardrail 与 GitHub Release notes 可用
- **claude**: 补齐 `CLAUDE.md` 对 `docs/ai-guide/` 的入口引用，消除发布前 AI 文档交叉引用 warning

## [0.5.0] - 2026-04-15 - Design Contract Surface

### 🏗️ v1.4 Milestone: Design-to-Code Mapping & Handoff Package

v1.4 milestone 完成，新增完整的 design contract 公共 CLI 表面，支持人类设计到 AI 执行的标准化 handoff。

#### Phase 17: Design Contract Validation
- **feature**: 发布 `design validate` 命令，校验 `mycodemap.design.md` 必填 sections
- **feature**: 返回结构化 diagnostics（missing-section、duplicate-section、empty-section 等）

#### Phase 18: Design-to-Code Mapping
- **feature**: 发布 `design map` 命令，将 design contract 解析为 candidate code scope
- **feature**: 支持 `no-candidates`、`over-broad-scope`、`high-risk-scope` 自动阻断

#### Phase 19: Handoff Package & Human Gates
- **feature**: 发布 `design handoff` 命令，生成 reviewer / AI agent 共用的 handoff artifact
- **feature**: 输出 `readyForExecution`、`approvals`、`assumptions`、`openQuestions`

#### Phase 20: Design Drift Verification
- **feature**: 发布 `design verify` 命令，基于 reviewed handoff truth 做 checklist / drift 检查
- **feature**: `needs-review` 保持零退出码，仅 blocker diagnostics 返回非零 exit code

### 🚀 New Features

- **design**: 新增 design contract 四阶段 CLI 命令（validate / map / handoff / verify）
- **docs**: 同步 AI_GUIDE.md、README.md 和 docs/ai-guide 中的 design 类型定义与 workflow 命令
- **ci**: 更新文档一致性校验脚本，覆盖 design contract 测试与 fixture

### 🐛 Bug Fixes

- **storage**: 修复 `kuzu` 可选依赖在 CI typecheck 中的模块缺失错误
- **publish**: 移除 GitHub Actions 中不稳定的 `npm install -g npm@latest` 步骤

## [0.4.2] - 2026-03-25 - Test Infrastructure Fix

### 🏗️ v1.3 Milestone: Kùzu-only Convergence & High-Signal Debt Cleanup

v1.3 milestone 完成，核心产品面收敛为 Kùzu-only，清偿多项技术债务。

#### Phase 13: Storage Backend Convergence
- **refactor**: 移除 neo4j 运行时表面 (`8957fca`)
- **docs**: 同步 kuzu-only public contract (`d07524e`)

#### Phase 14: CLI Surface & Documentation Alignment
- **refactor**: 收口 analyze 和 server 过渡差距 (`4a756d7`)
- **docs**: 移除 workflow 过渡性 public 措辞 (`e5b9560`)

#### Phase 15: Analysis Intent & Workflow Runtime
- **feature**: 发布 public intent contract 和 outputs (`f4abfa6`)
- **refactor**: 对齐 workflow 运行时编排核心 (`ddd1c80`)
- **bugfix**: 扩展 quality 和回归测试覆盖 (`5eb38f7`)

#### Phase 16: Core Debt Cleanup & Final Guardrails
- **refactor**: 实现 plugin 真实 reload 生命周期 (`3a5fbc6`)
- **refactor**: 收口 parser index 和 resolution 债务 (`f64432a`)
- **refactor**: 使 analysis write paths 显式化 (`27458cd`)
- **docs**: 同步 kuzu-only 和 docs gate contract (`a4c8e12`)

#### Milestone Archive
- **docs**: 归档 v1.0 CI 和 docs phases (`7d474df`)
- **docs**: 归档 v1.0 analyze 和 workflow phases (`b3e43e4`)
- **docs**: 归档 v1.0 kickoff 和 cli cleanup (`bb80e4b`)
- **docs**: 归档 v1.1 plugin rollout phases (`35cfd60`)
- **docs**: 归档 v1.1 docs 和 v1.2 activation (`0aed09c`)
- **docs**: 归档 v1.2 backend validation (`a27bfb0`)
- **docs**: 完成 v1.3 milestone 关闭 (`ccb7d12`)

### 🚀 New Features

- **storage**: 新增 adapter parity 和 validation (`b051dd8`)
- **storage**: 接入 generate export 和共享 helpers (`f625596`)
- **analyze**: 发布 public intent contract 和标准化输出 (`f4abfa6`)
- **plugins**: 新增 runtime config 和 diagnostics surface (`74d7905`)
- **workflow**: 扩展 quality 和回归测试覆盖 (`5eb38f7`)
- **claude**: 引入完整的 GSD (Get Shit Done) workflow agents 和命令 (`ef537e2`)
- **claude/gstack**: 新增 Docker 配置和 agent 定义 (`b83c000`)
- **claude/gstack**: 新增 GitHub Actions workflows (`7ef301b`)

### 🐛 Bug Fixes

- **test**: 修复 validate-docs 测试缺少 product-specs 文件的问题 (`20d4293`)
- **hooks**: 解决 vitest 跨 node_modules 布局的查找问题 (`d53a5ac`)
- **hooks**: 添加本地 vitest entry 回退 (`d6542b5`)
- **adapter**: 增加 method signature 测试超时 (`4e97ca5`)

### 📚 Documentation

- **docs**: 同步 MVP3 产品规格文档基线 (`0c75108`)
- **docs**: 完成 v1.3 milestone 归档 (`ccb7d12`)
- **ai-guide**: 新增 ship troubleshooting section (`b7fe6d4`)
- **guardrails**: 同步 hooks 和 validation 文档 (`38b1964`)
- **planning**: 添加当前状态和 codebase map (`0bbd4ac`)

### 🔧 Maintenance

- **config**: 同步所有 AI 文档到 v0.4.2 (`43c7b17`)
- **config**: 版本升级到 v0.4.2 (`d1f55c6`)
- **config**: vitest 添加 lcov coverage reporter (`a4da751`)
- **tooling**: checkpoint milestone metadata (`851ecf6`)

## [0.4.1] - 2026-03-23 - Ship Workflow Fixes

### 🐛 Bug Fixes

- ship: 为 push 增加 HTTPS 回退
- ship: 放宽本地检查输出缓冲区
- ship: 修复 dry-run 文案与 changelog 判定
- ship: 切换到 workflow 驱动发布链路

### 📚 Documentation

- ship: 补录 changelog 发布校验说明
- ship: 同步 workflow 发布文档与版本基线

### 🔧 Maintenance

- lock: update package-lock

## [0.4.0] - 2026-03-23 - Ship Workflow Release

### 🚀 New Features

- **ship**: 在发布前自动同步 AI 文档版本
- **cli**: 完成 `codemap ship` 发布流程的最终联调

### 🐛 Bug Fixes

- **ship**: 修复 git tag 创建早于版本提交的问题

### 📚 Documentation

- **docs**: 同步版本号与发布文档到 v0.4.0
- **docs**: 补录 workflow 驱动发布链路的基线校验说明

## [0.3.6] - 2026-03-23 - Ship Workflow Fixes

### 🐛 Bug Fixes

- **ship**: 修复 versionType 为 none 时仍尝试发布的 bug

### 📚 Documentation

- **docs**: 同步版本号到 v0.3.6

## [0.3.4] - 2026-03-23 - CI Pipeline Fixes

### 🔧 Configuration

- **CI**: 修复 `.gitignore` 规则，允许 `scripts/*.js` 用于 CI 验证
- **CI**: 添加 `docs/rules/testing.md` 到 git 跟踪
- **CI**: 移除无效的 `ai-feed.txt` git diff 检查
- **package**: 添加 `package-lock.json` 到 git 解决 CI 依赖问题

## [0.3.3] - 2026-03-23 - Ship Command Improvements

### 🐛 Bug Fixes

- **ship**: 修复 commit 解析支持 `[TYPE]` 格式
- **ship**: 修复 conventional commits 校验正则表达式
- **ship**: 添加 CONFIG/INFRA 类型支持
- **ship**: 修复版本 commit message 格式 (使用 CONFIG 标签)

### 🔧 Configuration

- **ship**: 同步 package.json 与 CHANGELOG 版本

## [0.3.0] - 2026-03-23 - One-Click Ship Command

### 🚀 New Features

- **ship**: 新增 `codemap ship` 一键智能发布命令
  - 自动分析 commits 并检测变更类型
  - 基于 conventional commits 规范计算版本号
  - mustPass/shouldPass 质量检查 + 置信度评分
  - npm 发布（支持 OIDC 认证）+ git tag
  - GitHub Actions CI 状态轮询监控

### 📦 CLI Enhancements

- **新增命令**: `codemap ship [--dry-run] [--verbose] [--yes]`
  - `--dry-run`: 仅分析不发布
  - `--verbose`: 显示详细输出
  - `--yes`: 置信度 60-75 时自动确认

## [0.2.1] - 2026-03-23 - AI Documentation & Quality Improvements

### 🐛 Bug Fixes

- **export**: 修复 Mermaid 导出空输出问题，正确保存到 MVP3 存储
- **cli**: 修复 export 命令 Mermaid 格式输出为空的问题
- **orchestrator**: 修复 test-linker 中 glob ESM 导入问题

### 📚 Documentation Enhancements

#### AI 友好文档系统
- 新增 `AI_GUIDE.md` - AI 专属快速参考文档
- 新增 `docs/ai-guide/` 目录结构，包含：
  - `QUICKSTART.md` - 快速开始与场景映射
  - `COMMANDS.md` - 完整 CLI 命令参数参考
  - `OUTPUT.md` - JSON 输出结构与 TypeScript 类型定义
  - `PATTERNS.md` - 标准工作流模式
  - `PROMPTS.md` - 即用型提示词模板
  - `INTEGRATION.md` - 错误处理与 MCP 集成

#### 文档质量保障
- 新增 `docs/AI_ASSISTANT_SETUP.md` - AI 助手配置指南
- 新增 `docs/SETUP_GUIDE.md` - 完整安装设置指南
- 更新 `docs/rules/architecture-guardrails.md` - 架构约束规则增强
- 更新 `docs/rules/engineering-with-codex-openai.md` - 工程规范更新

### 🔧 Developer Experience

#### CLI 改进
- `docs:check` 脚本升级，同步验证人类文档和 AI 文档
- 新增独立验证命令：
  - `npm run docs:check:human` - 仅验证人类文档
  - `npm run docs:check:ai` - 仅验证 AI 文档
- 新增 `npm run release` - 标准化发布流程

#### 验证流程
- `check:all` 整合文档检查，更严格的质量门禁
- 发布工作流 (`.github/workflows/publish.yml`) 优化

### 📦 Dependencies

- 新增 `scripts/validate-ai-docs.js` - AI 文档验证脚本

---

## [0.2.0] - 2026-03-17 - MVP3 Architecture Release

### 🏗️ MVP3 分层架构重构

CodeMap 完成重大架构升级，采用清晰的分层架构设计：Interface → Infrastructure → Domain → Server → CLI

#### Interface Layer
- 核心类型定义中心 (`src/interface/types/`)
- 存储接口契约 (`IStorage`, `IStorageFactory`)
- 解析器接口契约 (`ILanguageParser`, `IParserRegistry`)

#### Infrastructure Layer
- **存储抽象**: 支持多种存储后端
  - `FileSystemStorage` - 文件系统存储（默认）
  - `MemoryStorage` - 内存存储（测试用）
  - `KuzuDBStorage` - KùzuDB 图数据库（可选）
  - `Neo4jStorage` - Neo4j 图数据库（可选）
  - `StorageFactory` - 自动选择存储后端
- **解析器抽象**: 多语言支持架构
  - `ParserBase` - 解析器抽象基类
  - `ParserRegistry` - 解析器注册表
  - `TypeScriptParser` - TypeScript/JavaScript 解析
  - `GoParser` - Go 语言解析
  - `PythonParser` - Python 解析
- **仓库实现**: `CodeGraphRepositoryImpl` 连接 Domain 和 Infrastructure

#### Domain Layer
- 领域实体: `Project`, `Module`, `Symbol`, `Dependency`
- 聚合根: `CodeGraph`
- 领域服务: `CodeGraphBuilder`
- 领域事件: `DomainEvent` 及其子类
- 仓库接口: `CodeGraphRepository`

#### Server Layer
- HTTP API 服务器 (`CodeMapServer`)
- RESTful 端点设计
- `QueryHandler` - 查询处理
- `AnalysisHandler` - 分析处理
- 支持 CORS、健康检查、错误处理

#### CLI Layer (MVP3 集成)
- 新增 `server` 命令 - 启动 HTTP API 服务器
- 新增 `export` 命令 - 导出代码图到多种格式

### Added

#### New CLI Commands
- `mycodemap server` - 启动 HTTP API 服务器 (`-p`, `--host`, `--cors`, `--open`)
- `mycodemap export` - 导出代码图 (`json`, `graphml`, `dot`, `mermaid`)

#### HTTP API Endpoints
- `GET /api/v1/health` - 健康检查
- `GET /api/v1/stats` - 项目统计
- `GET /api/v1/search/symbols?q=` - 符号搜索
- `GET /api/v1/modules/:id` - 模块详情
- `GET /api/v1/symbols/:id` - 符号详情
- `POST /api/v1/analysis/impact` - 影响分析
- `GET /api/v1/analysis/cycles` - 循环依赖检测
- `GET /api/v1/graph` - 依赖图数据
- `GET /api/v1/export/:format` - 数据导出

#### Dependencies
- `hono` - 轻量级 HTTP 框架
- `@hono/node-server` - Node.js 服务器适配器

### Test Coverage
- 新增 37 个单元测试，总计 **742 个测试全部通过**
- Domain 实体测试 (Project, Module)
- Parser 测试 (ParserRegistry, TypeScriptParser)
- Repository 测试 (CodeGraphRepositoryImpl)

---

## [0.1.2] - 2026-03-20

### Changed
- 文档同步更新：CLI 命令列表、MVP3 架构描述、代码示例全面刷新

## [0.1.1] - 2026-03-07

### Added
- P1 增强功能完整发布
- `report` 命令 - 生成代码地图分析报告
- `logs` 命令 - 日志管理（list/export/clear）
- 敏感数据脱敏工具
- 平台检测与首次运行引导
- tree-sitter 按需检测

## [0.1.0] - 2026-03-07

### Added

#### Core Features
- Initial release of @mycodemap/mycodemap
- Dual parsing mode: `fast` (regex) and `smart` (TypeScript AST)
- Multi-format output: AI_MAP.md, CONTEXT.md, codemap.json
- Dependency graph visualization (Mermaid format)
- Incremental caching with file hash-based LRU
- Watch mode for file change detection
- Complexity analysis (cyclomatic, cognitive complexity, maintainability)

#### Orchestration Layer
- Intent routing for analyze operations
- Confidence scoring system
- Result fusion from multiple tools
- Tool orchestrator for coordinating adapters
- Test linker for associating tests with source code
- Git analyzer for repository insights
- File header scanner for compliance checks
- Commit validator for CI gateway

#### CI Gateway
- Commit format validation (`[TAG] scope: message`)
- File count limit enforcement (≤10 files per commit)
- File header checks (`[META]` and `[WHY]` tags required)
- Risk assessment for changes
- Output contract validation

#### Workflow Orchestration
- Stage management for complex operations
- Context persistence across sessions
- Checkpoint mechanism for resumable workflows
- CI executor integration

#### CLI Commands
- `mycodemap init` - Initialize configuration
- `mycodemap generate` - Generate code map
- `mycodemap query` - Query symbols/modules/dependencies
- `mycodemap deps` - Analyze dependencies
- `mycodemap cycles` - Detect circular dependencies
- `mycodemap complexity` - Analyze code complexity
- `mycodemap impact` - Analyze change impact
- `mycodemap analyze` - Unified analysis with intent routing
- `mycodemap ci` - CI gateway commands
- `mycodemap workflow` - Workflow orchestration
- `mycodemap watch` - Watch mode for continuous analysis
- `mycodemap report` - Generate analysis reports with log aggregation
- `mycodemap logs` - Manage runtime logs (list/export/clear)

#### Platform & Compatibility
- Platform support detection (macOS, Linux, Windows)
- Node.js version validation (>=18.0.0)
- Tree-sitter availability check (on-demand)
- First-run guide for new users
- **Backward compatibility**: `codemap` command alias
- **Config migration**: Auto-detect old `.codemap` directory
- **Environment variables**: Dual prefix support (`MYCODEMAP_*` / `CODEMAP_*`)

#### Utilities
- Sensitive data sanitization for reports (API keys, tokens, passwords)
- Runtime logging with rotation and retention
- Path resolution with legacy fallback

#### Package & Distribution
- Scoped package: `@mycodemap/mycodemap`
- Dual CLI entry: `mycodemap` (primary) / `codemap` (legacy alias)
- OIDC trusted publishing workflow
- Pack validation script

---

## Migration Notes

### From CodeMap to MyCodeMap

1. **Command alias**: Both `mycodemap` and `codemap` work during transition period
2. **Config file**: Auto-detects `mycodemap.config.json` or `codemap.config.json`
3. **Output directory**: Auto-detects `.mycodemap` or `.codemap`
4. **Environment variables**: Both `MYCODEMAP_*` and `CODEMAP_*` are supported (new prefix preferred)

See full documentation in [README.md](./README.md) for detailed usage.
