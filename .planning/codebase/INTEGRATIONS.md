# External Integrations

**Analysis Date:** 2026-03-24

## CLI and Local Runtime Boundaries

**Primary integration style:**
- Local CLI execution through `dist/cli/index.js`.
- Local filesystem persistence in `.mycodemap/` and `.codemap/storage` through `src/infrastructure/storage/adapters/FileSystemStorage.ts`.

**Implication for future work:**
- Prefer integrating new analysis capabilities as CLI subcommands or internal adapters before adding new network surfaces.

## APIs & Network Services

**HTTP API (built-in server):**
- Hono server stack in `src/server/CodeMapServer.ts`.
- Route definitions in `src/server/routes/api.ts`.
- CLI entrypoint in `src/cli/commands/server.ts`.
- Exposed endpoints include `/api/v1/health`, `/search/*`, `/analysis/impact`, `/analysis/cycles`, and `/stats`.

**Release infrastructure:**
- npm registry publishing configured in `package.json` `publishConfig.registry`.
- GitHub Actions release pipeline in `.github/workflows/publish.yml`.
- Local ship/publish orchestration in `src/cli/commands/ship/publisher.ts`.

## Developer Platform Integrations

**Git / GitHub:**
- CI checks run in `.github/workflows/ci-gateway.yml`.
- Release automation and release-note generation run in `.github/workflows/publish.yml`.
- `src/cli/commands/ship/publisher.ts` pushes commits and tags, with HTTPS fallback via `gh auth token`.
- `scripts/release.sh` prints GitHub Actions and npm package URLs after release commands.

**NPM Registry:**
- Publish target is `https://registry.npmjs.org/`.
- `publish` step is executed by GitHub Actions, while local `ship` prepares commit and tag state.

## Data Storage

**Implemented adapters:**
- `FileSystemStorage` in `src/infrastructure/storage/adapters/FileSystemStorage.ts` is the default persistent backend.
- `MemoryStorage` in `src/infrastructure/storage/adapters/MemoryStorage.ts` is the fast test backend.

**Pluggable but incomplete adapters:**
- `KuzuDBStorage` in `src/infrastructure/storage/adapters/KuzuDBStorage.ts`.
- `Neo4jStorage` in `src/infrastructure/storage/adapters/Neo4jStorage.ts`.
- Loader indirection lives in `src/infrastructure/storage/StorageFactory.ts`.

**Rule for changes:**
- Treat KuzuDB/Neo4j paths as optional extension seams, not stable production backends.

## Analysis Engine Integrations

**Parser / AST stack:**
- `tree-sitter` and `tree-sitter-typescript` power parser features.
- Parser registry lives in `src/infrastructure/parser/index.ts`.
- Legacy parser pipeline still exists in `src/parser/`.

**File watching:**
- `chokidar` integration lives in `src/watcher/file-watcher.ts`.

## Authentication / Secrets

**Detected usage:**
- No stable runtime auth-provider integration is wired into `src/`.
- No application-level `.env` contract is enforced in the runtime code paths inspected.

**Exception path:**
- Release fallback in `src/cli/commands/ship/publisher.ts` shells out to `gh auth token`; treat that as operator auth, not app auth.

## Documentation / Guardrail Integrations

- `scripts/validate-docs.js` enforces README, rules, workflow, and guardrail snippets.
- `scripts/validate-ai-docs.js` enforces AI-facing documentation completeness.
- Tests for docs sync live in `src/cli/__tests__/validate-docs-script.test.ts` and `src/cli/commands/__tests__/ci-docs-sync.test.ts`.

## Not Detected

- No webhook receivers.
- No third-party SaaS SDKs such as Stripe, Supabase, or AWS SDKs in `src/`.
- No dedicated database driver wired into the default runtime path.

---
*Integration analysis: 2026-03-24*
