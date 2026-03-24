# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript - main implementation language under `src/`, including CLI, orchestrator, domain, infrastructure, server, and tests.

**Secondary:**
- JavaScript (ESM) - operational scripts under `scripts/` and generated runtime output under `dist/`.
- YAML - CI/CD workflows in `.github/workflows/`.
- Markdown - product, rules, AI guide, and architecture documentation under `docs/`, `README.md`, `AI_GUIDE.md`, and `ARCHITECTURE.md`.

## Runtime

**Environment:**
- Node.js `>=18.0.0` from `package.json`.
- ESM package mode from `package.json` `"type": "module"`.

**Package Manager:**
- npm with lockfile `package-lock.json`.
- Build output goes to `dist/`; source of truth stays in `src/`.

## Frameworks

**Core:**
- `commander` - CLI registration and option parsing in `src/cli/index.ts` and `src/cli-new/index.ts`.
- `tree-sitter` + `tree-sitter-typescript` - AST-driven parsing for legacy analysis pipeline.
- `hono` + `@hono/node-server` - HTTP API surface in `src/server/CodeMapServer.ts` and `src/server/routes/api.ts`.

**Testing:**
- `vitest` - unit and integration testing configured in `vitest.config.ts`.
- `@vitest/coverage-v8` - coverage provider.

**Build/Dev:**
- `typescript` - compilation via `tsc`.
- `eslint` + `@typescript-eslint/*` - lint guardrails in `eslint.config.js`.
- GitHub Actions - CI in `.github/workflows/ci-gateway.yml` and release in `.github/workflows/publish.yml`.

## Key Dependencies

**Critical:**
- `commander` - every public CLI command hangs off `src/cli/index.ts`.
- `tree-sitter` - required by AST-heavy commands guarded by `src/cli/tree-sitter-check.ts`.
- `typhonjs-escomplex` - complexity analysis backend used by complexity-related commands.
- `chalk` and `ora` - human-readable CLI output patterns.

**Infrastructure:**
- `globby` - project file discovery.
- `chokidar` - watch mode in `src/watcher/file-watcher.ts`.
- `hono` - server transport for the MVP3 HTTP layer.

## Configuration

**TypeScript / Lint / Test:**
- `tsconfig.json` - strict ES2022 + ESM + `dist/` output.
- `eslint.config.js` - TypeScript-first lint config with progressive warnings.
- `vitest.config.ts` - default test runner for `src/**/*.test.ts`.
- `vitest.benchmark.config.ts` - separate benchmark config.

**Project / Output:**
- `mycodemap.config.json` and `mycodemap.config.schema.json` - project config contract.
- Runtime outputs appear in `.mycodemap/`; some storage/server paths still reference `.codemap/`.

## Platform Requirements

**Development:**
- Node 18+, npm, git.
- Tree-sitter availability for AST-heavy commands.

**Release / Automation:**
- GitHub Actions access via `.github/workflows/publish.yml`.
- npm public registry publishing via `package.json` `publishConfig`.

## Where To Look First

- Public CLI surface: `src/cli/index.ts`
- Transitional new CLI: `src/cli-new/index.ts`
- Legacy analyzer entry: `src/index.ts`
- MVP3 storage/parser exports: `src/infrastructure/storage/index.ts`, `src/infrastructure/parser/index.ts`
- Domain graph builder: `src/domain/services/CodeGraphBuilder.ts`

---
*Stack analysis: 2026-03-24*
