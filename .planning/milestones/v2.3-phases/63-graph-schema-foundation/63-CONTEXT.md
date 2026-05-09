# Phase 63: Graph Schema Foundation - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the current SQLite-persisted graph truth from a governance-oriented shape into a graph-optimized persistence layout that better serves traversal, clustering, and downstream graph analysis, while keeping `modules / symbols / dependencies` as the primary domain truth and preserving the shipped CLI/MCP success contract.

</domain>

<decisions>
## Implementation Decisions

### Schema shape
- **D-01:** Phase 63 keeps `modules / symbols / dependencies` as the primary graph truth. It does not switch the core domain model to a unified `nodes / edges` primary schema.
- **D-02:** Graph optimization should happen inside the SQLite persistence shape through stronger traversal-oriented structure, indexes, adjacency-friendly storage, or derived/projection layers, as long as the primary domain truth remains `modules / symbols / dependencies`.

### Migration and cutover
- **D-03:** `generate` may rebuild the current repository graph truth directly into the new schema instead of preserving old SQLite graph data.
- **D-04:** Phase 63 does not require a historical graph-data migrator. The important guarantee is that rebuilds succeed cleanly and compatibility failures surface diagnosable evidence rather than silent partial truth.

### Edge confidence semantics
- **D-05:** `EXTRACTED` means the edge is directly proven by parser / AST evidence.
- **D-06:** `INFERRED` means the edge is produced from rules over imports, naming, file structure, or other existing graph heuristics rather than direct parser proof.
- **D-07:** `AMBIGUOUS` means the system sees multiple reasonable targets and cannot uniquely resolve the edge.

### Compatibility boundary
- **D-08:** Existing `generate` / `query` / `deps` / `analyze` success paths must continue to work against the new persisted truth without breaking their stable success envelope.
- **D-09:** Phase 63 should focus on internal truth and persisted semantics first; it should avoid unnecessary outward contract churn while enabling later phases to consume edge confidence directly.

### the agent's Discretion
- Exact SQLite table/index/projection design, as long as it preserves `modules / symbols / dependencies` as the primary truth and improves traversal-oriented behavior.
- Exact rebuild flow and compatibility diagnostics, as long as rebuild-first semantics stay clear and failures are explicit.
- Exact heuristics for producing `INFERRED` edges, as long as they remain distinguishable from `EXTRACTED` and `AMBIGUOUS`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase authority
- `.planning/ROADMAP.md` — Phase 63 goal, plan slot, and success criteria for graph schema foundation
- `.planning/REQUIREMENTS.md` — locked milestone requirements `GRAPH-01`, `GRAPH-02`, and `GRAPH-03`
- `.planning/PROJECT.md` — milestone-level product direction for `v2.3 graph-capability`
- `.planning/STATE.md` — current milestone position and recorded carry-forward decisions

### Prior locked context
- `.planning/phases/60-storage-convergence/60-CONTEXT.md` — SQLite-only truth, no automatic legacy data migration, and explicit failure/remediation semantics
- `.planning/phases/61-mcp-direct-execution/61-CONTEXT.md` — preserve shipped CLI/MCP success envelope and shared execution truth
- `.planning/phases/62-context-routing-gate/62-CONTEXT.md` — preserve lightweight downstream consumption patterns and avoid unnecessary outward contract churn

### Storage and graph implementation surfaces
- `src/domain/entities/CodeGraph.ts` — current primary graph domain shape (`project`, `modules`, `symbols`, `dependencies`, graph integrity metadata)
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — current SQLite persistence, schema evolution hooks, graph load/save behavior, and existing `dependencies.confidence` column
- `src/infrastructure/storage/StorageFactory.ts` — current SQLite-only storage truth and supported backend boundary
- `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts` — current repository layer that loads/saves full graph truth through storage
- `src/interface/types/storage.ts` — persisted graph/storage contract, graph metadata, and graph integrity surface
- `src/interface/types/index.ts` — interface-level graph entity types that the schema redesign must continue to serve

### Architecture and guidance
- `ARCHITECTURE.md` — top-level architecture narrative that should stay aligned with graph-capability changes
- `.planning/codebase/STACK.md` — runtime/tooling baseline for Node/TypeScript/SQLite work
- `.planning/codebase/ARCHITECTURE.md` — transitional architecture map and current persistence/runtime boundaries
- `.planning/codebase/INTEGRATIONS.md` — current CLI/runtime/data-storage integration seams

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CodeGraph` aggregate in `src/domain/entities/CodeGraph.ts` already defines the stable primary truth that this phase should preserve.
- `SQLiteStorage` in `src/infrastructure/storage/adapters/SQLiteStorage.ts` already contains schema-setup, compatibility-column backfill, and graph metadata handling that Phase 63 can extend rather than replace wholesale.
- `StorageFactory` in `src/infrastructure/storage/StorageFactory.ts` already enforces SQLite-only persistent storage, so Phase 63 can focus on schema shape rather than backend selection.
- `CodeGraphRepositoryImpl` in `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts` already provides a narrow persistence seam between domain and storage.

### Established Patterns
- Recent phases prefer one execution/storage truth with explicit compatibility seams instead of parallel systems.
- Failure-to-Action and explicit diagnostics are established project patterns; schema compatibility or rebuild failures should follow that standard.
- Brownfield phases in this repo favor preserving stable public success envelopes while evolving internal truth underneath.

### Integration Points
- Any schema redesign will land primarily in `SQLiteStorage`, with matching updates to interface types, repository behavior, and graph metadata readers.
- Planner/research work should treat `dependencies.confidence` as an existing foothold for Phase 63 rather than inventing a separate confidence side channel.
- Verification will likely need to touch storage tests, generate-path tests, and any query/deps/analyze paths that assume the old persistence shape.

</code_context>

<specifics>
## Specific Ideas

- Keep the domain-facing graph shape stable and push graph-native optimization into persistence design rather than into a domain-model rewrite.
- Prefer rebuild-first cutover semantics: if the repo can be regenerated cleanly, the system does not need to preserve historical SQLite graph payloads from before Phase 63.
- Persist edge confidence as first-class truth that later incremental refresh, impact traversal, and community detection phases can consume directly.

</specifics>

<deferred>
## Deferred Ideas

- Replacing the primary graph domain model with a unified `nodes / edges` abstraction belongs to a later milestone, if ever needed.
- Historical SQLite graph-data migration tooling is out of scope for Phase 63.
- Broader public output-contract expansion beyond compatibility-safe diagnostics belongs to later graph-capability phases once the new persisted truth is stable.

</deferred>

---

*Phase: 63-graph-schema-foundation*
*Context gathered: 2026-05-08*
