<!-- generated-by: gsd-doc-writer -->

# Configuration

MyCodeMap is configured through a JSON config file and optional environment variables. The CLI also accepts flags that override config file values at runtime.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MYCODEMAP_RUNTIME_LOG_ENABLED` | No | `true` | Enable or disable runtime log writing. Set to `false` to disable. |
| `MYCODEMAP_RUNTIME_LOG_DIR` | No | `.mycodemap/logs` | Directory path for runtime log files. Relative paths resolve from the project root. |
| `MYCODEMAP_RUNTIME_LOG_RETENTION_DAYS` | No | `14` | Number of days to retain runtime log files before cleanup. |
| `MYCODEMAP_RUNTIME_LOG_MAX_FILES` | No | `30` | Maximum number of runtime log files to keep. Oldest files are deleted first. |
| `MYCODEMAP_RUNTIME_LOG_MAX_SIZE_MB` | No | `10` | Maximum size (in MB) of a single log file before rotation kicks in. |
| `CODEMAP_USE_WASM_TREE_SITTER` | No | (unset) | Set to `1` to force WASM tree-sitter; set to `0` to force native. Controlled by `--wasm-fallback` and `--native` CLI flags. |
| `CODEMAP_USE_WASM_BETTER_SQLITE3` | No | (unset) | Set to `1` to force WASM better-sqlite3; set to `0` to force native. Controlled by `--wasm-fallback` and `--native` CLI flags. |
| `GITHUB_TOKEN` | No | (unset) | GitHub personal access token. Used by the `ship` command for release operations. Falls back to `GH_TOKEN`. |
| `SHIP_IN_CI` | No | (unset) | Set to `1` in CI environments to enable ship-from-CI behavior in the `ci` command. |

**Deprecated environment variables** (still accepted with a deprecation warning):

| Deprecated Variable | Replacement |
|---|---|
| `CODEMAP_RUNTIME_LOG_ENABLED` | `MYCODEMAP_RUNTIME_LOG_ENABLED` |
| `CODEMAP_RUNTIME_LOG_DIR` | `MYCODEMAP_RUNTIME_LOG_DIR` |
| `CODEMAP_RUNTIME_LOG_RETENTION_DAYS` | `MYCODEMAP_RUNTIME_LOG_RETENTION_DAYS` |
| `CODEMAP_RUNTIME_LOG_MAX_FILES` | `MYCODEMAP_RUNTIME_LOG_MAX_FILES` |
| `CODEMAP_RUNTIME_LOG_MAX_SIZE_MB` | `MYCODEMAP_RUNTIME_LOG_MAX_SIZE_MB` |

The runtime logger uses a fallback mechanism: it reads the new `MYCODEMAP_*` key first; if absent, it falls back to the old `CODEMAP_*` key and prints a deprecation warning to stderr.

## Config File Format

MyCodeMap uses a JSON config file. The canonical path is `.mycodemap/config.json` inside the project root. The config loader searches for the file in this order:

1. `.mycodemap/config.json` (canonical)
2. `mycodemap.config.json` (project root)
3. `codemap.config.json` (legacy, triggers migration warning)

If no config file exists, all defaults from `createDefaultCodemapConfig()` are used.

Generate a starter config by running:

```bash
mycodemap init
```

### Minimal working config

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

### Top-level keys

| Key | Type | Description |
|---|---|---|
| `$schema` | `string` | JSON Schema URL for editor validation and autocomplete. |
| `mode` | `string` | Parser mode. Only `"tree-sitter"` is valid. See [Parser mode](#parser-mode). |
| `include` | `string[]` | Glob patterns for files to include in analysis. |
| `exclude` | `string[]` | Glob patterns for files to exclude from analysis. |
| `output` | `string` | Output directory for generated artifacts. Default: `.mycodemap`. |
| `watch` | `boolean` | Enable file-watching mode. Default: `false`. |
| `storage` | `object` | Storage backend configuration. See [Storage config](#storage-config). |
| `plugins` | `object` | Plugin system configuration. See [Plugin config](#plugin-config). |

## Required vs Optional Settings

No config file keys are strictly required at startup. When the config file is absent or a key is missing, defaults are applied.

The following settings cause **runtime errors** if set to invalid values:

| Setting | Invalid value | Error code | Behavior |
|---|---|---|---|
| `mode` | `"fast"`, `"smart"`, `"hybrid"` | `DEPRECATED_PARSER_MODE` | Throws with remediation: remove the field or set to `"tree-sitter"`. |
| `mode` | Any string other than `"tree-sitter"` | (generic error) | Throws: "mode only supports tree-sitter". |
| `storage.type` | `"filesystem"`, `"kuzudb"` | `UNSUPPORTED_STORAGE_TYPE` | Throws with remediation: change to `"sqlite"` or `"auto"`. |
| `storage.type` | `"neo4j"` or presence of `storage.uri`/`storage.username`/`storage.password` | `UNSUPPORTED_STORAGE_TYPE` | Throws with remediation: remove Neo4j fields, use `"sqlite"`. |
| `storage.autoThresholds` | Any value | `CFG_INVALID_CONFIG` | Throws: autoThresholds is deprecated; "auto" now only routes within the SQLite family. |

## Defaults

All defaults are defined in `src/cli/config-loader.ts`.

| Setting | Default value | Source |
|---|---|---|
| `mode` | `"tree-sitter"` | `DEFAULT_CONFIG_MODE` |
| `include` | `["src/**/*.ts"]` | `DEFAULT_CONFIG_INCLUDE` |
| `exclude` | `["node_modules/**", "dist/**", "build/**", "coverage/**", ".venv/**", "**/__pycache__/**", "vendor/**", "**/*.test.ts", "**/*.spec.ts", "**/*.d.ts"]` | `DEFAULT_DISCOVERY_EXCLUDES` |
| `output` | `".mycodemap"` | `DEFAULT_CONFIG_OUTPUT` |
| `watch` | `false` | `createDefaultCodemapConfig()` |
| `storage.type` | `"sqlite"` | `createDefaultStorageConfig()` |
| `storage.databasePath` | `".mycodemap/governance.sqlite"` | `createDefaultStorageConfig()` |
| `plugins.builtInPlugins` | `true` | `createDefaultPluginConfig()` |
| `plugins.plugins` | `[]` | `createDefaultPluginConfig()` |
| `plugins.debug` | `false` | `createDefaultPluginConfig()` |

## Parser Mode

The `mode` field controls which parser implementation is used for code analysis.

- **`"tree-sitter"`** (default, only valid value): Uses the tree-sitter-based parser with native bindings (or WASM fallback when native is unavailable).

The following mode values are **deprecated and rejected at config load time**:

| Mode | Error code | Remediation |
|---|---|---|
| `"fast"` | `DEPRECATED_PARSER_MODE` | Remove the `mode` field or set to `"tree-sitter"`. |
| `"smart"` | `DEPRECATED_PARSER_MODE` | Remove the `mode` field or set to `"tree-sitter"`. |
| `"hybrid"` | `DEPRECATED_PARSER_MODE` | Remove the `mode` field or set to `"tree-sitter"`. |

This rejection applies to both the config file and the `--mode` CLI flag. Passing a deprecated mode via CLI will also produce a `DEPRECATED_PARSER_MODE` error.

## Storage Config

The `storage` object configures the persistence backend.

| Key | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | `"sqlite"` | Storage backend type. Valid: `"sqlite"`, `"memory"`, `"auto"`. |
| `databasePath` | `string` | `".mycodemap/governance.sqlite"` | Path to the SQLite database file. Relative paths resolve from project root. |
| `outputPath` | `string` | (none) | Legacy field for filesystem storage. Recognized only to produce migration hints in error messages. |

**Valid `storage.type` values:**

| Type | Use case |
|---|---|
| `"sqlite"` | Production use. Persistent storage via better-sqlite3 (native) or sql.js (WASM). |
| `"memory"` | Testing only. All data is lost when the process exits. |
| `"auto"` | SQLite-family alias. Resolves to the best available SQLite implementation (native preferred, WASM fallback). |

**Deprecated `storage.type` values** (rejected at config load time):

| Type | Error code | Remediation |
|---|---|---|
| `"filesystem"` | `UNSUPPORTED_STORAGE_TYPE` | Change to `"sqlite"` and migrate data to the SQLite database path. |
| `"kuzudb"` | `UNSUPPORTED_STORAGE_TYPE` | Change to `"sqlite"` and migrate data to the SQLite database path. |
| `"neo4j"` | `UNSUPPORTED_STORAGE_TYPE` | Remove `storage.uri`/`storage.username`/`storage.password` and change to `"sqlite"`. |

The `storage.autoThresholds` field is also deprecated and rejected. The `"auto"` type now only selects between SQLite implementations (native vs WASM) and no longer routes to graph database backends.

## Plugin Config

The `plugins` object configures the plugin system.

| Key | Type | Default | Description |
|---|---|---|---|
| `builtInPlugins` | `boolean` | `true` | Enable or disable built-in plugins. |
| `pluginDir` | `string` | (none) | Directory path for external plugins. Relative paths resolve from project root. |
| `plugins` | `string[]` | `[]` | List of plugin names to load. |
| `debug` | `boolean` | `false` | Enable plugin debug output. |

## CLI Flag Overrides

CLI flags take precedence over config file values. When a flag is explicitly provided by the user, it overrides the corresponding config key.

| Flag | Config key | Description |
|---|---|---|
| `--mode <mode>` | `mode` | Override parser mode. Only `"tree-sitter"` is accepted; deprecated modes trigger errors. |
| `--output <dir>` / `-o <dir>` | `output` | Override output directory. |
| `--symbol-level` | (none) | Materialize symbol-level call dependencies into the code graph storage. |
| `--human` | (none) | Force human-readable output format (overrides `--json`). |
| `--native` | (env vars) | Force native binaries for tree-sitter and better-sqlite3. Sets `CODEMAP_USE_WASM_TREE_SITTER=0` and `CODEMAP_USE_WASM_BETTER_SQLITE3=0`. |
| `--wasm-fallback` | (env vars) | Force WASM fallback for tree-sitter and better-sqlite3. Sets `CODEMAP_USE_WASM_TREE_SITTER=1` and `CODEMAP_USE_WASM_BETTER_SQLITE3=1`. |
| `--apply-suggestion` | (none) | Allow automatic execution of remediation suggestions with confidence >= 0.8. |
| `--schema` | (none) | Output the full Interface Contract Schema as JSON to stdout and exit. Bypasses all other startup. |
| `--json` / `-j` | (none) | Output in JSON format (for query/deps/cycles/complexity commands). |

## Interface Contract Schema

The full machine-readable schema for all CLI commands, flags, error codes, and output shapes is available via:

```bash
mycodemap --schema
```

This outputs a JSON document describing the interface contract. It is useful for AI tool integrations, IDE extensions, and programmatic consumers. The `--schema` flag bypasses all other startup side effects to keep stdout machine-parseable.

## Per-Environment Overrides

MyCodeMap does not use `.env.development`, `.env.production`, or `.env.test` files. Configuration is per-project via `.mycodemap/config.json`.

To differentiate between environments:

- Use different `config.json` values per project checkout.
- Override specific settings at runtime using CLI flags.
- Set environment variables (e.g., `MYCODEMAP_RUNTIME_LOG_ENABLED=false` for production to disable runtime logging).

## Workspace Directory

The `.mycodemap/` directory is the project workspace. It contains:

| Path | Description |
|---|---|
| `.mycodemap/config.json` | Project configuration file. |
| `.mycodemap/codemap.json` | Generated code map data. |
| `.mycodemap/governance.sqlite` | SQLite database for code graph storage. |
| `.mycodemap/logs/` | Runtime log files. |
| `.mycodemap/context/` | Per-file AI context files. |

The legacy `.codemap/` directory is still detected for backward compatibility, but a migration warning is printed recommending `mv .codemap .mycodemap`.

Run `mycodemap doctor` to diagnose configuration issues, deprecated settings, and workspace drift.
