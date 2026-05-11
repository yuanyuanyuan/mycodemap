<!-- generated-by: gsd-doc-writer -->

# CodeMap

CodeMap is an AI-Native TypeScript code map tool for AI-assisted development. It analyzes a repository, builds symbol and dependency graphs, exposes the results through a CLI, HTTP API, and MCP server, and writes structured artifacts that agents can consume directly.

AI/Agent 是主要消费者，人类主要负责启动、审查和发布。

[![npm version](https://img.shields.io/npm/v/@mycodemap/mycodemap)](https://www.npmjs.com/package/@mycodemap/mycodemap)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/yuanyuanyuan/mycodemap/actions/workflows/ci-gateway.yml/badge.svg)](https://github.com/yuanyuanyuan/mycodemap/actions/workflows/ci-gateway.yml)

## Install

```bash
npm install -g @mycodemap/mycodemap
```

Requirements:

- Node.js `>= 20.0.0`
- A project with source files to analyze

## Quick Start

```bash
# 1. Initialize a project (preview mode)
mycodemap init

# 2. Apply the config with --yes
mycodemap init --yes

# 3. Generate the code map
mycodemap generate
```

`mycodemap init` previews the reconciliation plan by default. Use `--yes` to apply it immediately, or `--profile <name>` to bypass auto-detection.

`mycodemap generate` writes analysis output to `.mycodemap/` by default. The canonical config path is `.mycodemap/config.json`; the loader still accepts <!-- VERIFY: `mycodemap.config.json` --> and legacy <!-- VERIFY: `codemap.config.json` --> for compatibility.

## Usage Examples

### Search symbols across the project

```bash
mycodemap query --symbol createCheckCommand
```

### Analyze with intent-driven output

```bash
mycodemap analyze -i find -k SourceLocation
mycodemap analyze -i read -t src/cli/index.ts --include-tests --json
mycodemap analyze -i link -t src/cli/index.ts
mycodemap analyze -i show -t src/orchestrator
```

### Detect circular dependencies

```bash
mycodemap cycles
```

### Export the dependency graph

```bash
mycodemap export --format mermaid
```

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT. See [LICENSE](LICENSE).
