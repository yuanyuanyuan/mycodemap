# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2] - TBD

### Fixed
- glob v10+ 兼容性问题：更新 ESM 导入语法，使用 named export 替代 default export

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
