# Technical Concerns

**Analysis Date:** 2026-03-24

## 1. Hybrid Architecture Drift

- The repository ships both a legacy command stack in `src/cli/` and a layered MVP3 stack in `src/{interface,infrastructure,domain,server,cli-new}`.
- Root `ARCHITECTURE.md` still presents Server Layer as a first-class HTTP API concern, while current product-direction work questions whether the `server` CLI command belongs in the product core.
- This creates planning risk: architecture documents, command surface, and product boundary are not yet aligned.

## 2. High Blast-Radius Entry Points

- `src/cli/index.ts` registers almost every public command and is the highest-risk edit surface.
- CodeMap structured overview reports high impact/risk for `src/cli/index.ts`, including a large dependency set and high `impactCount`.
- `src/cli/commands/analyze.ts`, `src/cli/commands/ci.ts`, and `src/orchestrator/workflow/workflow-orchestrator.ts` are also broad coordination files.

## 3. Large Files / Complexity Hotspots

- `src/parser/implementations/smart-parser.ts` is 1600+ lines.
- `src/cli/commands/query.ts` is ~900+ lines.
- `src/cli/commands/analyze.ts`, `src/cli/commands/ci.ts`, and `src/cli/commands/workflow.ts` are each substantial multi-responsibility files.
- These are likely refactor seams before adding more branching behavior.

## 4. Partial / Stubbed Implementations

- `src/server/handlers/AnalysisHandler.ts` contains TODO markers for actual analysis and incremental update behavior.
- `src/infrastructure/storage/adapters/KuzuDBStorage.ts` and `src/infrastructure/storage/adapters/Neo4jStorage.ts` contain multiple TODO / TODO-DEBT markers and fallback behavior.
- `src/infrastructure/parser/implementations/GoParser.ts`, `PythonParser.ts`, and `TypeScriptParser.ts` carry MVP debt markers.

## 5. Output Path Drift

- Legacy product output is `.mycodemap/`.
- File-system storage in server code still defaults to `.codemap/storage`.
- Workflow persistence writes under `.mycodemap/workflow`.
- Any work touching generate/server/storage/workflow needs an explicit path decision to avoid silent inconsistency.

## 6. Docs Guardrail Coupling

- `scripts/validate-docs.js` hard-codes README examples, workflow snippets, and CI command strings.
- Small CLI contract changes cascade into README, AI docs, rules docs, workflow YAML, and guardrail tests.
- This is useful protection, but it increases the cost of command-surface refactors.

## 7. Test Scope Gaps

- Default Vitest config only includes `src/**/*.test.ts`.
- Additional suites exist in `tests/e2e/` and `tests/unit/`, so contributors can mistakenly assume full coverage when only `src/` tests ran.

## 8. Concrete Failure Modes To Simulate

- Removing a public CLI command without updating `scripts/validate-docs.js` and docs tests will fail the documentation guardrail.
- Changing analyze intent names without updating `src/cli/commands/analyze.ts`, README examples, and docs sync tests will break both machine consumers and CI.
- Treating KuzuDB/Neo4j backends as production-ready will fail because the adapters are still partial implementations.

## 9. Immediate Planning Guidance

- Split product-boundary work from workflow/server/ship work instead of changing all surfaces at once.
- Use `src/cli/index.ts`, `src/cli/commands/analyze.ts`, `.github/workflows/ci-gateway.yml`, and `scripts/validate-docs.js` as the minimal review set for command-surface changes.

---
*Concern analysis: 2026-03-24*
