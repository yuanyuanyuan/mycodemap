<!-- generated-by: gsd-doc-writer -->

# CodeMap

CodeMap is an AI-Native TypeScript code map tool for AI-assisted development. It analyzes a repository, builds symbol and dependency graphs, exposes the results through a CLI, HTTP API, and MCP server, and writes structured artifacts that agents can consume directly.

AI/Agent 是主要消费者，人类主要负责启动、审查和发布。

## What it ships

- `mycodemap` as the primary CLI entry point, with `codemap` kept as a compatibility alias.
- A tree-sitter based analysis pipeline with deprecated parser modes rejected at the entry points.
- A REST API mounted under `/api/v1` and an experimental MCP server for AI tooling.
- Workspace artifacts under `.mycodemap/`, including `codemap.json` and generated reports.

## Install

```bash
npm install -g @mycodemap/mycodemap
```

Requirements:

- Node.js `>= 20.0.0`
- A project with source files to analyze

## Quick Start

```bash
mycodemap init
mycodemap init --yes
mycodemap generate
mycodemap doctor
```

`mycodemap init` previews the reconciliation plan by default. Use `--yes` to apply it immediately, or `--profile <name>` to bypass auto-detection.

`mycodemap generate` writes analysis output to `.mycodemap/` by default. The canonical config path is `.mycodemap/config.json`; the loader still accepts `mycodemap.config.json` and legacy `codemap.config.json` for compatibility.

## Main Commands

| Command | Purpose |
|---|---|
| `mycodemap generate` | Analyze the project and write the code map artifacts |
| `mycodemap query` | Search symbols, modules, and dependencies |
| `mycodemap deps` | Inspect module dependency relationships |
| `mycodemap cycles` | Detect circular dependencies |
| `mycodemap complexity` | Inspect file and function complexity |
| `mycodemap impact` | Estimate the impact of a file change |
| `mycodemap analyze` | Unified analysis entry with intent-driven output |
| `mycodemap doctor` | Run health diagnostics for config, runtime, and agents |
| `mycodemap benchmark` | Compare WASM and native startup/performance |
| `mycodemap export` | Export graph data as JSON, GraphML, DOT, or Mermaid |
| `mycodemap ship` | Release workflow helpers |

Additional operational commands include `ci`, `check`, `workflow`, `history`, `preview`, `env-contract`, `mcp`, and `readiness-gate`.

### 已移除的公共 CLI 命令

- `mycodemap server`
- `mycodemap watch`
- `mycodemap report`
- `mycodemap logs`

These commands are no longer part of the public CLI surface. Use the current `mycodemap` entry points and the `/api/v1` HTTP server instead.

`server`、`watch`、`report`、`logs` 已从 public CLI 移除，并在调用时给出迁移提示。

## Documentation

- [AI Guide](AI_GUIDE.md)
- [Getting Started](docs/GETTING-STARTED.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Configuration](docs/CONFIGURATION.md)
- [API Reference](docs/API.md)
- [Contributing](CONTRIBUTING.md)
- [Architecture](ARCHITECTURE.md)

## Validation

```bash
npm run docs:check
node dist/cli/index.js ci check-docs-sync
mycodemap ci check-docs-sync
mycodemap check --contract mycodemap.design.md --against src
npm run check:all
```

文档/入口变更先跑 `npm run docs:check`。
统一 docs/AI guardrail 入口：`node dist/cli/index.js ci check-docs-sync`（产品命令等价于 `mycodemap ci check-docs-sync`）。
repo-local rules 预检：`python3 scripts/validate-rules.py code --report-only` 只报告，不阻断。
CI / PR 超窗、fallback 或 false-positive 漂移时，`warn-only / fallback` 不是 hard gate success。

## License

MIT. See [LICENSE](LICENSE).

---

## Validation Appendix

### Analyze Examples

```bash
mycodemap analyze -i find -k SourceLocation
mycodemap analyze -i read -t src/cli/index.ts --include-tests --json
mycodemap analyze -i link -t src/cli/index.ts
mycodemap analyze -i show -t src/orchestrator
```

`refactor` 会返回 `E0001_INVALID_INTENT`

### History Risk

```bash
# 默认输出 machine-first JSON
mycodemap history --symbol createCheckCommand
```

# 查询某个符号的历史轨迹与风险摘要
mycodemap history --symbol createCheckCommand

### `mycodemap history`

符号级 Git history / risk 查询：

```bash
# 默认输出 machine-first JSON
mycodemap history --symbol createCheckCommand
```

`--include-git-history` 现在只会在 `read` intent 上附加统一的 Git history enrichment；其他 intent 会显式给出 warning，而不是 silent noop。

`ci assess-risk` 现在输出 `status/confidence/freshness/source` 与统一 risk level；若 Git history 不可用，会显式打印 `unavailable` / warning，并说明阈值未被应用。

`check` / `ci assess-risk` / `history` 现在共用同一套 Git history risk truth；history unavailable 时会显式给出 `unavailable` / `confidence=low`

```bash
node dist/cli/index.js history --symbol createCheckCommand
node scripts/report-high-risk-files.mjs --top 3
```

### Design Contract

```bash
mycodemap design validate mycodemap.design.md --json
mycodemap design map mycodemap.design.md --json
mycodemap design handoff mycodemap.design.md --json
mycodemap design verify mycodemap.design.md --json
mycodemap check --contract mycodemap.design.md --against src
```

```bash
--annotation-format github
--annotation-format gitlab --annotation-file gl-code-quality-report.json
node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10
```

`changed files <= 10`

`warn-only / fallback`

`false-positive rate >10%`

`docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`

`mycodemap.design.md`

`design validate → design map → design handoff → design verify`

### Config Contract

执行后会收敛 `.mycodemap/config.json`，并把 machine-readable receipt 写入 `.mycodemap/status/init-last.json`。

`init` 还会同步 `.mycodemap/hooks/` 与 `.mycodemap/rules/`；但不会自动改写团队自有的 `CLAUDE.md` / `AGENTS.md`，只会在 receipt 中输出可复制片段。

通过 `mycodemap init` 收敛的 canonical 配置文件是 `.mycodemap/config.json`

```json
{
  "$schema": "https://mycodemap.dev/schema/config.json",
  "mode": "hybrid",
  "plugins": {
    "builtInPlugins": true
  },
  "outputPath": ".mycodemap/storage"
}
```

| `plugins.builtInPlugins` | `boolean` | 是否启用内置插件 | `true` |

### Plugin Runtime

只有**显式声明了** `plugins` 段时，`generate` 才会启用插件 runtime；没有该段的旧项目保持原有行为。

`AI_MAP.md` 的 `Plugin Summary` 与 `codemap.json` 的 `pluginReport`

已加载插件、插件生成文件数量与插件诊断摘要

### Graph Storage

```json
{
  "storage": {
    "type": "filesystem"
  }
}
```

| `storage.type` | `"filesystem" \| "sqlite" \| "memory" \| "auto"` | 图存储后端类型 | `"filesystem"` |

`neo4j` 与 `kuzudb` 已不再是正式支持的 backend；旧配置会返回显式迁移错误，不会静默 fallback 到 `filesystem`。

`storage.type = "auto"` 当前优先选择 `sqlite`；若运行时缺少 `better-sqlite3` 或 Node.js `<20` 导致 SQLite 不可用，则 warning 后回退到 `filesystem`。

图存储后端生产化不等于重新开放公共 HTTP API 产品面；`Server Layer` 仍是内部架构层。

### Workflow / Discovery

`workflow` 是公开的 analysis-only 工作流能力，只编排分析阶段：`find → read → link → show`。

共享同一套 `.gitignore` 感知排除规则

```text
"coverage/**"
"**/*.test.ts"
"**/*.spec.ts"
"**/*.d.ts"
```

`mycodemap ship` 的 CHECK 阶段现在复用 `ci check-working-tree`、`ci check-branch`、`ci check-scripts`

### Guardrail Commands

```text
npm run docs:check
node dist/cli/index.js ci check-docs-sync
mycodemap ci check-docs-sync
mycodemap check --contract mycodemap.design.md --against src
python3 scripts/validate-rules.py code --report-only
```

文档/入口变更先跑 `npm run docs:check`。
统一 docs/AI guardrail 入口：`node dist/cli/index.js ci check-docs-sync`（产品命令等价于 `mycodemap ci check-docs-sync`）。
repo-local rules 预检：`python3 scripts/validate-rules.py code --report-only` 只报告，不阻断。
CI / PR 超窗、fallback 或 false-positive 漂移时，`warn-only / fallback` 不是 hard gate success。
