<!-- generated-by: gsd-doc-writer -->

# Testing

## Test framework and setup

CodeMap uses **Vitest** (`vitest@^1.1.0`) as its test framework with `@vitest/coverage-v8` for coverage reporting.

Setup requirements before running tests:

1. Install dependencies: `npm ci`
2. Build the project (some tests import from `dist/`): `npm run build`

Three separate Vitest configurations exist for different test tiers:

| Config file | Includes | Purpose |
|---|---|---|
| `vitest.config.ts` | `src/**/*.test.ts` | Unit and integration tests |
| `vitest.e2e.config.ts` | `tests/e2e/**/*.test.ts` | End-to-end workflow tests |
| `vitest.benchmark.config.ts` | `refer/benchmark-quality.test.ts` | Reference/benchmark quality tests |

Common configuration across all tiers:

- `globals: true` -- `describe`, `it`, `expect` are available without explicit imports
- `environment: 'node'` -- tests run in a Node.js environment
- `pool: 'threads'` with `maxThreads: 4` / `minThreads: 1` -- parallel execution via a stable thread pool

## Running tests

### Full unit/integration suite

```bash
npm test
```

This runs `vitest run` using `vitest.config.ts`, executing all 135 test files under `src/**/__tests__/`.

### E2E tests

```bash
npm run test:e2e
```

Runs `vitest run --config vitest.e2e.config.ts`, executing 7 end-to-end tests in `tests/e2e/` covering workflow orchestration, env-contract retrieval, headless subagent verification, and init onboarding.

### Benchmark (reference) tests

```bash
npm run benchmark
```

Runs the benchmark quality test suite via `vitest.benchmark.config.ts`. These tests use a 5-minute timeout and run serially (`fileParallelism: false`, single thread) for stability.

### Combined test run

```bash
npm run test:all
```

Runs both the unit suite and benchmark tests sequentially.

### Comprehensive quality gate

```bash
npm run check:all
```

Runs typecheck, lint, unit tests, and docs validation in sequence. This is the recommended gate before submitting a PR.

### Running a single test file

```bash
npx vitest run src/core/__tests__/analyzer.test.ts
```

### Watch mode

```bash
npx vitest
```

Vitest starts in watch mode by default when no `run` flag is provided.

## Writing new tests

### File naming convention

- Test files use the `*.test.ts` suffix (no `*.spec.ts` files exist in this project)
- Tests are co-located in `__tests__/` directories adjacent to the source they test
- Pattern: `src/<module>/__tests__/<feature>.test.ts`

For example, a new test for `src/core/scanner.ts` would go in `src/core/__tests__/scanner.test.ts`.

### Test structure pattern

Tests in this project commonly follow this pattern:

1. Import from `vitest` only when needing mocks (`vi`), since `globals: true` makes `describe`, `it`, `expect` globally available
2. Create temporary directories for filesystem-dependent tests using `fs.mkdtemp` with an `afterEach` cleanup
3. Group related tests with `describe` blocks that mirror the function or class being tested

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { analyze } from '../analyzer.js';

describe('analyzer', () => {
  it('produces expected output for a minimal project', async () => {
    // setup, execution, assertions
  });
});
```

### Test fixtures

Fixture data is stored within `__tests__/fixtures/` subdirectories when needed. For example:

- `src/cli/doctor/__tests__/fixtures/stub-project/` -- sample `package.json` for doctor command tests
- `src/cli/doctor/__tests__/fixtures/invalid-json/` -- malformed inputs for error path testing

When adding fixtures, place them under the relevant `__tests__/fixtures/` directory and keep them minimal.

### Key test areas by module

| Module path | Test directory | What is tested |
|---|---|---|
| `src/core/` | `src/core/__tests__/` | Analyzer, AST complexity, global index |
| `src/parser/` | `src/parser/__tests__/` | Fast parser, smart parser |
| `src/infrastructure/parser/` | `src/infrastructure/parser/__tests__/` | Go, Python, TypeScript parsers, parser registry |
| `src/infrastructure/storage/` | `src/infrastructure/storage/__tests__/` | File system storage, SQLite storage, governance graph |
| `src/cli/` | `src/cli/__tests__/` | Config loader |
| `src/cli/commands/` | `src/cli/commands/__tests__/` | 40+ command tests (generate, analyze, doctor, init, etc.) |
| `src/cli/output/` | `src/cli/output/__tests__/` | Error formatting, actionable errors, progress, mode |
| `src/server/handlers/` | `src/server/handlers/__tests__/` | AnalysisHandler, QueryHandler |
| `src/server/routes/` | `src/server/routes/__tests__/` | API analysis routes |
| `src/server/mcp/` | `src/server/mcp/__tests__/` | MCP server, schema adapter, dynamic tools |
| `src/orchestrator/workflow/` | `src/orchestrator/workflow/__tests__/` | Phase checkpoint, workflow context, persistence, orchestrator |

## Coverage requirements

Coverage reporting is configured in `vitest.config.ts`:

- **Reporter formats**: `text`, `lcov`, `html`
- **Output directory**: `./coverage`

No coverage threshold is configured. The `coverageThreshold` field is not set in any vitest config file or `.nycrc`. To generate a coverage report:

```bash
npx vitest run --coverage
```

This produces a terminal summary (`text`), an lcov tracefile, and an HTML report in `./coverage/`.

## CI integration

Tests run in the **CI Gateway** workflow (`.github/workflows/ci-gateway.yml`), triggered on pushes to `main` and `develop` branches, and on pull requests targeting those branches.

The relevant test steps execute in this order:

1. **`npm test`** -- runs the full unit/integration suite via `vitest run`
2. **`npm run test:e2e`** -- runs E2E workflow tests via the e2e vitest config

Both steps must pass for the CI job to succeed. The CI also runs typecheck, lint, docs validation, build, contract checks, and commit format validation as separate steps -- see `ci-gateway.yml` for the full pipeline.
