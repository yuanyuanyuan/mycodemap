# Phase 60: Storage Convergence - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Make SQLite the only supported persistent storage family for CodeMap, remove `filesystem` / `kuzudb` from healthy runtime paths, and replace cross-backend fallback with explicit migration and failure semantics. This phase defines storage truth, fallback behavior inside the SQLite family, and user-facing remediation for legacy configs and legacy data locations. It does not redesign the SQLite schema or build an automatic data migrator.

</domain>

<decisions>
## Implementation Decisions

### SQLite-family storage truth
- **D-01:** `storage.type: "auto"` remains supported, but it only selects within the SQLite family. It must never resolve to `filesystem` or `kuzudb`.
- **D-02:** `memory` remains available as a non-persistent/testing backend, but it is not part of the persistent storage truth and must not be treated as a healthy production fallback.

### Legacy backend rejection and migration semantics
- **D-03:** Explicit `filesystem` or `kuzudb` storage config must hard-fail instead of silently switching backends.
- **D-04:** Those hard failures must use actionable migration semantics: clear root cause, migration guidance, next-step command(s), and legacy data path visibility when known.
- **D-05:** This phase does not auto-migrate old backend data. Migration remains a guided/manual action, not an implicit runtime side effect.

### SQLite-family fallback behavior
- **D-06:** SQLite runtime chooses native-first behavior, then falls back only within the SQLite family (`better-sqlite3` → `node:sqlite` / `sql.js` path as implemented by the loader).
- **D-07:** SQLite-family fallback must stay visible to users through warning output. Running on a fallback implementation is allowed, but not silent.
- **D-08:** Fallback warnings should preserve machine-readable visibility as structured output metadata where applicable, not only human console text.

### Legacy path compatibility boundary
- **D-09:** If runtime detects legacy storage directories or legacy backend data locations, it should fail with migration guidance instead of continuing to read from those directories.
- **D-10:** This phase must not preserve dual storage truth by continuing to read `.codemap/storage` as an implicit compatibility path.

### the agent's Discretion
- Exact unsupported-storage error codes and wording, as long as they align with the existing Failure-to-Action protocol.
- Exact SQLite-family selection order details if current loader constraints require a slightly different implementation path, as long as it stays native-first and SQLite-only.
- Precise structured fields for fallback visibility in JSON/human outputs, as long as fallback is observable and testable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase authority
- `.planning/ROADMAP.md` — Phase 60 goal, dependency on Phase 59, and success criteria for SQLite-only convergence
- `.planning/STATE.md` — active milestone truth and deferred storage debt already assigned to `v2.2 architecture-foundation`
- `.planning/PROJECT.md` — milestone-level product direction and architecture-foundation scope

### Prior locked context
- `.planning/phases/59-parser-cutover/59-CONTEXT.md` — prior phase pattern for “single truth + deprecated input hard-fail + actionable remediation”

### Storage runtime and contracts
- `src/infrastructure/storage/StorageFactory.ts` — current backend selection truth; currently still routes `auto` to Kuzu/filesystem behavior that Phase 60 must remove
- `src/interface/types/storage.ts` — public storage type/config contract; currently still exposes `filesystem` / `kuzudb`
- `src/cli/config-loader.ts` — default storage config and config normalization path
- `src/infrastructure/storage/index.ts` — storage exports surface
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — primary persistent backend implementation
- `src/infrastructure/storage/adapters/sqlite-loader.ts` — SQLite-family native/WASM fallback logic (`better-sqlite3`, `node:sqlite`, `sql.js`)
- `src/infrastructure/storage/adapters/FileSystemStorage.ts` — legacy filesystem backend to remove from healthy runtime path
- `src/infrastructure/storage/adapters/KuzuDBStorage.ts` — legacy Kuzu backend to remove from healthy runtime path
- `src/infrastructure/storage/adapters/MemoryStorage.ts` — non-persistent backend that remains useful for tests

### Verification and failure-path evidence
- `src/infrastructure/storage/__tests__/StorageFactory.test.ts` — existing unsupported-storage pattern coverage baseline
- `src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` — current cross-backend fallback behavior that needs to be replaced
- `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` — SQLite storage behavior baseline
- `src/cli/output/errors.ts` — Failure-to-Action error normalization and user-facing formatting
- `src/cli/output/wasm-fallback.ts` — current fallback visibility conventions for native dependency degradation
- `src/cli/doctor/check-native-deps.ts` — native dependency diagnosis path relevant to sqlite runtime remediation

### Architecture and drift context
- `ARCHITECTURE.md` — top-level architecture narrative that must stay aligned with SQLite-only truth after the phase
- `.planning/codebase/ARCHITECTURE.md` — notes existing `.mycodemap/` vs `.codemap/storage` drift
- `.planning/codebase/INTEGRATIONS.md` — current storage adapter summary and extension-seam framing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorageFactory` — already centralizes backend selection, so Phase 60 can converge storage truth in one place rather than scattering checks across commands.
- `sqlite-loader.ts` — already implements the SQLite-family loading ladder and remediation text for native dependency failure.
- `SQLiteStorage` — existing persistent backend with broad coverage; it is the anchor implementation for the converged path.
- `errors.ts` and `wasm-fallback.ts` — existing actionable error and fallback-reporting patterns can be reused for unsupported backend and fallback visibility semantics.

### Established Patterns
- Failure-to-Action is already an accepted project pattern: reject deprecated runtime inputs explicitly and attach remediation rather than silently switching behavior.
- The repo is transitional, so type-level and CLI-level public contract cleanup matters as much as factory logic cleanup. `storage.ts` is a high-blast-radius contract surface.
- Native dependency degradation is already treated as diagnosable behavior rather than hidden magic; Phase 60 should preserve that philosophy for SQLite-family fallback.

### Integration Points
- `src/infrastructure/storage/StorageFactory.ts` is the highest-impact integration point for backend truth and fallback semantics.
- `src/interface/types/storage.ts` and `src/cli/config-loader.ts` are the contract/update seam for config-facing migration.
- CLI commands, server handlers, MCP services, and repository implementations all inherit storage semantics from these shared types and factory decisions.
- Tests around `StorageFactory`, fallback handling, doctor checks, and generate/config loading will need synchronized updates to prove the new semantics.

</code_context>

<specifics>
## Specific Ideas

- Keep `auto` as the user-facing convenience value to avoid unnecessary migration churn, but redefine it narrowly so it means “SQLite family auto-selection” instead of “cross-backend magic”.
- Migration guidance should mention legacy path truth explicitly when detected, especially `.codemap/storage` and any legacy Kuzu location, so users can act without spelunking the repo.
- Warning visibility for fallback should ideally be dual-surface: readable in human mode and emitted as structured machine-readable metadata for AI/automation consumers.

</specifics>

<deferred>
## Deferred Ideas

- Automatic migration of legacy storage directories or Kuzu/filesystem data into SQLite belongs to a future dedicated migration phase if needed.
- SQLite schema redesign / graph-optimized schema work remains in the later `v2.3 schema-redesign-graph-capability` milestone.
- Continued dual-read compatibility for `.codemap/storage` is explicitly deferred/rejected for this phase because it preserves storage truth drift.

</deferred>

---

*Phase: 60-storage-convergence*
*Context gathered: 2026-05-06*
