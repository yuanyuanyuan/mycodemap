<!-- generated-by: gsd-doc-writer -->

# Getting Started

## Prerequisites

- Node.js `>= 20.0.0`
- npm, pnpm, or yarn
- A repository with source files to analyze

The tool can run without native build toolchains. When native dependencies are unavailable, the runtime falls back to WASM paths.

## Install

```bash
npm install -g @mycodemap/mycodemap
```

`mycodemap` is the primary binary. `codemap` is kept as an alias.

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

## Common Follow-Up Commands

- `mycodemap query` to search symbols and modules
- `mycodemap deps` to inspect dependencies
- `mycodemap impact -f <file>` to estimate change impact
- `mycodemap benchmark` to compare native and WASM startup paths
- `mycodemap --schema` to inspect the CLI contract

