<!-- generated-by: gsd-doc-writer -->

# Getting Started

## Prerequisites

- Node.js `>= 20.0.0`
- npm, pnpm, or yarn
- A repository with source files to analyze

The tool can run without native build toolchains. When native dependencies are unavailable, the runtime falls back to WASM paths.

## Installation

### Install from npm (recommended for users)

```bash
npm install -g @mycodemap/mycodemap
```

`mycodemap` is the primary binary. `codemap` is kept as an alias.

### Build from source (for contributors)

```bash
git clone https://github.com/yuanyuanyuan/mycodemap.git
cd mycodemap
npm install
npm run build
```

After building, run the CLI locally via `node dist/cli/index.js` or link it:

```bash
npm link
mycodemap --help
```

## First Run

```bash
mycodemap init
```

By default, `init` prints a reconciliation preview. Use `--yes` to apply the plan immediately.

If the repository has a recognizable project marker, `init` can auto-detect a profile. Use `--profile <name>` to override that detection.

Next:

```bash
mycodemap generate
mycodemap doctor
```

`generate` writes analysis artifacts to `.mycodemap/`. `doctor` checks the runtime, workspace, and agent integrations.

## What Gets Written

- `.mycodemap/config.json` as the canonical config file
- `.mycodemap/codemap.json` as the persisted graph data
- `.mycodemap/logs/` for runtime logs when enabled
- additional generated reports depending on the command you run

## Minimal Workflow

1. Install the package.
2. Run `mycodemap init` or `mycodemap init --yes`.
3. Run `mycodemap generate`.
4. Inspect the output in `.mycodemap/`.
5. Run `mycodemap doctor` if something looks off.

## Common Setup Issues

### Command not found after global install

If `mycodemap` is not recognized after `npm install -g`, refresh the shell hash or use `npx`:

```bash
hash -r
npx mycodemap --help
```

### Native dependency build failures

Packages like `tree-sitter` and `better-sqlite3` may require a C++ compiler on your system. If the install fails:

```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# macOS
xcode-select --install
```

When native modules are unavailable, CodeMap falls back to WASM equivalents automatically.

### Node.js version mismatch

CodeMap requires Node.js `>= 20.0.0`. If you see an engine-unsupported error, upgrade Node.js or use a version manager such as `nvm`.

## Common Follow-Up Commands

- `mycodemap query` to search symbols and modules
- `mycodemap deps` to inspect dependencies
- `mycodemap impact -f <file>` to estimate change impact
- `mycodemap benchmark` to compare native and WASM startup paths
- `mycodemap --schema` to inspect the CLI contract

## Next Steps

- See [DEVELOPMENT.md](DEVELOPMENT.md) for local development setup, build commands, and contribution workflow.
- See [TESTING.md](TESTING.md) for how to run the test suite and write new tests.
- See [CONFIGURATION.md](CONFIGURATION.md) for the full config file format, environment variables, and per-environment overrides.
