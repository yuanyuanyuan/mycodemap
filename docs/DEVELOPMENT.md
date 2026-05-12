<!-- generated-by: gsd-doc-writer -->

# Development Guide

## Local setup

Fork and clone the repository, then install dependencies and build:

```bash
git clone https://github.com/yuanyuanyuan/mycodemap.git
cd mycodemap
npm install
npm run build
```

- **Node.js:** `>= 20.0.0` (required by `package.json` `engines`)
- No `.env` file is required for local development.

The build emits compiled output into `dist/`, and the package ships the CLI from `dist/cli/index.js`.

## Build commands

| Command | Description |
|---|---|
| `npm run dev` | Watch TypeScript compilation |
| `npm run build` | Compile the project |
| `npm run postbuild` | Copy static build assets after compilation |
| `npm run typecheck` | Type-check without emitting files |
| `npm run lint` | Run ESLint on `src/` |
| `npm run fix:all` | Auto-fix lint issues |
| `npm test` | Run the Vitest suite |
| `npm run test:all` | Run tests and benchmarks together |
| `npm run test:e2e` | Run workflow and integration-style tests |
| `npm run hooks:smoke` | Run real git commit smoke cases for the managed hook payloads |
| `npm run benchmark` | Run benchmark checks |
| `npm run docs:check` | Validate human and AI documentation |
| `npm run docs:check:human` | Validate human-facing docs only |
| `npm run docs:check:ai` | Validate AI-facing docs only |
| `npm run docs:check:pre-release` | Pre-release docs validation |
| `npm run check:all` | Full local gate (typecheck + lint + test + docs) |
| `npm run check:security` | Run `npm audit` for security issues |
| `npm run validate-pack` | Validate the package before publish |
| `npm run release` | Run the release script |
| `npm run ai:pre-task` | Pre-task validation gate (same as `check:all`) |
| `npm run ai:post-task` | Auto-fix and re-run full validation gate |

## Code style

The project uses **ESLint** with the TypeScript plugin for linting. Configuration lives in `eslint.config.js`.

- **Lint target:** `src/**/*.ts` (test files use relaxed rules)
- **Run lint:** `npm run lint`
- **Auto-fix:** `npm run fix:all`
- **Key rules:** duplicate enum values are errors; unused vars, `any`, and non-null assertions are warnings

There is no Prettier, Biome, or `.editorconfig` configured.

## Branch conventions

No explicit branch naming convention is documented. The CI pipeline runs against `main` and `develop`:

- `main` — stable branch
- `develop` — integration branch

## PR process

Follow these guidelines when opening a pull request:

- Keep each PR focused on a single concern.
- Include tests for any behavior changes.
- Run `npm run check:all` before opening the PR.
- Use the commit format `[TAG] scope: message`. Valid tags: `BUGFIX`, `FEATURE`, `REFACTOR`, `CONFIG`, `DOCS`, `DELETE`.
- For `FEATURE` or `BUGFIX` commits, include a `[证据]` trail (path references or command output) in the commit message or PR description when you have real-world validation evidence.
- Mention any remaining risks or skipped verification explicitly in the PR description.

## Working Rules

- Keep TypeScript files in ESM style with explicit exports.
- Preserve the file headers that carry `[META]` and `[WHY]` annotations in source files.
- Prefer small, surgical changes that match the surrounding code.
- If a change touches CLI behavior, configuration, or public APIs, update the corresponding docs in the same change.
- If a change touches installable Git hook protocol behavior, update `scripts/hooks/templates/protocol-contract.json`, `docs/ai-guide/OUTPUT.md`, and `docs/ai-guide/INTEGRATION.md` in the same change.

## Local Feedback Loop

Recommended loop for most changes:

```bash
npm run typecheck
npm test
npm run docs:check
```

For agent-driven work, `npm run ai:pre-task` and `npm run ai:post-task` wrap the same validation gates used in CI.

## Release Notes

`npm run release` invokes the release script, and `prepublishOnly` runs the pre-release docs check, build, and tests before publish. Treat those flows as gated operations, not casual dev commands.
