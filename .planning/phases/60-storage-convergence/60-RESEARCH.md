# Phase 60: Storage Convergence - Research

**Researched:** 2026-05-06
**Status:** Ready for planning

<research_question>
## What do we need to know to plan this phase well?

How to converge CodeMap onto SQLite as the only supported persistent storage family without leaving config/runtime/docs drift, while preserving explicit failure-to-action behavior and verifiable SQLite-family fallback semantics.

</research_question>

<repo_facts>
## Verified Code Facts

### Active storage truth still routes through legacy filesystem and Kuzu paths
- `src/infrastructure/storage/StorageFactory.ts` still imports `FileSystemStorage` and lazy-loads `KuzuDBStorage`.
- `StorageFactory.create()` still resolves `auto` through `determineStorageType()` and can silently land on `filesystem`.
- Explicit `kuzudb` requests still fall back to `filesystem` on `KUZU_NOT_AVAILABLE`, with only a console warning.
- `StorageFactory.getAvailableStorageTypes()` still advertises `filesystem` and `kuzudb` as live options.

### Public storage contracts still encode deprecated backends as healthy values
- `src/interface/types/storage.ts` still defines `StorageType = 'filesystem' | 'kuzudb' | 'sqlite' | 'memory'`.
- `StorageConfig` still exposes `autoThresholds`, which reflects the old “choose graph DB by repo size” model rather than SQLite-family selection.
- `src/interface/config/index.ts` uses `StorageConfig` directly, so config/server contracts inherit the same stale backend vocabulary.

### Config defaults still describe filesystem as the canonical persistent backend
- `src/cli/config-loader.ts` still accepts `filesystem` and `kuzudb` in `VALID_STORAGE_TYPES`.
- `createDefaultStorageConfig()` still returns `{ type: 'filesystem', outputPath: '.mycodemap/storage' }`.
- The normalized config tests and generate command tests still assert `filesystem`/`kuzudb` behavior as supported runtime truth.

### SQLite-family fallback already exists, but it is not yet the storage-factory truth
- `src/infrastructure/storage/adapters/sqlite-loader.ts` already does native-first loading, then falls back within the SQLite family (`node:sqlite` or `sql.js`), and escalates via `createActionableError(...)` if both branches fail.
- The loader currently exposes fallback only through `console.warn(...)`; machine-readable fallback metadata is not obviously enforced at the shared output layer yet.
- This means the fallback mechanism itself is a reusable asset, but its visibility contract still needs a tighter plan.

### Existing tests still prove the legacy fallback model
- `src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` expects `auto` to pick `kuzudb` or `filesystem`, and explicit `kuzudb` to fall back to `filesystem`.
- `src/infrastructure/storage/__tests__/StorageFactory.test.ts` only covers the already-removed Neo4j path; it does not yet prove `filesystem` / `kuzudb` rejection.
- `src/cli/__tests__/config-loader.test.ts` and `src/cli/commands/__tests__/generate.test.ts` still treat filesystem and Kuzu as supported config/runtime values.

### Architecture/docs surfaces are at high risk of truth drift
- `ARCHITECTURE.md` and `docs/ai-guide/OUTPUT.md` are already modified in the user worktree, so Phase 60 planning must isolate doc sync work rather than assuming a clean baseline.
- `src/cli/output/error-codes.ts` currently has parser-mode deprecation and native dependency codes, but no explicit `UNSUPPORTED_STORAGE_TYPE` remediation registry entry.

</repo_facts>

<planning_implications>
## Planning Implications

### 1. Wave 1 must first move storage truth, then move config/runtime truth
The roadmap split is correct:
- `60-01` should collapse `StorageFactory` and storage public types onto SQLite-only persistent truth.
- `60-02` should update config validation, defaults, error/remediation text, and user-facing docs/tests so public contracts match that new truth.

### 2. The phase should reject legacy backends, not “degrade gracefully” across families
The old Kuzu/filesystem fallback semantics directly conflict with `STOR-01` and `STOR-02`. Planning should require:
- explicit `filesystem` / `kuzudb` requests to fail deterministically
- `auto` to stay as a convenience alias, but only inside the SQLite family
- legacy path detection to produce remediation, not dual-read compatibility

### 3. SQLite fallback already exists, so Plan 60-03 should prove and expose it rather than redesign it
The loader already implements the intended family-internal fallback ladder. The plan should therefore focus on:
- proving native-fail → SQLite-family-fallback behavior
- proving dual-failure actionable remediation
- making fallback visibility observable for humans and machines

### 4. Config cleanup is larger than one file
Because config defaults, schema-facing types, generate command behavior, output errors, and docs/tests all still mention deprecated backends, `60-02` needs to be the contract-sync plan rather than letting those edits leak into `60-01`.

### 5. The highest regression risk is stale tests and messaging that still normalize forbidden backends
If runtime starts rejecting `filesystem` / `kuzudb` but config loader, tests, or docs still present them as valid, users will get conflicting guidance and the phase will only half-land.

</planning_implications>

<recommended_plan_shape>
## Recommended Plan Shape

### 60-01-PLAN
Focus on runtime storage truth:
- remove healthy runtime support for `filesystem` and `kuzudb`
- redefine `auto` as SQLite-family-only selection
- narrow storage type contracts and availability APIs
- replace cross-family fallback tests with deterministic unsupported-backend coverage

### 60-02-PLAN
Focus on config/default/runtime migration:
- reject deprecated storage config values at config-loader boundaries
- change defaults from filesystem to SQLite
- add canonical unsupported-storage remediation/error-code handling
- update CLI/generate/docs/tests so public surfaces describe SQLite as the only persistent backend

### 60-03-PLAN
Focus on fallback proof and observability:
- verify native `better-sqlite3` failure falls back only to `node:sqlite` / `sql.js`
- verify total fallback failure emits actionable remediation
- make fallback warnings/test evidence visible in both human and structured output paths where applicable

</recommended_plan_shape>

<validation_architecture>
## Validation Architecture

### Success-path checks
- `storage.type: "auto"` resolves to SQLite-family behavior only
- default config generation and normalized config results describe SQLite as the canonical persistent backend
- native `better-sqlite3` failure still allows a SQLite-family fallback path when available

### Failure-path checks
- explicit `storage.type: "filesystem"` and `"kuzudb"` fail with `UNSUPPORTED_STORAGE_TYPE`-style semantics
- legacy config or docs/tests that still mention healthy filesystem/Kuzu support are removed or updated
- total SQLite loader failure returns actionable remediation rather than cross-backend downgrade

### Lightweight verification commands to require in plans
- targeted Vitest coverage for `StorageFactory`, `config-loader`, generate command, and SQLite loader/error handling
- `rtk rg` checks proving no active runtime/config/docs surface still advertises `filesystem` / `kuzudb` as supported persistent backends
- at least one mocked-native-failure or env-gated fallback-path proof for SQLite loader behavior

</validation_architecture>

<open_risks>
## Risks To Watch During Execution

- `outputPath` currently points at `.mycodemap/storage` while SQLite tests use `.codemap/governance.sqlite`; path truth may need careful migration wording to avoid accidental data-loss promises.
- `StorageFactory.isStorageTypeAvailable()` uses `require.resolve('kuzu')`; removing Kuzu truth may ripple into tests or docs that assume this helper exposes all historical backends.
- Existing user worktree edits already touch `ARCHITECTURE.md`, `docs/ai-guide/OUTPUT.md`, `src/cli/config-loader.ts`, and generate/error tests; Phase 60 execution must work with those changes instead of reverting them.
- `sqlite-loader.ts` currently warns via `console.warn`; if structured fallback metadata is required, execution may need a seam above the loader rather than a larger rewrite inside it.

</open_risks>

## RESEARCH COMPLETE
