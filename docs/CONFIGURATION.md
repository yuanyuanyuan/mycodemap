<!-- generated-by: gsd-doc-writer -->

# Configuration

## Config File Resolution

CodeMap reads config files in this order:

1. `.mycodemap/config.json`
2. `mycodemap.config.json`
3. `codemap.config.json`

`mycodemap init` writes the canonical config under `.mycodemap/config.json` unless you are explicitly using a legacy path.

## Config File Format

The configuration file is JSON-based. The canonical location is `.mycodemap/config.json`, with fallback to `mycodemap.config.json` or `codemap.config.json` in the project root.

Top-level keys:

| Key | Type | Default | Description |
|---|---|---|---|
| `$schema` | string | `https://mycodemap.dev/schema/config.json` | JSON Schema reference for editor tooling |
| `mode` | string | `"tree-sitter"` | Parser mode. Only `"tree-sitter"` is valid; legacy values (`fast`, `smart`, `hybrid`) are rejected. |
| `include` | string[] | `["src/**/*.ts"]` | Glob patterns to include in analysis |
| `exclude` | string[] | See defaults below | Glob patterns to exclude from analysis |
| `output` | string | `".mycodemap"` | Output directory for generated files |
| `watch` | boolean | `false` | Enable watch mode for file changes |
| `storage` | object | See below | Storage backend configuration |
| `plugins` | object | See below | Plugin loading options |

Example:

```json
{
  "$schema": "https://mycodemap.dev/schema/config.json",
  "mode": "tree-sitter",
  "include": ["src/**/*.ts"],
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

## Defaults

The following defaults are applied when a key is omitted from the config file or no config file exists:

| Key | Default | Source |
|---|---|---|
| `mode` | `"tree-sitter"` | `src/cli/config-loader.ts:42` |
| `include` | `["src/**/*.ts"]` | `src/cli/config-loader.ts:43` |
| `exclude` | `["node_modules/**", "dist/**", "build/**", "coverage/**", ".venv/**", "**/__pycache__/**", "vendor/**", "**/*.test.ts", "**/*.spec.ts", "**/*.d.ts"]` | `src/core/file-discovery.ts:8` |
| `output` | `".mycodemap"` | `src/cli/config-loader.ts:44` |
| `watch` | `false` | `src/cli/config-loader.ts:254` |
| `storage.type` | `"sqlite"` | `src/cli/config-loader.ts:243` |
| `storage.databasePath` | `".mycodemap/governance.sqlite"` | `src/cli/config-loader.ts:244` |
| `plugins.builtInPlugins` | `true` | `src/cli/config-loader.ts:235` |
| `plugins.plugins` | `[]` | `src/cli/config-loader.ts:236` |
| `plugins.debug` | `false` | `src/cli/config-loader.ts:237` |

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

| Variable | Required | Default | Description |
|---|---|---|---|
| `MYCODEMAP_RUNTIME_LOG_ENABLED` | Optional | `true` | Enable or disable runtime logs |
| `MYCODEMAP_RUNTIME_LOG_DIR` | Optional | `.mycodemap/logs` | Set the runtime log directory |
| `MYCODEMAP_RUNTIME_LOG_RETENTION_DAYS` | Optional | `14` | Retain logs for this many days |
| `MYCODEMAP_RUNTIME_LOG_MAX_FILES` | Optional | `30` | Cap the number of runtime log files |
| `MYCODEMAP_RUNTIME_LOG_MAX_SIZE_MB` | Optional | `10` | Cap the size of a single runtime log file |
| `CODEMAP_USE_WASM_TREE_SITTER` | Optional | — | Force the tree-sitter loader to use WASM when set to `1` |
| `CODEMAP_USE_WASM_BETTER_SQLITE3` | Optional | — | Force SQLite fallback behavior when set to `1` |
| `GITHUB_TOKEN` | Optional | — | Preferred token for release monitoring and GitHub API access |
| `GH_TOKEN` | Optional | — | Fallback token for release monitoring |
| `SHIP_IN_CI` | Optional | — | Skip local release checks inside CI when set to `1` |

The runtime logger accepts the `CODEMAP_*` legacy variables as fallbacks for the newer `MYCODEMAP_*` names:

- `CODEMAP_RUNTIME_LOG_ENABLED` → fallback for `MYCODEMAP_RUNTIME_LOG_ENABLED`
- `CODEMAP_RUNTIME_LOG_DIR` → fallback for `MYCODEMAP_RUNTIME_LOG_DIR`
- `CODEMAP_RUNTIME_LOG_RETENTION_DAYS` → fallback for `MYCODEMAP_RUNTIME_LOG_RETENTION_DAYS`
- `CODEMAP_RUNTIME_LOG_MAX_FILES` → fallback for `MYCODEMAP_RUNTIME_LOG_MAX_FILES`
- `CODEMAP_RUNTIME_LOG_MAX_SIZE_MB` → fallback for `MYCODEMAP_RUNTIME_LOG_MAX_SIZE_MB`

## Required vs Optional Settings

All configuration settings are optional. CodeMap starts successfully with no configuration file and no environment variables set. If a config file is present, any omitted keys use the built-in defaults listed above. Invalid values (such as deprecated parser modes or unsupported storage types) cause the CLI to exit with an error rather than falling back silently.

## Per-Environment Overrides

No per-environment config files (`.env.development`, `.env.production`, `.env.test`) are built into CodeMap. Environment-specific behavior is controlled through:

- **Environment variables** — set `MYCODEMAP_RUNTIME_LOG_ENABLED=false` in CI to disable log noise, or `SHIP_IN_CI=1` to skip local release checks.
- **WASM toggles** — `CODEMAP_USE_WASM_TREE_SITTER` and `CODEMAP_USE_WASM_BETTER_SQLITE3` can be set per environment to force fallback behavior.
- **Separate config files** — you can maintain distinct config files and point to them by placing the appropriate file in the project root, since CodeMap resolves `.mycodemap/config.json` → `mycodemap.config.json` → `codemap.config.json` in that order.

## Operational Notes

- `mycodemap generate` writes to `.mycodemap/` unless the config overrides `output`.
- `mycodemap benchmark` toggles the WASM environment variables internally for each measurement.
- `mycodemap ship` and release monitoring use GitHub token settings from the environment.
