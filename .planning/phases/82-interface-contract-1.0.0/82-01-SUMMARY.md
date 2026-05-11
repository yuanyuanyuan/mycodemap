---
phase: 82-interface-contract-1.0.0
plan: 01
subsystem: cli-contract
tags: [cli, contract, schema, mcp, stability]

requires:
  - phase: 61-mcp-direct-execution
    provides: contract-driven MCP exposure baseline
  - phase: 81-edge-id-normalization
    provides: current v2.6 polish baseline
provides:
  - `CommandContract.stable` as an explicit required field
  - Interface contract version `1.0.0`
  - Built-in command contracts marked `stable: true`
affects: [cli, schema, mcp-adapter, docs-surface]

tech-stack:
  added: []
  patterns: [schema-first stability declaration, versioned contract gate, focused meta-schema verification]

key-files:
  created:
    - .planning/phases/82-interface-contract-1.0.0/82-01-SUMMARY.md
    - .planning/phases/82-interface-contract-1.0.0/82-CONTEXT.md
    - .planning/phases/82-interface-contract-1.0.0/82-RESEARCH.md
    - .planning/phases/82-interface-contract-1.0.0/82-01-PLAN.md
  modified:
    - src/cli/interface-contract/types.ts
    - src/cli/interface-contract/schema.ts
    - src/cli/interface-contract/index.ts
    - src/cli/interface-contract/commands/analyze.ts
    - src/cli/interface-contract/commands/query.ts
    - src/cli/interface-contract/commands/deps.ts
    - src/cli/interface-contract/commands/doctor.ts
    - src/cli/interface-contract/commands/benchmark.ts
    - src/cli/interface-contract/commands/init.ts
    - src/cli/interface-contract/commands/preview.ts
    - src/cli/interface-contract/commands/env-contract.ts
    - src/cli/interface-contract/commands/agent-metrics.ts
    - src/cli/interface-contract/__tests__/interface-contract.test.ts
    - src/cli/__tests__/index-schema.test.ts
    - src/server/mcp/__tests__/schema-adapter.test.ts

key-decisions:
  - "Current registry commands are treated as the in-scope core contract surface for Phase 82."
  - "Stability is expressed as explicit schema truth (`stable: true`) rather than implicit convention."
  - "The full interface contract version advances to `1.0.0` only after meta-schema and adapter tests lock the field set."

patterns-established:
  - "A command contract is not publishable unless stability is declared in the schema itself."
  - "Root `--schema` output and MCP contract adaptation share the same versioned contract truth."

requirements-completed: [POL-04]

duration: 30min
completed: 2026-05-11
---

# Phase 82: Interface Contract 1.0.0 Summary

**The CLI interface contract now ships as `1.0.0`, with every registered core command explicitly marked `stable: true` and validated through the shared schema/test gates.**

## Accomplishments

- Added required `stable: boolean` to [types.ts](/data/codemap/src/cli/interface-contract/types.ts:65) and [schema.ts](/data/codemap/src/cli/interface-contract/schema.ts:57).
- Promoted the full contract version in [index.ts](/data/codemap/src/cli/interface-contract/index.ts:38) from `0.1.0` to `1.0.0`.
- Marked all registered command contracts as stable in `src/cli/interface-contract/commands/*.ts`.
- Tightened tests so built-in contracts must declare `stable: true`, `--schema` emits `1.0.0`, and MCP schema-adapter fixtures comply with the stricter contract shape.

## Verification

- `rtk ./node_modules/.bin/vitest run src/cli/interface-contract/__tests__/interface-contract.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/__tests__/index-schema.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/schema-adapter.test.ts`
- `rtk npx tsc --noEmit`

## Decisions Made

- Kept scope narrow: no new commands, no runtime behavior changes, only contract truth + tests.
- Treated the existing nine registered contracts as the current stable public surface.
- Made `stable` required in the schema instead of optional, so missing declarations fail before ship.

## Deviations from Plan

None.

## Issues Encountered

- No runtime regressions surfaced; the only required follow-up was updating typed test fixtures that construct `CommandContract` objects directly.

## Next Phase Readiness

- `POL-04` is complete.
- `v2.6` can now move to Phase 83 (`PERF-01` Query Path Performance Optimization).

---
*Phase: 82-interface-contract-1.0.0*
*Completed: 2026-05-11*
