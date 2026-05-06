<!-- generated-by: gsd-doc-writer -->

# Testing

## Test Stack

CodeMap uses Vitest for unit, integration, and workflow tests. Coverage reporting is provided by `@vitest/coverage-v8`.

## Main Test Commands

| Command | Purpose |
|---|---|
| `npm test` | Run the default Vitest suite |
| `npm run test:e2e` | Run the end-to-end workflow suite |
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

## Before Release

Run the validation gates that protect the repo:

```bash
npm run docs:check
npm run docs:check:pre-release
```

