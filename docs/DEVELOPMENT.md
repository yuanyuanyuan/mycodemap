<!-- generated-by: gsd-doc-writer -->

# Development Guide

## Local Setup

1. **Prerequisites**: Node.js >= 20.0.0 and npm. Check your version:

   ```bash
   node --version   # should be >= 20.0.0
   ```

2. **Clone and install**:

   ```bash
   git clone https://github.com/yuanyuanyuan/mycodemap.git
   cd mycodemap
   npm install
   ```

3. **Build the project** (required before first run):

   ```bash
   npm run build
   ```

   This runs `tsc` followed by a `postbuild` step that copies build assets (via `scripts/copy-build-assets.mjs`). The compiled output lands in `dist/`.

4. **Verify the setup**:

   ```bash
   npm run check:all
   ```

   This runs typecheck, lint, tests, and docs validation in sequence. If it passes, your development environment is ready.

## Build Commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` and copy build assets |
| `npm run dev` | Start TypeScript compiler in watch mode (`tsc --watch`) |
| `npm run typecheck` | Run type checking without emitting files (`tsc --noEmit`) |
| `npm run lint` | Lint `src/` with ESLint |
| `npm run fix:all` | Auto-fix lint issues (`eslint --fix`) |
| `npm test` | Run unit and integration tests with Vitest |
| `npm run test:e2e` | Run end-to-end tests (Vitest with `vitest.e2e.config.ts`) |
| `npm run benchmark` | Execute performance benchmarks (`scripts/run-benchmark.sh`) |
| `npm run test:all` | Run unit tests plus benchmarks |
| `npm run check:all` | Full gate: typecheck + lint + test + docs:check |
| `npm run check:security` | Run `npm audit` for dependency vulnerabilities |
| `npm run docs:check` | Validate all documentation (human + AI) |
| `npm run docs:check:human` | Validate human-authored documentation |
| `npm run docs:check:ai` | Validate AI-authored documentation |
| `npm run docs:check:pre-release` | Pre-release documentation validation |
| `npm run validate-pack` | Validate the npm package before publishing |
| `npm run release` | Execute the release script (`scripts/release.sh`) |
| `npm run ai:pre-task` | Run `check:all` before starting an AI task |
| `npm run ai:post-task` | Auto-fix and re-validate after an AI task |

## Code Style

**ESLint** is the sole linting tool. Configuration lives in `eslint.config.js` (flat config format) using `@typescript-eslint/eslint-plugin` with `@typescript-eslint/parser`.

Key rules:

- **Errors (block CI)**: `no-duplicate-enum-values` -- catches real bugs.
- **Warnings**: `no-undef`, `no-unused-vars` (prefix unused with `_`), `no-explicit-any`, `no-non-null-assertion`.
- **Test files**: Relaxed rules -- `no-unused-vars`, `no-explicit-any`, and `no-non-null-assertion` are off.

Run linting:

```bash
npm run lint            # check
npm run fix:all         # auto-fix
```

**TypeScript** configuration (`tsconfig.json`):

- **Target**: ES2022, **Module**: ESNext (ESM project -- `"type": "module"` in `package.json`)
- **Strict mode**: enabled
- **No implicit returns**: enabled
- **No fallthrough cases in switch**: enabled

There is no Prettier, Biome, or `.editorconfig` in the project. Follow existing code patterns for formatting consistency.

**Code annotations**: The project uses `[META]` and `[WHY]` comment prefixes for traceability (see `docs/rules/code-quality-redlines.md` for details).

## Branch Conventions

No formal branch naming convention is documented. Recent branches in the repository follow a pattern of `phase/` prefixes for milestone work (e.g., `phase/59-parser-cutover`). Feature branches typically use descriptive names.

The default branch is `main`.

## PR Process

No `.github/PULL_REQUEST_TEMPLATE.md` or `CONTRIBUTING.md` exists in the repository. General guidance:

- Use **conventional commits** style for commit messages. Common prefixes observed in the project: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, with optional scope in parentheses.
- Ensure `npm run check:all` passes before pushing.
- Include tests for any new functionality or bug fixes.
- Reference relevant phase or milestone numbers in PR descriptions when applicable.
- CI runs via `.github/workflows/ci-gateway.yml` on push/PR events.

## Architecture Reference

The project follows an MVP3 layered architecture: **CLI -> Server -> Domain -> Infrastructure -> Interface**. Cross-layer imports are forbidden (e.g., Domain must not import from CLI). See [ARCHITECTURE.md](../ARCHITECTURE.md) for the full component diagram, data flow, and key abstractions.

Configuration is managed through `.mycodemap/config.json` with CLI flag overrides. See [CONFIGURATION.md](CONFIGURATION.md) for the full configuration reference.

Testing details (framework setup, coverage, CI integration) are covered in [TESTING.md](TESTING.md).

## High-Impact Files

The following files are entry points or central coordination points -- changes here have broad impact:

- **`src/cli/index.ts`** -- CLI entry point. Registers all commands and initializes runtime logging.
- **`src/core/analyzer.ts`** -- Core analysis orchestration. Coordinates file discovery, parsing, type enhancement, and global index construction.
- **`src/parser/index.ts`** -- Parser facade. Creates `RegistryBackedParser` and enforces deprecated mode rejection.
- **`src/cli/config-loader.ts`** -- Config loading and validation. Defines all default values.
- **`src/interface/types/index.ts`** -- Canonical type definitions (`CodeMap`, `Module`, `Symbol`, `Dependency`, etc.) shared across all layers.
