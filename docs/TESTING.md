<!-- generated-by: gsd-doc-writer -->

# Testing

## Test Stack

CodeMap uses Vitest (`^1.1.0`) for unit, integration, and workflow tests. Coverage reporting is provided by `@vitest/coverage-v8` (`^1.6.1`).

The default configuration (`vitest.config.ts`) runs tests in `src/**/*.test.ts` with a Node environment, `globals: true`, and a `threads` pool (max 2 threads). The E2E suite uses a separate configuration (`vitest.e2e.config.ts`) that runs `tests/e2e/**/*.test.ts` with up to 4 threads. Both configs enforce a 10-second timeout per test and hook.

No global setup file is required; install dependencies with `npm ci` (or `npm install`) and run tests directly.

## Main Test Commands

| Command | Purpose |
|---|---|
| `npm test` | Run the default Vitest suite (all `src/**/*.test.ts` files) |
| `npm run test:e2e` | Run the end-to-end workflow suite (`tests/e2e/**/*.test.ts`) |
| `npm run hooks:smoke` | Run real git commit smoke cases for the managed hook payloads |
| `npx vitest` | Start Vitest in watch mode |
| `npm run benchmark` | Run benchmark validation |
| `npm run test:all` | Run tests followed by benchmarks |
| `npm run check:all` | Run typecheck, lint, tests, and docs validation |

## What the Tests Cover

- CLI command behavior and output formatting
- parser and analyzer logic
- storage backends and fallback behavior
- HTTP API route handling
- MCP and env-contract plumbing
- release, workflow, and guardrail commands

## Practical Guidance

- Prefer real filesystem and subprocess behavior for workflow and integration tests.
- Use mocks for small units, but do not substitute mocks for end-to-end behavior that the repository already exercises with real I/O.
- When a test changes command output, update the docs if the user-facing behavior changed.

## Running a Single File

```bash
npx vitest run src/core/__tests__/analyzer.test.ts
```

## Writing New Tests

Unit and integration tests live next to source code in `src/**/__tests__/*.test.ts`. End-to-end tests live in `tests/e2e/*.e2e.test.ts`. There is no dedicated global setup or shared helper file; tests import Vitest's `describe`, `it`, and `expect` directly.

When adding a new test:
- Place unit tests in `src/<module>/__tests__/<name>.test.ts`
- Place E2E tests in `tests/e2e/<name>.e2e.test.ts`
- Use `tests/fixtures/` for sample project data and `tests/golden/` for expected output snapshots

## Coverage Requirements

No minimum coverage threshold is configured in `vitest.config.ts`. Coverage is generated on demand with:

```bash
npx vitest run --coverage
```

The default reporter outputs text, lcov, and HTML to `./coverage`.

## CI Integration

Tests run in the **CI Gateway** workflow (`.github/workflows/ci-gateway.yml`), which triggers on pushes and pull requests to `main` and `develop`.

Relevant CI steps:
1. `npm test` — runs the default Vitest suite
2. `npm run test:e2e` — runs the E2E workflow guardrail

For changes that touch `.githooks/`, `.mycodemap/hooks/`, or `scripts/hooks/templates/`, also run `npm run hooks:smoke` to verify both blocker paths and a valid commit pass with a real temporary Git repository.

The same workflow also runs typecheck, lint, docs validation, contract gate checks, and CLI guardrails before considering the build green.

## Before Release

Run the validation gates that protect the repo:

```bash
npm run docs:check
npm run docs:check:pre-release
```
