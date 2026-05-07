# Milestone v2.3: graph-capability

**Status:** PLANNING
**Phases:** 63-66
**Total Plans:** 4 planned

## Overview

在 `v2.2 architecture-foundation` 已完成 parser、storage、MCP 执行基线收敛之后，`v2.3` 的目标是把 CodeMap 的 graph truth 从“可存储”推进到“可计算、可增量、可解释”。本里程碑聚焦 graph-optimized SQLite schema、edge confidence、incremental update、recursive impact traversal 与 community detection，作为后续 `v2.4+` agent graph experience 的前置基础。

## Phases

### Phase 63: Graph Schema Foundation

**Goal:** Replace the current governance-oriented graph persistence shape with a graph-optimized SQLite schema that can serve traversal, clustering, and downstream graph analysis without breaking the shipped CLI/MCP success contract.
**Depends on:** None
**Requirements:** GRAPH-01, GRAPH-02, GRAPH-03
**Plans:** 1 plan

Plans:

- [ ] 63-01: Schema redesign, persistence migration path, edge confidence model, compatibility verification

**Success Criteria:**
1. Graph generation persists the repo graph into a graph-optimized SQLite schema that is intentionally shaped for node/edge traversal.
2. Existing `generate` / `query` / `deps` / `analyze` success paths continue to work on the new persisted truth without changing their stable success envelope.
3. Persisted edges expose `EXTRACTED` / `INFERRED` / `AMBIGUOUS` confidence semantics that later phases can consume directly.
4. At least one failure scenario proves schema migration or compatibility errors fail with diagnosable evidence rather than silent partial truth.

### Phase 64: Incremental Graph Refresh

**Goal:** Introduce scoped graph recomputation so maintainers can refresh only the affected graph neighborhoods from a changed-file set instead of rebuilding the full repository graph every time.
**Depends on:** Phase 63
**Requirements:** INCR-01, INCR-02
**Plans:** 1 plan

Plans:

- [ ] 64-01: Changed-file detection, invalidation rules, scoped recompute engine, observability for reused vs recomputed graph slices

**Success Criteria:**
1. A maintainer can trigger graph refresh from `git diff` or an explicit changed-file set and avoid mandatory full regeneration.
2. Incremental refresh recomputes only the affected graph neighborhoods while preserving unchanged graph truth.
3. Output or logs make reused, recomputed, and invalidated graph slices observable enough to debug bad propagation.
4. At least one failure scenario proves stale or unsupported incremental inputs degrade safely instead of corrupting stored graph truth.

### Phase 65: Recursive Impact Analysis

**Goal:** Ship graph-native impact traversal that can explain direct and transitive downstream reachability from a file or symbol entrypoint.
**Depends on:** Phase 64
**Requirements:** IMPT-01, IMPT-02
**Plans:** 1 plan

Plans:

- [ ] 65-01: Recursive traversal query, layered impact summary, CLI/MCP-readable result shaping, direct-vs-transitive verification

**Success Criteria:**
1. A maintainer can start from a file or symbol and retrieve recursive downstream impact results from stored graph truth.
2. Impact output distinguishes direct impact from transitive impact instead of collapsing everything into one flat list.
3. Layered summary output is compact enough for human or agent consumption without post-processing raw graph tables.
4. At least one failure scenario proves missing entrypoints or incomplete graph state return explicit remediation rather than misleading empty success.

### Phase 66: Community Detection Baseline

**Goal:** Add a first community-detection capability so CodeMap can describe module/group structure beyond raw dependency chains and unlock richer agent-facing graph experiences later.
**Depends on:** Phase 65
**Requirements:** COMM-01, COMM-02
**Plans:** 1 plan

Plans:

- [ ] 66-01: Community detection algorithm baseline, cluster materialization, consumable output surface, cluster-quality verification

**Success Criteria:**
1. The stored graph can produce basic community or cluster results that reveal meaningful module boundaries.
2. Community results are exposed through at least one CLI or agent-facing surface without requiring raw SQL access.
3. Cluster output remains interpretable alongside existing graph facts rather than becoming an opaque score dump.
4. At least one failure scenario proves sparse or low-signal graphs are reported honestly instead of overclaiming precise communities.

## Milestone Summary

**Key Objectives:**

- Upgrade SQLite persistence from a governance-friendly store to a graph-native analysis substrate.
- Make graph truth incrementally refreshable so the system can support real iterative engineering workflows.
- Ship recursive impact traversal and community clustering as core graph capabilities rather than future speculation.
- Preserve the `v2.2` parser/storage/MCP baseline while extending what the graph can express.

**Coverage:**

- `4` phases
- `4` planned implementation slices
- `9/9` v2.3 requirements mapped
- Phase numbering continues from `62` to `63-66`

**Deferred Beyond v2.3:**

- `v2.4+`: surprise score, execution flow trace, bare-name resolution
- `v2.5+`: hub/bridge detection, hook mechanism, node dedup
- `v3.0+`: Auto-Provisioned Agent Skills, MCP `verify_contract`, architecture-intelligence features

---

_For active planning truth, see `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md`._
