# Phase 64: Incremental Graph Refresh - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 11
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/cli/commands/generate.ts` | handler | batch | `src/cli/commands/generate.ts` | exact |
| `src/cli/contract-diff-scope.ts` | utility | request-response | `src/cli/contract-diff-scope.ts` | exact |
| `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts` | repository | CRUD | `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts` | exact |
| `src/infrastructure/storage/adapters/SQLiteStorage.ts` | service | CRUD | `src/infrastructure/storage/adapters/SQLiteStorage.ts` | exact |
| `src/infrastructure/storage/graph-helpers.ts` | utility | transform | `src/infrastructure/storage/graph-helpers.ts` | exact |
| `src/cache/index.ts` | utility | invalidation | `src/cache/index.ts` | exact |
| `src/server/handlers/AnalysisHandler.ts` | handler | request-response | `src/server/handlers/AnalysisHandler.ts` | exact |
| `src/cli/commands/__tests__/generate.test.ts` | test | batch | `src/cli/commands/__tests__/generate.test.ts` | exact |
| `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | test | CRUD | `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` | exact |
| `src/infrastructure/storage/__tests__/graph-helpers.test.ts` | test | transform | `src/infrastructure/storage/__tests__/graph-helpers.test.ts` | exact |
| `tests/e2e/graph-schema-foundation.test.ts` | test | e2e | `tests/e2e/graph-schema-foundation.test.ts` | exact |

## Pattern Assignments

### `src/cli/contract-diff-scope.ts`

**Pattern:** explicit-input-overrides-derived-input + warning-code fallback

**Copy points**
- `--changed-files` 优先于 `--base`
- 发现越界/不存在/空 diff 时不猜测，返回 structured warning
- 使用稳定 machine-readable code

**Apply to Phase 64**
- 复用 precedence 和 fail-safe 思路
- 不直接复用 full-scan fallback 语义；graph refresh 应在不可靠边界时改为 `failed`

### `src/cli/commands/ci.ts`

**Pattern:** `origin/main...HEAD` → `HEAD` fallback chain

**Copy points**
- 先尝试 remote base branch
- remote 不可用时退到本地 `HEAD`
- git diff 失败时显式报错退出

**Apply to Phase 64**
- 可用作默认 diff baseline sourcing
- 但别把 CI 的宽松心智直接搬过来；Phase 64 要比 CI 更保守

### `src/cli/commands/generate.ts`

**Pattern:** one build path + thin command surface + final storage save

**Copy points**
- `generateCommand()` 统一编排输入、分析、输出文件、落库
- `saveToCodeGraphStorage()` 是 storage 写边界
- `convertToCodeGraph()` 是旧 ModuleInfo → persisted truth 的收口点

**Apply to Phase 64**
- incremental refresh 应扩展现有 generate surface，而不是另建独立命令栈
- 建议把 changed-file sourcing 放 command 层，把 invalidation/writeback 下沉到 repository/storage

### `src/infrastructure/repositories/CodeGraphRepositoryImpl.ts`

**Pattern:** narrow repository seam over storage

**Copy points**
- repository 只包一层 `saveCodeGraph()/loadCodeGraph()`
- 上层不用直接碰 SQLite 细节

**Apply to Phase 64**
- 新增 incremental refresh seam 时优先加在 repository/storage 边界，避免 command 直接操纵 SQLite

### `src/infrastructure/storage/adapters/SQLiteStorage.ts`

**Pattern:** transaction-owned truth rewrite + compatibility gate

**Copy points**
- `assertSchemaCompatibility()`
- `assertProjectionParity()`
- `runInTransaction()`
- `replaceCurrentGraph()`

**Apply to Phase 64**
- 新增 slice replace 也必须服从同样的 transaction + parity + rebuild-required gate
- partial refresh 不能绕过 projection parity

### `src/infrastructure/storage/graph-helpers.ts`

**Pattern:** clone-first graph mutation helpers

**Copy points**
- `cloneCodeGraph()`
- `upsertModuleInGraph()`
- `deleteModuleFromGraph()`

**Apply to Phase 64**
- 适合新增 `deleteSliceFromGraph()`、`collectNeighborhood()`、`mergeRecomputedSlice()` 这类 helper
- 帮助把复杂的 graph surgery 从 `SQLiteStorage.ts` 拆出去

### `src/cache/index.ts`

**Pattern:** dependency cascade invalidation

**Copy points**
- dependency graph 的 dependent fan-out
- cache invalidate API 是显式的，不做隐式修复

**Apply to Phase 64**
- 可借鉴 module dependency 传播风格
- 不能直接复用为 persisted graph invalidation，因为它不认识 symbol/call/confidence

### `src/server/handlers/AnalysisHandler.ts`

**Pattern:** unsupported-public-surface gate

**Copy points**
- 对未开放能力返回 stable code
- 不伪装成功

**Apply to Phase 64**
- 若本 phase 不打算开放 server incremental API，应保持 unsupported gate，并把能力先锁在 CLI/storage
- 若要开 API，必须同步明确 envelope 与 tests

### Tests

**`src/infrastructure/storage/__tests__/SQLiteStorage.test.ts`**
- 最适合覆盖 stale/projection drift/partial metadata/snapshot retention

**`src/infrastructure/storage/__tests__/graph-helpers.test.ts`**
- 最适合覆盖 2-hop neighborhood、双向 propagation、ambiguous edge conservative expansion

**`src/cli/commands/__tests__/generate.test.ts`**
- 最适合覆盖 changed-file precedence、JSON output/diagnostics、no silent fallback

**`tests/e2e/graph-schema-foundation.test.ts`**
- 最适合复制真实 subprocess 骨架，新增 full generate → modify files → incremental refresh → verify persisted truth 的闭环

## Anti-Patterns to Avoid

- 在 `generate.ts` 里同时实现 changed-file sourcing、neighborhood traversal、SQLite slice writeback、JSON envelope，导致 command file 爆炸。
- 在 `SQLiteStorage.ts` 内联大量 graph traversal 逻辑，不通过 helper 拆分。
- 复用 contract-check 的 full-scan fallback 并把 refresh 结果报成 success。
- 只验证 CLI 输出，不验证 SQLite truth、`graph_edges` parity 和 partial/stale metadata。
