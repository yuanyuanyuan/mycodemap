---
phase: 26-implement-symbol-level-graph-and-experimental-mcp-thin-slice
plan: 02
subsystem: graph-integrity
tags: [generate, analyzer, sqlite, graph-status, partial-truth]

requires:
  - phase: 26-implement-symbol-level-graph-and-experimental-mcp-thin-slice
    provides: symbol-level generate truth source from 26-01
provides:
  - explicit `graphStatus` / `failedFileCount` / `parseFailureFiles`
  - analyzer partial-graph detection based on discovered-vs-parsed files
  - SQLite persistence + readback of graph integrity metadata
affects: [analyzer, generate-cli, sqlite-storage, codemap-json, ai-docs]

tech-stack:
  added: []
  patterns:
    - discovered-vs-materialized graph integrity check
    - SQLite metadata-table persistence for additive graph truth

key-files:
  created:
    - .planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-02-PLAN.md
    - .planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-02-SUMMARY.md
  modified:
    - src/interface/types/index.ts
    - src/domain/entities/CodeGraph.ts
    - src/core/analyzer.ts
    - src/core/__tests__/analyzer.test.ts
    - src/cli/commands/generate.ts
    - src/cli/__tests__/generate.test.ts
    - src/infrastructure/storage/graph-helpers.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/infrastructure/storage/sqlite/GovernanceGraphCache.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - README.md
    - AI_GUIDE.md
    - CLAUDE.md
    - docs/ai-guide/COMMANDS.md
    - docs/ai-guide/OUTPUT.md

requirements-completed:
  - P26-NOW-PARTIAL-GRAPH-TRUTH

completed: 2026-04-18
---

# Phase 26 Plan 02 Summary

## Accomplishments

- `CodeMap` / `CodeGraph` 现在都支持 `graphStatus`、`failedFileCount`、`parseFailureFiles`，为“图是否完整”提供正式 contract。
- `analyze()` 现在根据 discovered files 与最终成功 materialize 的 modules 计算 `complete | partial`，不再把静默掉队的文件伪装成完整图。
- `generate` stdout 会显示图状态；`convertToCodeGraph()` 会把这些 graph integrity 字段透传到后端存储。
- SQLite 使用 metadata 表持久化 `graph_status`、`failed_file_count`、`parse_failure_files_json`，`loadCodeGraph()` 与 governance cache 读回时仍保留这组信息。
- AI / 用户文档已补齐 `graphStatus` 语义，明确 `summary.totalFiles` 表示成功入图模块数，而不是 discovered file 总数。

## Verification

- `rtk npm run test -- src/core/__tests__/analyzer.test.ts src/cli/__tests__/generate.test.ts src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` — passed
- `rtk npm run typecheck` — passed
- `rtk npm run docs:check` — passed
- `rtk npm run build` — passed
- `rtk git diff --check` — passed

## Failure Rehearsal

- 用 test double 让 smart parser 静默跳过 `src/b.ts`，验证 `analyze()` 返回 `graphStatus = "partial"`、`failedFileCount = 1`、`parseFailureFiles = [".../src/b.ts"]`。
- 验证 `generate` 在 partial analyze 结果下不会丢失这组 metadata。
- 验证 SQLite 保存并重新读回后，partial graph truth 仍然可见，不会退化成“看起来完整”的图。

## Deviations

- 本次没有实现 graph freshness identity（`commit_sha` / `dirty` / `graph_schema_version` 等）；该问题仍留在 `TODOS.md`。
- 本次仍未进入 MCP stdio transport、`codemap_query` / `codemap_impact` tool contract；这些留给后续 Phase 26 plans。
- 未创建 git commit；遵守当前“除非用户显式要求，否则不 commit”的约束。

## Next Up

- Phase 26-03：实现 experimental MCP stdio transport，并做 `stdout` protocol purity smoke test
- Phase 26-03：定义 `codemap_query` / `codemap_impact` 的 structured error contract 与 golden tests
- 复查 `TODOS.md` 中 graph freshness identity，决定是否在 MCP contract 前补 `commit_sha` / `dirty` 等版本身份字段
