# Codebase Structure

**Analysis Date:** 2026-03-24

## Top-Level Layout

- `src/cli/` - current production CLI command registration and operational helpers.
- `src/cli-new/` - transitional MVP3 CLI surface.
- `src/core/` - legacy analyzer pipeline.
- `src/parser/` - legacy parser implementations and AST logic.
- `src/orchestrator/` - intent routing, tool fusion, CI helpers, workflow engine.
- `src/domain/` - domain entities and services for the layered architecture.
- `src/infrastructure/` - parser/storage/repository implementations.
- `src/interface/` - shared contracts and configuration types.
- `src/server/` - Hono server, handlers, routes, and transport types.
- `src/generator/`, `src/cache/`, `src/watcher/`, `src/worker/` - supporting modules.

## Where To Add New Code

**New CLI command:**
- Implement command file in `src/cli/commands/<name>.ts`.
- Register it in `src/cli/index.ts`.
- Add focused tests in `src/cli/commands/__tests__/` or `src/cli/__tests__/`.

**New layered backend capability:**
- Contract in `src/interface/types/` or `src/interface/config/`.
- Domain behavior in `src/domain/`.
- Concrete adapter in `src/infrastructure/`.
- HTTP exposure only if needed in `src/server/handlers/` and `src/server/routes/`.

**New documentation guardrail or sync rule:**
- Validation logic in `scripts/validate-docs.js` or `scripts/validate-ai-docs.js`.
- Corresponding tests in `src/cli/__tests__/validate-docs-script.test.ts` and `src/cli/commands/__tests__/ci-docs-sync.test.ts`.
- User-facing docs in `README.md`, `AI_GUIDE.md`, `docs/ai-guide/*`, and `docs/rules/*`.

## Naming and Placement Patterns

- CLI source files are command-oriented and live under `src/cli/commands/`.
- Layered architecture files are grouped by responsibility, not by feature, under `src/{interface,infrastructure,domain,server}`.
- Tests live beside code in `__tests__` folders or as `*.test.ts`.
- Scripts live under `scripts/` and are treated as first-class guardrail code.

## Important Directories

- `.github/workflows/` - CI and publish automation.
- `.githooks/` - local commit-time guardrails.
- `docs/ai-guide/` - AI-facing operational documentation.
- `docs/rules/` - engineering and validation rules.
- `docs/product-specs/` and `docs/design-docs/` - product and architecture intent.

## Placement Rules For Future Agents

- Touch `src/cli/index.ts` only when the public command list changes.
- Touch `src/cli/commands/analyze.ts` when intent names, schemas, or machine output change.
- Touch `src/orchestrator/workflow/` when changing workflow phase semantics.
- Touch `src/server/` only when the HTTP surface is intentionally part of the product.
- Touch `src/infrastructure/storage/adapters/*` only when a backend implementation is real, not speculative.

## Useful Navigation Shortcuts

- Current command list: `src/cli/index.ts`
- Transitional new command list: `src/cli-new/index.ts`
- Docs guardrails: `scripts/validate-docs.js`
- AI docs guardrails: `scripts/validate-ai-docs.js`
- CI workflow: `.github/workflows/ci-gateway.yml`
- Publish workflow: `.github/workflows/publish.yml`

---
*Structure analysis: 2026-03-24*
