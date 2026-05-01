# CodeMap

> AI-Native, Human-Friendly Code Architecture Governance Infrastructure — `v2.0` Milestone

[中文版本](./README.zh-CN.md)

CodeMap is an AI-Native-first, human-friendly code architecture governance infrastructure for TypeScript/JavaScript/Go projects. `v2.0` upgraded the CLI surface to a schema-driven self-describing unified interface: a single contract schema simultaneously generates the parser, MCP tool definitions, `--help-json`, and shell completions. `codemap doctor` provides continuous health diagnostics, the `Failure-to-Action Protocol` turns errors into structured state transitions, and the WASM-first build foundation eliminates the #1 installation drop-off caused by native dependency compilation failures. Human users get table/color output via `--human` or TTY auto-detection; AI/Agents receive JSON/NDJSON by default.

---

## Features

### v2.0 Core Features

- **Interface Contract Schema** — A single machine-readable schema defines the entire CLI surface; `codemap --schema` outputs the full contract JSON for agent introspection and dynamic adaptation
- **CLI-as-MCP Automatic Gateway** — All schema-defined CLI commands are automatically exposed as MCP tools with zero handwritten maintenance; new commands automatically get MCP exposure
- **AI-First Default Output** — JSON/NDJSON by default; `--human` flag renders tables/colors on demand; TTY auto-detection preserves interactive experience; progress events go to stderr
- **`codemap doctor`** — Continuous health diagnostics detecting ghost commands, native dependency issues, workspace drift, and agent connectivity
- **Failure-to-Action Protocol** — Every error returns structured `rootCause` + `remediationPlan` + `confidence` + `nextCommand`; agents can attempt automatic remediation
- **Validation Router** — Routes minimal verification by change type; docs guardrail validates that referenced commands are real and runnable
- **WASM-First Build Foundation** — `tree-sitter` / `better-sqlite3` provide WASM fallback paths; `--native` forces native mode; `codemap benchmark` compares WASM vs Native performance

### Core Capabilities

- **AI-first code map** — Generates `AI_MAP.md`, `CONTEXT.md`, `codemap.json`, and other AI/Agent-consumable context
- **Core analysis commands** — `generate`, `query`, `deps`, `impact`, `complexity`, `cycles`, `analyze`, `design`, `export`, `ci`
- **Layered architecture (MVP3)** — Clear boundaries: `Interface → Infrastructure → Domain → Server → CLI`
- **Dual parsing modes** — `fast` (regex) and `smart` (TypeScript AST)
- **Multi-language support** — TypeScript/JavaScript, Go, Python (extensible architecture)
- **Dependency / impact / complexity analysis** — For change impact assessment, refactoring inventory, and architecture retrospectives
- **CI gate and docs guardrail** — Commit format, file headers, risk assessment, docs/output contract checks
- **Multi-format export and storage abstraction** — Export graph data with filesystem / memory / sqlite backends

---

## Installation

```bash
# Using npm
npm install @mycodemap/mycodemap

# Using yarn
yarn add @mycodemap/mycodemap

# Using pnpm
pnpm add @mycodemap/mycodemap

# Global install (recommended for CLI access)
npm install -g @mycodemap/mycodemap
```

**Requirements**: Node.js >= 20.0.0

### No Build Tools? No Problem

CodeMap ships with WASM-first fallback. If your system lacks `python`, `make`, or `gcc`:
- `tree-sitter` automatically falls back to `web-tree-sitter` (WASM)
- `better-sqlite3` automatically falls back to `node:sqlite` (Node.js 22+) or `sql.js` (WASM)
- No manual intervention required — fallback activates on first run

### Force Native (Performance)

If you have build tools installed and want maximum performance:
```bash
mycodemap --native <command>
```

---

## Quick Start

```bash
# 1. Initialize configuration in project root
mycodemap init

# 2. Generate code map
mycodemap generate

# 3. View generated files
ls .mycodemap/
# AI_MAP.md        - Project overview (for AI)
# CONTEXT.md       - Context entry (links to context/README.md)
# context/         - Detailed module contexts
# codemap.json     - Structured JSON data
# dependency-graph.md - Mermaid dependency graph
```

```bash
# 4. For AI/Agent: structured output is the default
mycodemap impact -f src/cli/index.ts -j

# Human-readable output on demand
mycodemap analyze -i read -t src/cli/index.ts --human

# Human design → design contract → AI/Agent consumption
cp docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md mycodemap.design.md
mycodemap design validate mycodemap.design.md --json
mycodemap design map mycodemap.design.md --json
mycodemap design handoff mycodemap.design.md --json
mycodemap design verify mycodemap.design.md --json
```

After generation, provide `.mycodemap/AI_MAP.md` to your AI assistant for rapid project understanding. For structured results, use JSON/machine mode.

---

## CLI Commands

### `mycodemap init`

Initialize and reconcile the project's CodeMap workspace / config / hooks / rules state.

```bash
mycodemap init               # Show reconciliation preview (default: no write)
mycodemap init --interactive # Explicitly show preview (same as default)
mycodemap init -y            # Write with defaults
```

### `mycodemap generate`

Analyze the project and generate code map files.

```bash
mycodemap generate                    # Default hybrid mode
mycodemap generate -m smart           # Smart mode (AST deep analysis)
mycodemap generate -o ./docs/codemap  # Custom output directory
mycodemap generate --symbol-level     # Extra symbol-level call deps
```

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | Analysis mode: `fast`, `smart`, or `hybrid` | `hybrid` |
| `-o, --output <dir>` | Output directory | `.mycodemap` |
| `--symbol-level` | Materialize symbol-level `call` deps | `false` |

### `mycodemap query`

Query symbols, modules, and dependencies in the code map.

```bash
mycodemap query -s "ModuleInfo"        # Exact symbol query
mycodemap query -m "src/parser"        # Module info
mycodemap query -S "cache"             # Fuzzy search
mycodemap query -S "parse" -j          # JSON output
```

### `mycodemap analyze`

Unified analysis entry with four intents: `find`, `read`, `link`, `show`.

```bash
mycodemap analyze -i find -k SourceLocation
mycodemap analyze -i read -t src/cli/index.ts --scope transitive
mycodemap analyze -i link -t src/cli/index.ts
mycodemap analyze -i show -t src/orchestrator
```

### `mycodemap --schema`

Output the full Interface Contract Schema JSON for agent introspection.

```bash
mycodemap --schema           # Full contract output
mycodemap --schema | jq '.'  # Pretty-print with jq
```

### `mycodemap doctor`

Continuous health diagnostics for the CodeMap ecosystem.

```bash
mycodemap doctor              # Human-readable report
mycodemap doctor --json       # Machine-readable JSON
```

| Category | Checks |
|----------|--------|
| **install** | Native deps (`tree-sitter`, `better-sqlite3`) load status |
| **config** | `.mycodemap/` workspace configuration integrity |
| **runtime** | Ghost commands, command stubs, package.json consistency |
| **agent** | MCP connectivity, schema validity, tool registration |

### `mycodemap benchmark`

Compare WASM vs Native performance.

```bash
mycodemap benchmark              # Default benchmark
mycodemap benchmark --wasm       # Force WASM mode
mycodemap benchmark --native     # Force Native mode
```

### MCP Integration (CLI-as-MCP Gateway)

v2.0 MCP integration has upgraded from an experimental 2-tool slice to the **CLI-as-MCP Automatic Gateway**: all schema-defined CLI commands are automatically exposed as MCP tools.

```bash
mycodemap mcp install    # Write local server config to `.mcp.json`
mycodemap mcp start      # Start local stdio MCP server
```

- All 20+ schema-defined CLI commands are callable via MCP
- Dynamic tool registration: add command to schema → restart MCP server → new tool appears automatically
- See `docs/ai-guide/INTEGRATION.md` for details

---

## Documentation

### For Human Users

| Document | Audience | Content |
|----------|----------|---------|
| [🧭 Docs Index](docs/README.md) | All readers | Document layers, reading order, migration status |
| [🏗️ Architecture](ARCHITECTURE.md) | Developers | System map, module boundaries, main execution flows |
| [📖 Setup Guide](docs/SETUP_GUIDE.md) | Human developers | Full installation, configuration, and usage guide |
| [📁 Examples](examples/) | All users | Ready-to-use configuration files |

### 🤖 AI / Agent Docs

| Document | Description |
|----------|-------------|
| **[📘 AI_GUIDE.md](AI_GUIDE.md)** | **AI main guide** — quick reference, command decision tree, prompt templates |
| **[🚀 Quick Start](docs/ai-guide/QUICKSTART.md)** | Scenario-to-command mapping |
| **[📚 Commands](docs/ai-guide/COMMANDS.md)** | Full CLI command reference |
| **[📊 Output Schema](docs/ai-guide/OUTPUT.md)** | JSON output structure parsing |
| **[🔧 Integration](docs/ai-guide/INTEGRATION.md)** | MCP/Agent integration, error handling |
| **[🛡️ AGENTS.md](AGENTS.md)** | Repository-level constraints |
| **[⚡ CLAUDE.md](CLAUDE.md)** | AI entry routing |

---

## Contributing

See [README.zh-CN.md](./README.zh-CN.md) for full development setup, commit conventions, and coding standards (中文版本包含完整的开发环境搭建、提交规范和代码规范).

---

## License

[MIT](LICENSE)
