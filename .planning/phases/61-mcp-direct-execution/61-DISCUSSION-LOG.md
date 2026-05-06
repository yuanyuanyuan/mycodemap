# Phase 61: MCP Direct Execution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 61-mcp-direct-execution
**Areas discussed:** First direct-execution tool family, Shared execution layer, Structured result contract, CLI wrapper thinning boundary

---

## First direct-execution tool family

| Option | Description | Selected |
|--------|-------------|----------|
| `query + deps` | Smallest first slice; easiest way to prove direct execution and shared seam quickly. | |
| `analyze` | Highest-value single command, but also the highest-risk first extraction. | |
| `query + deps + analyze` | Convert the high-frequency read/dependency/analysis family together to avoid building one seam and then redoing it. | ✓ |
| Other | User-defined first-wave tool list. | |

**User's choice:** `query + deps + analyze`
**Notes:** User preferred treating the first conversion as one coherent tool family rather than an isolated proof-of-concept.

---

## Shared execution layer

| Option | Description | Selected |
|--------|-------------|----------|
| Extract helpers from current CLI command files | Minimize change surface by pulling reusable functions from existing command modules. | |
| New dedicated service/executor layer | Create a real shared execution layer used by both CLI wrappers and MCP adapters. | ✓ |
| Minimal thin seam for just the converted family | Build a very small shared seam without committing to a broader architectural layer. | |
| Other | User-defined boundary or placement rule. | |

**User's choice:** New dedicated service/executor layer
**Notes:** User explicitly preferred a real shared layer over lighter helper extraction, even though that increases the phase's architectural weight.

---

## Structured result contract

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing command JSON shapes directly | Keep migration cost lowest, but accept inconsistent outer success/failure semantics. | |
| Fully standardized outer envelope with normalized data payload | Unify all command results aggressively under one schema. | |
| Standardize only the outer envelope, preserve native command payloads inside | Keep one transport/error contract while avoiding a full business-schema rewrite. | ✓ |
| Other | User-defined contract shape or compatibility strategy. | |

**User's choice:** Standardize only the outer envelope, preserve native command payloads inside
**Notes:** User favored a practical middle path: unify status/error/diagnostics semantics while avoiding a broad rewrite of `query`/`deps`/`analyze` business payloads.

---

## CLI wrapper thinning boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Only require shared executor reuse | Wrappers may still keep noticeable orchestration as long as logic is no longer duplicated. | |
| Fully thin all three wrappers in this phase | Limit wrappers to parsing, executor call, and rendering in Phase 61 itself. | |
| Tiered thinning | Make `query`/`deps` thin first, move `analyze` onto the executor and clearly slim it down, with residual cleanup allowed later. | ✓ |
| Other | User-defined special boundary, especially for `analyze`. | |

**User's choice:** Tiered thinning
**Notes:** User accepted that `analyze` is structurally heavier today and can end Phase 61 less thin than `query`/`deps`, as long as the shared executor becomes the execution truth.

---

## the agent's Discretion

- Exact naming and placement of the new executor/service layer
- Exact field names of the outer result envelope
- Exact residual cleanup split between Phase 61 implementation waves and `61-03-PLAN.md`

## Deferred Ideas

- Converting every contract-backed MCP tool in one phase
- Building `codemap_context` routing in parallel with direct execution
- Forcing all command-native business payloads into one identical schema during Phase 61
