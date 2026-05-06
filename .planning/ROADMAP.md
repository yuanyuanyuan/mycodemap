# Milestone v2.2: architecture-foundation

**Status:** Approved 2026-05-06
**Phases:** 59-62
**Total Plans:** 11

## Overview

把 CodeMap 的 parser、storage 和 MCP 执行表面收敛为更少、更稳定的架构基线。先消除 `fast` / `hybrid` parser 双轨、`filesystem` / `kuzudb` storage 漂移，以及 contract-backed MCP tools 的 `cli_redirect` 假执行，再在稳定执行语义之上补 `codemap_context` routing gate。

## Phases

### Phase 59: Parser Cutover

**Goal:** Collapse parser selection to a single Tree-sitter-based main path and remove threshold-driven `fast` / `hybrid` runtime behavior from the active analysis flow.
**Depends on:** None
**Requirements:** PAR-01, PAR-02, PAR-03, PAR-04, PAR-05
**Plans:** 3 plans in 2 waves

**Wave 1** *(no dependencies)*
- [x] 59-01-PLAN.md — Parser orchestrator truth: `createParser()`, analyzer entry, mode deprecation contract
- [x] 59-02-PLAN.md — Registry integration for TypeScript/JavaScript, Python, and Go main-path routing

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 59-03-PLAN.md — WASM fallback verification, deprecated-mode failure coverage, docs/runtime truth sync

**Success criteria:**
1. `mycodemap generate` no longer relies on `FastParser` or `hybrid` switching in the active main path.
2. Deprecated `fast` / `hybrid` requests fail with explicit migration guidance instead of silently selecting a parser path.
3. TypeScript/JavaScript, Python, and Go can enter the same parser orchestration flow.
4. Native `tree-sitter` failure still has a verified WASM fallback path.

### Phase 60: Storage Convergence

**Goal:** Make SQLite the only supported persistent storage family and turn cross-backend fallback into explicit, actionable failure semantics.
**Depends on:** Phase 59
**Requirements:** STOR-01, STOR-02, STOR-03, STOR-04
**Plans:** 3 plans in 2 waves

**Wave 1** *(no dependencies)*
- [x] 60-01-PLAN.md — StorageFactory truth: remove `filesystem` / `kuzudb` active support, redefine `auto`
- [x] 60-02-PLAN.md — Config/default/runtime migration: config-loader, defaults, error codes, remediation text

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 60-03-PLAN.md — SQLite-family fallback validation across native, `sql.js`, and `node:sqlite` paths

**Success criteria:**
1. `storage.type: "auto"` resolves only within the SQLite family.
2. Explicit `filesystem` / `kuzudb` configs fail with deterministic unsupported-storage errors.
3. Native sqlite failure yields actionable remediation without silently switching backend families.
4. Config defaults, runtime messaging, and docs all describe SQLite as the single persistent backend truth.

### Phase 61: MCP Direct Execution

**Goal:** Replace `cli_redirect` contract-tool responses with real execution for an initial high-value MCP tool set, using shared command/service seams instead of duplicated logic.
**Depends on:** Phase 60
**Requirements:** MCP-01, MCP-02, MCP-03, MCP-04
**Plans:** 3 plans in 3 waves

**Wave 1** *(no dependencies)*
- [ ] 61-01-PLAN.md — Shared execution seam for the first high-value contract-backed tools

**Wave 2** *(blocked on 61-01 completion)*
- [ ] 61-02-PLAN.md — MCP adapter conversion: structured success/error output replaces `cli_redirect`

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 61-03-PLAN.md — Thin CLI wrapper cleanup, integration tests, and failure-path evidence

**Success criteria:**
1. At least one high-value contract-backed MCP tool family returns real structured results in a single call.
2. CLI and MCP adapters share the same execution logic for the converted tool family.
3. Success and failure outputs use one consistent structured result contract.
4. The converted CLI command wrappers become thinner instead of absorbing more business logic.

### Phase 62: Context Routing Gate

**Goal:** Add a minimal `codemap_context` routing gate on top of the stabilized execution surface so agents can request lightweight review/debug/default context and next-step tool suggestions.
**Depends on:** Phase 61
**Requirements:** CTX-01, CTX-02, CTX-03, CTX-04
**Plans:** 2 plans in 2 waves

**Wave 1** *(no dependencies)*
- [ ] 62-01-PLAN.md — `codemap_context` contract, graph stats/risk summary, task-based suggestions

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 62-02-PLAN.md — `detail_level`, tool filtering, focused verification, docs sync

**Success criteria:**
1. Agents can request `review`, `debug`, and `default` context from `codemap_context`.
2. The tool returns graph stats, risk score, and `nextToolSuggestions` that map to real executable tools.
3. `minimal` output is observably shorter than `standard` while preserving routing value.
4. Tool filtering prevents irrelevant tool exposure without breaking the routing contract.

## Milestone Summary

**Phase ordering rationale:**
- Parser truth comes first because it shapes graph generation and downstream storage/MCP behavior.
- Storage convergence comes second because MCP execution needs one stable backend truth.
- Direct execution comes third because it should sit on top of already-stable parser and storage behavior.
- Routing gate comes last because it is only useful once the underlying tools are truly executable.

**Stretch work kept outside committed scope:**
- `PAR-06` (`PythonTypeEnhancer`) remains non-blocking
- `MCP-05` (SSE transport) remains non-blocking

**Next up:** Phase 61 — MCP Direct Execution

---

_For historical shipped milestones, see `.planning/MILESTONES.md` and `.planning/milestones/`._
