# Coding Conventions

**Analysis Date:** 2026-03-24

## Source File Headers

- Non-test TypeScript files in `src/` commonly start with `[META]` and `[WHY]` header comments.
- Keep the header when editing an existing source file.
- Preserve ownership/stability metadata if the file already declares it.

## Module System

- Use ESM throughout the source tree.
- In TypeScript source, import local modules with `.js` suffix, for example `import { ciCommand } from './commands/ci.js';`.
- Prefer named exports over default exports.

## Type Discipline

- Use explicit interfaces and exported types for command options and output contracts.
- Prefer discriminated enums or string unions for public error and intent values, as seen in `AnalyzeErrorCode`, `CIErrorCode`, and `WorkflowErrorCode`.
- Keep return values structured when a command supports machine output.

## CLI Patterns

- Register commands with `commander` in `src/cli/index.ts`.
- Place implementation logic in `src/cli/commands/*.ts`, not inline in the registry file.
- Support machine-readable output with `--json`, `--structured`, or `--output-mode` when the command is analysis-oriented.
- Keep human-readable output explicit with `chalk` and grouped sections.

## Error Handling

- Use explicit error-code enums for user-facing CLI failures.
- Convert validation failures into readable messages and `process.exit(1)` in command entrypoints.
- For internal orchestration failures, fallback behavior exists in some commands; preserve that only when compatibility matters.

## Architectural Style

- Legacy code favors pragmatic direct wiring.
- MVP3 code favors layer separation: contracts in `src/interface/`, domain rules in `src/domain/`, technical adapters in `src/infrastructure/`.
- When adding new architecture-centric code, follow the layered split instead of deepening `src/core/`.

## Testing Style

- Use Vitest globals: `describe`, `it`, `expect`, `vi`.
- Mock boundary modules aggressively with `vi.mock(...)`.
- Use temp directories and real files for script/CLI guardrail tests.
- Keep tests close to the code they verify.

## Logging and Output

- Current code still uses `console.log` / `console.error` heavily in command modules.
- Runtime logging utilities exist in `src/cli/runtime-logger.ts`; prefer the existing local pattern of the module you touch rather than mixing styles inside one file.

## Naming

- File names are mostly kebab-case or PascalCase by role: command files use kebab-case, entities/services use PascalCase.
- Interface names and domain entities are explicit (`CodeGraphBuilder`, `StorageFactory`, `WorkflowOrchestrator`).
- Avoid ambiguous utility dumping; new logic usually gets a dedicated file under the nearest subsystem.

## Change Discipline

- Public command changes require docs sync across `README.md`, `AI_GUIDE.md`, `docs/ai-guide/*`, and guardrail scripts/tests.
- High-blast-radius edits should be accompanied by focused tests in the same subsystem.

---
*Convention analysis: 2026-03-24*
