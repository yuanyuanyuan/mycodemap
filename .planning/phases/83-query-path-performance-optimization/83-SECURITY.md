---
phase: 83
slug: query-path-performance-optimization
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-11
---

# Phase 83 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| SQLite truth -> eager governance cache | Persisted graph truth is hydrated into in-memory read indexes and bounded impact cache. | module/symbol/dependency graph data, graph metadata |
| eager governance cache -> query handler | Cached dependency/impact results are returned to read-only consumers. | dependency arrays, impact traversal results |
| write path -> cache refresh | Graph writes and initialization rebuild cache state before later reads rely on eager mode. | normalized graph snapshots, dependency projections |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-83-01 | Tampering | SQLiteStorage cache invalidation | mitigate | SQLite initialize/save/delete paths all call `refreshGovernanceGraphCache(...)`, so eager cache is rebuilt from SQLite truth after graph-changing operations instead of serving stale entries. Evidence: [SQLiteStorage.ts](/data/codemap/src/infrastructure/storage/adapters/SQLiteStorage.ts:541), [SQLiteStorage.ts](/data/codemap/src/infrastructure/storage/adapters/SQLiteStorage.ts:587), [SQLiteStorage.ts](/data/codemap/src/infrastructure/storage/adapters/SQLiteStorage.ts:1501). | closed |
| T-83-02 | Denial of Service | GovernanceGraphCache memory growth | mitigate | eager mode is threshold-gated on module count/load time/RSS and repeated impact results are capped by `MAX_CACHED_IMPACT_RESULTS = 256`, with overflow eviction and sqlite-direct fallback. Evidence: [GovernanceGraphCache.ts](/data/codemap/src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:48), [GovernanceGraphCache.ts](/data/codemap/src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:242), [GovernanceGraphCache.ts](/data/codemap/src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:366). | closed |
| T-83-03 | Tampering | Cached result mutability | mitigate | Dependency lookup returns cloned arrays and impact cache returns `structuredClone(...)`, so caller-side mutation cannot poison future reads. Evidence: [graph-helpers.ts](/data/codemap/src/infrastructure/storage/graph-helpers.ts:64), [graph-helpers.ts](/data/codemap/src/infrastructure/storage/graph-helpers.ts:756), [graph-helpers.ts](/data/codemap/src/infrastructure/storage/graph-helpers.ts:770), [GovernanceGraphCache.ts](/data/codemap/src/infrastructure/storage/sqlite/GovernanceGraphCache.ts:361). | closed |
| T-83-04 | Repudiation | QueryHandler impact projection consistency | mitigate | `QueryHandler.analyzeImpact()` now projects directly from storage-returned layered impact truth, removing the second graph walk that could drift from canonical storage semantics. Evidence: [QueryHandler.ts](/data/codemap/src/server/handlers/QueryHandler.ts:143). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-11 | 4 | 4 | 0 | codex |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-11
