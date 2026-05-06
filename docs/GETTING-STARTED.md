<!-- generated-by: gsd-doc-writer -->

# Getting Started

A step-by-step guide to install, configure, and run MyCodeMap for the first time.

## Prerequisites

- **Node.js >= 20.0.0** — Required engine version (defined in `package.json` `engines`).
- **npm** (bundled with Node.js) or **yarn** / **pnpm** — For package installation.
- **Build tools (optional)** — If `python`, `make`, and `gcc`/`g++` are available, MyCodeMap uses native binaries for maximum performance. If not, WASM fallback activates automatically with no manual intervention.

No environment variables are required for basic usage.

## Installation Steps

1. **Install globally (recommended for CLI access):**

   ```bash
   npm install -g @mycodemap/mycodemap
   ```

   Alternative package managers:

   ```bash
   yarn global add @mycodemap/mycodemap
   pnpm add -g @mycodemap/mycodemap
   ```

   Or install as a project dev dependency:

   ```bash
   npm install --save-dev @mycodemap/mycodemap
   ```

2. **Verify the installation:**

   ```bash
   mycodemap --help
   ```

   The CLI is also available as `codemap` (alias):

   ```bash
   codemap --help
   ```

3. **Navigate to your project root:**

   ```bash
   cd /path/to/your/project
   ```

## First Run

The fastest path from install to working output:

1. **Initialize the workspace:**

   ```bash
   mycodemap init -y
   ```

   This creates a `.mycodemap/` directory with a default `config.json`. The `-y` flag writes defaults without prompting. Without `-y`, `mycodemap init` shows a reconciliation preview and lets you choose a profile interactively.

2. **Generate the code map:**

   ```bash
   mycodemap generate
   ```

   This analyzes your project using the tree-sitter parser (the only active parser mode) and writes output to `.mycodemap/`.

3. **View the results:**

   ```bash
   ls .mycodemap/
   ```

   Key output files:

   | File | Description |
   |------|-------------|
   | `AI_MAP.md` | Project overview for AI assistants |
   | `CONTEXT.md` | Context entry that links to detailed module contexts |
   | `codemap.json` | Structured JSON data of the full code map |
   | `dependency-graph.md` | Mermaid dependency diagram |
   | `context/` | Per-module context files |

4. **Run a health check:**

   ```bash
   mycodemap doctor
   ```

   This diagnoses native dependency status, config integrity, workspace drift, and agent connectivity.

## Common Setup Issues

### 1. "Native dependency compilation failed"

**Symptom**: Errors mentioning `node-gyp`, `python`, or `make` during `npm install -g`.

**Solution**: MyCodeMap ships with WASM fallback. The install should still succeed — `tree-sitter` falls back to `web-tree-sitter` (WASM) and `better-sqlite3` falls back to `sql.js` (WASM) or `node:sqlite` (Node.js 22+). No manual action is needed. If you want native performance later, install build tools and reinstall:

```bash
mycodemap --native generate
```

### 2. "DEPRECATED_PARSER_MODE" error

**Symptom**: Running `mycodemap generate --mode fast` (or `smart`, `hybrid`) produces an error.

**Solution**: The `fast`, `smart`, and `hybrid` parser modes are deprecated. The only active parser mode is `tree-sitter`, which is the default. Simply omit the `--mode` flag:

```bash
mycodemap generate
```

If your config file contains a deprecated `mode` value, remove the `mode` field or set it to `"tree-sitter"`. Run `mycodemap doctor` for automated detection.

### 3. "UNSUPPORTED_STORAGE_TYPE" error

**Symptom**: Config references `filesystem`, `kuzudb`, or `neo4j` as the storage type.

**Solution**: Storage has converged to the SQLite family. Change `storage.type` in `.mycodemap/config.json` to `"sqlite"` (for persistence) or `"memory"` (for testing). Remove any `storage.uri`, `storage.username`, or `storage.password` fields if present.

### 4. Output is JSON when I expected tables

**Symptom**: Commands like `query` or `impact` output JSON instead of formatted tables.

**Solution**: MyCodeMap defaults to JSON output for AI/agent compatibility. Use the `--human` flag for table/color output on demand, or let TTY auto-detection handle it in interactive terminals:

```bash
mycodemap query -s "ModuleInfo" --human
```

## Next Steps

- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — Understand the system internals, module boundaries, and data flow.
- **[docs/CONFIGURATION.md](CONFIGURATION.md)** — Full configuration reference including all env vars, config keys, and CLI flag overrides.
- **[AI_GUIDE.md](../AI_GUIDE.md)** — AI/Agent usage guide with command decision trees and prompt templates.
- **[docs/ai-guide/INTEGRATION.md](ai-guide/INTEGRATION.md)** — MCP and agent integration setup.

For subagent setup, generate an environment contract:

```bash
mycodemap env-contract --for worker --json
```
