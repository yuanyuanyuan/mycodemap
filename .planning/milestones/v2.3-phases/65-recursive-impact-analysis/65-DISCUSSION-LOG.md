# Phase 65: Recursive Impact Analysis - Discussion Log

**Date:** 2026-05-08
**Status:** Completed

## Areas Discussed

### Unified entrypoint model
- Options considered:
  - Dual entrypoint, single command/pipeline
  - Keep split file-vs-symbol surfaces with only helper reuse
  - File-first, symbol as enhancement
  - Agent discretion
- User decision:
  - Support both `file` and `symbol` as first-class entrypoints and resolve them into one shared traversal/result pipeline.
- Notes:
  - CLI and MCP may keep thin adapters, but not separate impact semantics.

### Layered result structure
- Options considered:
  - Compact layered shape: `summary + direct[] + transitiveLayers[]`
  - Unified `layers[]` for all hops
  - Dual shape with both flattened and layered payloads
- User decision:
  - Use the compact layered shape.
- Notes:
  - `direct` and `transitive` are part of result truth, not just request-time modes.

### Missing-entrypoint and degraded-graph behavior
- Options considered:
  - Explicit failure/ambiguity + degraded partial/stale results with warnings
  - Fail hard on all degraded graph states
  - Return empty success for unresolved cases
- User decision:
  - Use explicit status semantics for missing/ambiguous entrypoints and missing graph truth; allow partial/stale graph results only with reduced confidence and warnings.
- Notes:
  - Empty success payloads are explicitly disallowed.

### Delivery surface
- Options considered:
  - CLI + MCP together
  - CLI first, MCP later
  - MCP first, CLI later
  - Include HTTP API as a core promise
- User decision:
  - CLI and MCP must align in Phase 65; HTTP API may reuse the capability but is not the core completion bar.
- Notes:
  - This keeps the phase aligned with roadmap wording without expanding into a server redesign.

## Deferred Ideas
- Community detection and richer graph clustering remain Phase 66 work.
- Exhaustive path enumeration and path-ranking were not added to Phase 65 scope.
- A full `/analysis/impact` server-surface redesign was intentionally deferred.

## Outcome
- Phase 65 now has enough locked implementation decisions for downstream research and planning without re-asking the same product questions.
