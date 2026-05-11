# Phase 73: Graph Topology Signals and Dedup - Research

**Researched:** 2026-05-10
**Domain:** module-level topology signals and graph-truth dedup
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 / D-02:** Phase 73 ships **module-level first** hub / bridge signals on top of the existing module/community projection, not a new symbol-level topology truth layer. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md]
- **D-04 / D-05 / D-06:** `HOOK-03` is a **three-layer dedup** strategy covering build-time, persistence/writeback-time, and read/projection-time. Topology scoring must consume only dedup-protected truth. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md]
- **D-07 / D-08:** Reuse the existing persisted graph/community truth. Do not reopen parser routing, Python deep-analysis seams, complexity truth, or broad schema redesign. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md]

### the agent's Discretion

- Exact scoring algorithm and thresholds for module-level hub / bridge signals, as long as the first release stays interpretable. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md]
- Exact canonicalization keys and helper boundaries for dedup, as long as duplicates are suppressed across all three layers. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md]
- Exact first user-facing surface for topology output, as long as it stays on the persisted-truth path and does not fork a second truth channel. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOOK-01 | hub / bridge detection | Best delivered as module-level topology computed from the same persisted graph truth already used by communities, with interpretable summaries and degraded warnings. [VERIFIED: src/infrastructure/storage/community-helpers.ts][VERIFIED: src/server/mcp/service.ts] |
| HOOK-03 | node dedup (3-layer) | Needs structural suppression at graph build, SQLite writeback, and read/projection so duplicates cannot inflate graph analytics. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/infrastructure/storage/adapters/SQLiteStorage.ts][VERIFIED: src/infrastructure/storage/sqlite/GovernanceGraphCache.ts] |
</phase_requirements>

## Summary

Phase 73 should be planned as an extension of the existing persisted graph/community pipeline, not as a new analytics subsystem. The repository already has the right baseline:

1. `community-helpers.ts` projects persisted graph truth into module-level, user-interpretable clusters with warnings when graph signal is weak or partial. [VERIFIED: src/infrastructure/storage/community-helpers.ts][VERIFIED: src/infrastructure/storage/__tests__/community-helpers.test.ts]
2. `SQLiteStorage` is the canonical persistence seam; it rewrites the full graph and refreshes the governance cache after each save. [VERIFIED: src/infrastructure/storage/adapters/SQLiteStorage.ts]
3. `GovernanceGraphCache` and SQLite-direct reads both hydrate from `graph_edges`, so persistence duplicates will poison both memory-eager and direct-read paths unless suppressed before or during load. [VERIFIED: src/infrastructure/storage/sqlite/GovernanceGraphCache.ts]
4. `CodeMapMcpService` already maps shared community truth to MCP output, so topology can extend the same persisted-truth family instead of adding an unrelated surface. [VERIFIED: src/server/mcp/service.ts][VERIFIED: src/server/mcp/server.ts]

The main risk is not “how to compute centrality” but “how to keep duplicate artifacts from inflating centrality.” Today there is some dedup precedent at graph-build time for import edges in `analyzer.ts`, but there is no repo-wide canonical dedup layer for persisted `CodeGraph.dependencies`, and the current community projection still sums repeated dependency artifacts into larger edge weights. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/infrastructure/storage/community-helpers.ts]

The best Phase 73 path is therefore:

- define one canonical dedup key for topology-relevant dependency artifacts;
- enforce it at build, persistence, and read/projection seams;
- compute module-level hub / bridge signals only from that protected projection;
- expose those signals through the existing community-style persisted truth path;
- prove with failure/regression tests that duplicate artifacts do not increase topology scores or reorder the top results.

## Repository Facts

### 1. There is already a persisted module-level projection seam

`analyzeCommunitiesInGraph()`:

- consumes `CodeGraph` plus optional `GraphMetadata`;
- maps symbol-to-module references into a module projection;
- aggregates supported dependency kinds (`call`, `inherit`, `implement`, `import`, `type-ref`);
- returns interpretable fields such as `label`, `modulePaths`, `topPaths`, `dominantEdgeKinds`, and `cohesion`;
- degrades confidence via `GRAPH_PARTIAL`, `LOW_SIGNAL_SPARSE_GRAPH`, `LOW_SIGNAL_SINGLETON_HEAVY`, and `LOW_SIGNAL_DOMINANT_SINGLE_CLUSTER`. [VERIFIED: src/infrastructure/storage/community-helpers.ts][VERIFIED: src/infrastructure/storage/__tests__/community-helpers.test.ts]

This is exactly the right interpretability posture for first-release hub / bridge output.

### 2. The current community projection still allows duplicate inflation

`buildProjection()` in `community-helpers.ts` aggregates undirected module pairs, but it does so by **adding weight every time a dependency artifact repeats**:

- same source/target module pair → same aggregate bucket
- repeated input dependency rows → `existing.weight += weight`
- repeated dependency kinds → `existing.kinds.set(... + weight)` [VERIFIED: src/infrastructure/storage/community-helpers.ts]

That means projection aggregation is not the same thing as dedup. If the persisted graph already contains duplicates, topology weight will still be inflated.

### 3. Persistence currently rewrites dependencies verbatim

`SQLiteStorage.replaceCurrentGraph()`:

- normalizes graph shape,
- deletes and rewrites `dependencies`, `graph_edges`, `symbols`, `modules`, `projects`, and `snapshots`,
- inserts one `dependencies` row and one `graph_edges` row for **every** input dependency in `normalizedGraph.dependencies`. [VERIFIED: src/infrastructure/storage/adapters/SQLiteStorage.ts]

There is no canonical dependency dedup before those inserts. So if duplicate dependency artifacts arrive, SQLite becomes a durable amplifier.

### 4. Read paths currently trust persisted edges as-is

`readGovernanceGraphFromSQLite()` reads every `graph_edges` row into `CodeGraph.dependencies` ordered by `dependency_id`, and `GovernanceGraphCache.hydrate()` uses that result to power memory-eager impact/cycle/dependency queries. [VERIFIED: src/infrastructure/storage/sqlite/GovernanceGraphCache.ts]

This means Phase 73 needs a read/projection guard even if build or writeback dedup leaks, because cached and direct-read graph analytics both reuse the same persisted edge set.

### 5. Build-time dedup precedent already exists

`analyzer.ts` already uses:

- `new Set(...)` to deduplicate module dependency import paths,
- `edgeSet` to avoid repeated module import edges in the `DependencyGraph`,
- `dependents.includes(...)` to avoid duplicate reverse links. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/core/__tests__/analyzer.test.ts]

Phase 73 should reuse this “dedup before downstream consumption” pattern instead of inventing a second normalization philosophy.

### 6. MCP already exposes community-style persisted truth

`CodeMapMcpService.communities()` already loads graph + metadata, runs `analyzeCommunitiesInGraph()`, and maps the shared result into MCP JSON. [VERIFIED: src/server/mcp/service.ts]

This makes “extend the existing community result family with topology insight” cheaper and safer than adding a brand-new ad-hoc topology calculation surface.

## Recommended Technical Direction

### Direction 1: Keep topology module-level and projection-based

Compute first-release topology on the same module projection already used by communities. Do **not** open a symbol-level centrality truth layer in this phase. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md][VERIFIED: src/infrastructure/storage/community-helpers.ts]

Why this is the best fit:

- user explicitly chose module-level first;
- community baseline already produces interpretable cluster context;
- MCP and future surfaces already understand module-level graph summaries;
- duplicate suppression is materially easier to reason about at the module-projection seam than at a new symbol-topology seam.

### Direction 2: Treat dedup as a canonical graph-truth concern, not a UI concern

Phase 73 should define one topology-safe canonical dependency identity and apply it at all three layers:

- **build-time:** suppress duplicate dependency artifacts before they enter `CodeGraph.dependencies`;
- **persistence/writeback-time:** normalize or collapse duplicates before writing `dependencies` / `graph_edges`;
- **read/projection-time:** defensively dedup edges again before topology/community calculations. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/infrastructure/storage/adapters/SQLiteStorage.ts][VERIFIED: src/infrastructure/storage/community-helpers.ts]

If dedup only exists in the presentation layer, impact/cycle/cache behavior will still see polluted graph truth.

### Direction 3: Extend the existing community result family instead of creating a detached topology tool first

The lowest-risk first release is to keep topology on the persisted community path:

- add a bounded topology summary to the shared storage result family;
- keep community warnings/remediation/graph-status behavior intact;
- map it through the existing MCP service, either by enriching `codemap_communities` output or by adding a thin sibling helper that still reuses the same stored projection pipeline. [VERIFIED: src/interface/types/storage.ts][VERIFIED: src/server/mcp/service.ts][VERIFIED: src/server/mcp/server.ts]

This preserves the “one persisted graph truth, many thin readers” architecture.

### Direction 4: Prefer interpretable topology metrics over opaque graph science

For the first release, hub / bridge scoring should stay understandable:

- **hub candidates:** modules with high degree / weighted degree in the deduped module graph;
- **bridge candidates:** modules whose neighbors span multiple communities or whose removal would sever community-to-community connectivity;
- attach explanation fields such as connected module count, dominant edge kinds, or linked communities rather than only a raw score. [INFERRED from existing interpretability posture in src/infrastructure/storage/community-helpers.ts]

This aligns better with the current product surface than dropping in a mathematically rich but opaque centrality stack.

## Dedup Strategy Recommendation

### Canonical key shape

Use a canonical identity based on the graph semantics that matter for topology truth:

- source entity id
- source entity type
- target entity id
- target entity type
- dependency type
- normalized file path (if present)
- line number only if the project currently treats line-distinct edges as semantically distinct

The exact line/file inclusion policy is the main implementation choice left to the plan, but the key must be deterministic and shared across all three layers. [INFERRED from src/interface/types/index.ts and current dependency row schema]

### Layer 1: Build-time

Best candidate seam:

- the shared graph-building path that materializes `CodeGraph.dependencies` from analyzer/global-index output;
- follow the existing `edgeSet` precedent in `analyzer.ts`;
- add focused tests proving repeated call/import artifacts do not create multiple topology-equivalent dependency entries. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/core/__tests__/analyzer.test.ts]

### Layer 2: Persistence/writeback-time

Best candidate seam:

- `SQLiteStorage.normalizeGraph()` or a narrow helper called by `replaceCurrentGraph()`;
- collapse duplicate dependencies before the `INSERT INTO dependencies` / `INSERT INTO graph_edges` loops;
- keep projection-parity assertions intact so `dependencies` and `graph_edges` stay consistent. [VERIFIED: src/infrastructure/storage/adapters/SQLiteStorage.ts][VERIFIED: src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts]

### Layer 3: Read/projection-time

Best candidate seam:

- `community-helpers.ts` projection builder;
- optionally a shared helper in `graph-helpers.ts` if both communities and topology consumers need the same deduped adjacency;
- defend against stale SQLite rows or cache artifacts by deduping again before computing topology/community weights. [VERIFIED: src/infrastructure/storage/community-helpers.ts][VERIFIED: src/infrastructure/storage/sqlite/GovernanceGraphCache.ts]

## Execution Patterns To Reuse

### Pattern 1: Community helper tests as the main topology-proof seam

`community-helpers.test.ts` already proves:

- module-level projection,
- confidence degradation,
- fail-closed behavior on missing graph truth. [VERIFIED: src/infrastructure/storage/__tests__/community-helpers.test.ts]

This is the natural place to add duplicate-inflation regression fixtures and first-release topology result assertions.

### Pattern 2: SQLite parity tests for writeback truth

`SQLiteGovernanceGraph.test.ts` already proves:

- memory-eager vs sqlite-direct parity,
- `dependencies` vs `graph_edges` parity,
- storage-backed graph behavior equivalence. [VERIFIED: src/infrastructure/storage/__tests__/SQLiteGovernanceGraph.test.ts]

That makes it the right seam to verify persistence-layer dedup and “same truth across cache/direct modes.”

### Pattern 3: Analyzer dedup tests for build-time suppression

`analyzer.test.ts` already has a dedicated duplicate-edge precedent. Extend that style to topology-relevant duplicate artifact construction rather than inventing a new testing philosophy. [VERIFIED: src/core/__tests__/analyzer.test.ts]

## Proposed Plan Shape

One execute plan is sufficient if it is split into three tasks:

1. Shared topology contract + red tests for duplicate inflation and first-release output shape
2. Build + persistence dedup implementation
3. Read/projection topology calculation + MCP/shared-surface exposure proof

This gives a clean verification ladder:

- analyzer/storage unit tests for dedup,
- community/topology helper tests for projection correctness,
- MCP/service tests for persisted-read exposure and degraded warnings.

## Common Pitfalls

### Pitfall 1: Confusing aggregation with dedup

Current community projection combines duplicate edges into larger weights; that is aggregation, not protection. If Phase 73 stops there, hub / bridge results will still be inflated. [VERIFIED: src/infrastructure/storage/community-helpers.ts]

### Pitfall 2: Deduping only one layer

If build-time dedup is added but writeback or read paths remain permissive, old persisted duplicates or cache hydration can still distort topology. [VERIFIED: src/infrastructure/storage/adapters/SQLiteStorage.ts][VERIFIED: src/infrastructure/storage/sqlite/GovernanceGraphCache.ts]

### Pitfall 3: Shipping opaque scores with no explanation

The current graph-analysis surfaces degrade confidence and preserve warnings. A first-release hub / bridge output that only returns raw numbers would be less trustworthy than the existing community baseline. [VERIFIED: src/infrastructure/storage/community-helpers.ts][VERIFIED: src/server/mcp/service.ts]

### Pitfall 4: Reopening symbol-level or parser-level scope

Phase 70 and 72 already closed the Python deep-analysis seams needed for this phase. Reopening parser or complexity work here would dilute verification and violate the fixed phase boundary. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-01-SUMMARY.md][VERIFIED: .planning/phases/72-python-complexity-truth/72-01-SUMMARY.md]

## Don’t Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| First-release topology storage | New symbol-topology store or detached graph service | Existing persisted graph/community projection seam | Keeps one graph truth and matches the user’s module-level-first decision. [VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md][VERIFIED: src/infrastructure/storage/community-helpers.ts] |
| Dedup enforcement | UI-only filtering or MCP-only cleanup | Shared canonical dedup helper applied at build/write/read | `HOOK-03` is a graph-truth requirement, not just an output cleanup task. [VERIFIED: .planning/research/SUMMARY.md] |
| Bridge scoring | Heavy graph-theory expansion with low explainability | Interpretable module-level connectivity/adjacency metrics plus cluster context | Better matches current product surfaces and first-release trust needs. [INFERRED from src/infrastructure/storage/community-helpers.ts and src/server/mcp/service.ts] |

## Research Conclusion

Phase 73 is feasible without architecture churn if the plan stays disciplined:

- extend the existing persisted community/module projection rather than building a second topology truth;
- introduce one canonical dedup identity and enforce it at build, persistence, and read/projection seams;
- compute hub / bridge signals only on dedup-protected module adjacency;
- keep warnings, graph status, and explainability aligned with current community truth;
- prove with targeted regression fixtures that duplicate artifacts do not increase topology scores or change top-ranked results.

That is the smallest implementation that can satisfy `HOOK-01` and `HOOK-03` together while staying on the `v2.5` mainline and preserving the repo’s current “persisted truth first” architecture. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/research/SUMMARY.md][VERIFIED: .planning/phases/73-graph-topology-signals-and-dedup/73-CONTEXT.md]
