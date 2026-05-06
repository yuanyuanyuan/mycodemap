<!-- generated-by: gsd-doc-writer -->

# Configuration

## Config File Resolution

CodeMap reads config files in this order:

1. `.mycodemap/config.json`
2. `mycodemap.config.json`
3. `codemap.config.json`

`mycodemap init` writes the canonical config under `.mycodemap/config.json` unless you are explicitly using a legacy path.

## Default Config

The default config is JSON-based and starts with these fields:

- `mode: "tree-sitter"`
- `include`
- `exclude`
- `output: ".mycodemap"`
- `watch: false`
- `storage`
- `plugins`

Example:

```json
{
  "$schema": "https://mycodemap.dev/schema/config.json",
  "mode": "tree-sitter",
  "include": ["src/**/*.{ts,tsx,js,jsx,py,go}"],
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    ".venv/**",
    "**/__pycache__/**",
    "vendor/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.d.ts"
  ],
  "output": ".mycodemap",
  "watch": false,
  "storage": {
    "type": "sqlite",
    "databasePath": ".mycodemap/governance.sqlite"
  },
  "plugins": {
    "builtInPlugins": true,
    "plugins": [],
    "debug": false
  }
}
```

## Storage

Supported storage types:

- `sqlite` default persistent backend
- `memory` for tests and ephemeral runs
- `auto` as a SQLite-family alias

Unsupported legacy backends are rejected:

- `filesystem`
- `kuzudb`
- `neo4j`

The storage factory now routes persistent storage through the SQLite family only.

## Parser Mode

The active parser mode is `tree-sitter`. Deprecated inputs `fast`, `smart`, and `hybrid` are rejected by the CLI and server entry points.

## Environment Variables

| Variable | Purpose |
|---|---|
| `MYCODEMAP_RUNTIME_LOG_ENABLED` | Enable or disable runtime logs |
| `MYCODEMAP_RUNTIME_LOG_DIR` | Set the runtime log directory |
| `MYCODEMAP_RUNTIME_LOG_RETENTION_DAYS` | Retain logs for this many days |
| `MYCODEMAP_RUNTIME_LOG_MAX_FILES` | Cap the number of runtime log files |
| `MYCODEMAP_RUNTIME_LOG_MAX_SIZE_MB` | Cap the size of a single runtime log file |
| `CODEMAP_USE_WASM_TREE_SITTER` | Force the tree-sitter loader to use WASM when set to `1` |
| `CODEMAP_USE_WASM_BETTER_SQLITE3` | Force SQLite fallback behavior when set to `1` |
| `GITHUB_TOKEN` | Preferred token for release monitoring and GitHub API access |
| `GH_TOKEN` | Fallback token for release monitoring |
| `SHIP_IN_CI` | Skip local release checks inside CI |

The runtime logger accepts the `CODEMAP_*` legacy variables as fallbacks for the newer `MYCODEMAP_*` names.

## Operational Notes

- `mycodemap generate` writes to `.mycodemap/` unless the config overrides `output`.
- `mycodemap benchmark` toggles the WASM environment variables internally for each measurement.
- `mycodemap ship` and release monitoring use GitHub token settings from the environment.

