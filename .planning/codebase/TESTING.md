# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

- Primary runner is Vitest from `vitest.config.ts`.
- Default runtime is Node with globals enabled.
- Default include pattern is `src/**/*.test.ts`.
- Benchmarks are separated via `vitest.benchmark.config.ts`.

## Test Locations

- Command and CLI tests: `src/cli/__tests__/`, `src/cli/commands/__tests__/`, `src/cli/utils/__tests__/`.
- Core/analyzer tests: `src/core/__tests__/`, `src/parser/__tests__/`, `src/plugins/__tests__/`.
- Layered architecture tests: `src/domain/**/__tests__/`, `src/infrastructure/**/__tests__/`, `src/server/__tests__/`.
- Workflow tests: `src/orchestrator/workflow/__tests__/`.
- Extra non-default suites exist in `tests/e2e/` and `tests/unit/`, but they are not part of the default `vitest.config.ts` include list.

## Common Test Techniques

- Use `vi.mock(...)` to isolate child processes, adapters, and file system boundaries.
- Use temp directories from `node:os` + `node:fs` for docs guardrail and CLI script tests.
- Use `execFileSync` for script-level behavior checks.
- Assert exact command snippets when validating docs or workflow guardrails.

## Guardrail Coverage

- Documentation sync and README examples are enforced by `src/cli/__tests__/validate-docs-script.test.ts`.
- CLI helper behavior for docs sync is covered by `src/cli/commands/__tests__/ci-docs-sync.test.ts`.
- Workflow engine behavior is covered heavily under `src/orchestrator/workflow/__tests__/`.
- Ship pipeline pieces are tested under `src/cli/commands/ship/__tests__/`.

## CI Validation Chain

- `.github/workflows/ci-gateway.yml` runs:
  - `npm run docs:check`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - multiple CLI CI subcommands

## How To Add Tests

- Add focused tests beside the code you change first.
- If you modify CLI contract or docs guardrails, add or update tests in the corresponding CLI test folder.
- If you modify scripts under `scripts/`, prefer testing through the CLI helpers or script invocations that already exist.
- Keep mocking targeted; do not over-mock pure logic modules.

## Testing Risks

- Files under `tests/e2e/` and `tests/unit/` are present but outside the default `src/**/*.test.ts` include pattern.
- Large command files such as `src/cli/commands/query.ts`, `src/cli/commands/analyze.ts`, and `src/cli/commands/ci.ts` deserve extra focused coverage because they have broad surface area.
- Documentation guardrail tests are brittle by design because they pin exact command examples and workflow snippets.

---
*Testing analysis: 2026-03-24*
