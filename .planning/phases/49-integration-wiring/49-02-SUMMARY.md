---
plan: 49-02
phase: 49-integration-wiring
status: complete
wave: 1
---

# Summary: Contract Schema Core Commands

## What Was Built

Added `doctor`, `benchmark`, and `init` command contracts to the interface contract schema, expanding coverage from 3 to 6 commands.

## Key Changes

| File | Change |
|------|--------|
| `src/cli/interface-contract/commands/doctor.ts` | New — doctor contract with json/human flags, diagnostic output shape |
| `src/cli/interface-contract/commands/benchmark.ts` | New — benchmark contract with target/mode/iterations/json flags, native/wasm metrics output shape |
| `src/cli/interface-contract/commands/init.ts` | New — init contract with yes/interactive/json flags, convergence receipt output shape |
| `src/cli/interface-contract/commands/index.ts` | Registered 3 new contracts in `commandContracts` array and exports |
| `src/cli/interface-contract/index.ts` | Exported `doctorContract`, `benchmarkContract`, `initContract` |
| `src/server/mcp/__tests__/CodeMapMcpServer.test.ts` | Updated expected tool list from 5 to 8 tools |

## Verification

- `npx tsc --noEmit` — 0 errors
- `node dist/cli/index.js --schema` — outputs 6 commands including doctor, benchmark, init
- `validateContract(getFullContract())` — no ZodError
- Full test suite: 119 files, 1129 tests — all passed

## Deviations

None. Implementation followed PLAN.md exactly.

## Self-Check: PASSED
