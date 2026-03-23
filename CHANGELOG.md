# Changelog

All notable changes to this project will be documented in this file.

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
