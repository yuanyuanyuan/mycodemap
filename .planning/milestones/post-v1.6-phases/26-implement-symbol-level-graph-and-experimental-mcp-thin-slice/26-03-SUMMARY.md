---
phase: 26-implement-symbol-level-graph-and-experimental-mcp-thin-slice
plan: 03
subsystem: experimental-mcp-stdio
tags: [mcp, stdio, symbol-impact, cli, docs]

requires:
  - phase: 26-implement-symbol-level-graph-and-experimental-mcp-thin-slice
    provides: symbol-level graph truth from 26-01 and partial graph truth from 26-02
provides:
  - experimental `mcp start` / `mcp install`
  - `codemap_query` / `codemap_impact` MCP tools
  - storage-backed symbol impact contract
  - canonical stdio MCP integration docs
affects: [storage-contract, sqlite-storage, server-layer, cli, ai-docs]

tech-stack:
  added:
    - better-sqlite3
    - @types/better-sqlite3
    - dependency-cruiser
  patterns:
    - storage-level symbol impact traversal
    - stdio transport purity by bypassing human CLI startup side-effects
    - repo-local `.mcp.json` install flow for experimental host integration

key-files:
  created:
    - .planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-03-PLAN.md
    - .planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-03-SUMMARY.md
    - src/server/mcp/index.ts
    - src/server/mcp/server.ts
    - src/server/mcp/service.ts
    - src/server/mcp/types.ts
    - src/server/mcp/__tests__/CodeMapMcpServer.test.ts
    - src/cli/commands/mcp.ts
    - src/cli/commands/__tests__/mcp.test.ts
  modified:
    - src/interface/types/storage.ts
    - src/interface/types/index.ts
    - src/infrastructure/storage/index.ts
    - src/infrastructure/storage/interfaces/StorageBase.ts
    - src/infrastructure/storage/graph-helpers.ts
    - src/infrastructure/storage/adapters/MemoryStorage.ts
    - src/infrastructure/storage/adapters/FileSystemStorage.ts
    - src/infrastructure/storage/__tests__/FileSystemStorage.test.ts
    - src/infrastructure/storage/adapters/KuzuDBStorage.ts
    - src/infrastructure/storage/adapters/SQLiteStorage.ts
    - src/infrastructure/storage/__tests__/SQLiteStorage.test.ts
    - src/cli/index.ts
    - src/cli/__tests__/index-help.test.ts
    - README.md
    - AI_GUIDE.md
    - CLAUDE.md
    - docs/ai-guide/COMMANDS.md
    - docs/ai-guide/INTEGRATION.md
    - docs/ai-guide/OUTPUT.md
    - docs/rules/engineering-with-codex-openai.md
    - .planning/ROADMAP.md
    - package.json
    - package-lock.json

requirements-completed:
  - P26-NOW-MCP-STDIO
  - P26-NOW-SYMBOL-IMPACT

completed: 2026-04-19
---

# Phase 26 Plan 03 Summary

## Accomplishments

- 新增 experimental `mycodemap mcp install` / `mycodemap mcp start`，并在 CLI 入口绕开首次运行欢迎信息、迁移提示和 runtime log 对 `stdout` 的污染风险。
- 新增 `src/server/mcp/*`，提供真实本地 stdio MCP server，并注册 `codemap_query` / `codemap_impact` 两个只读工具。
- tool contract 统一返回 `status`、`confidence`、`graph_status`、`generated_at` 与 `error.code`，覆盖 `GRAPH_NOT_FOUND`、`SYMBOL_NOT_FOUND`、`AMBIGUOUS_EDGE`。
- storage contract 新增 `loadGraphMetadata()` 与 `calculateSymbolImpact()`；memory / filesystem / kuzudb 复用 shared helper，SQLite 用 relation table 直查 callers 链完成 symbol impact。
- `docs/ai-guide/INTEGRATION.md` 已改为真实 stdio MCP path 为主，旧 CLI wrapper 明确降级为 fallback。
- 补齐 focused tests，包含真实 stdio transport smoke（双 `StdioServerTransport` loopback）、CLI install flow、help surface 与 SQLite symbol impact。
- 真实 dist dogfood 额外暴露了 filesystem backend 的日期反序列化缺口：`graph.project.updatedAt` 从 JSON 读盘后退化为 string，导致 MCP metadata 序列化失败；现已改为复用 `deserializeCodeGraphSnapshot(...)`，并补上 filesystem regression test。

## Verification

- `rtk npm run test -- src/infrastructure/storage/__tests__/SQLiteStorage.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/removed-commands.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts src/cli/commands/__tests__/mcp.test.ts src/cli/__tests__/index-help.test.ts` — passed
- `rtk npm run typecheck` — passed
- `rtk npm run docs:check` — passed
- `rtk npm run build` — passed
- `rtk npm run test -- src/infrastructure/storage/__tests__/FileSystemStorage.test.ts src/server/mcp/__tests__/CodeMapMcpServer.test.ts` — passed
- `rtk node dist/cli/index.js generate --symbol-level -m smart` — passed
- `rtk node dist/cli/index.js mcp install` — passed
- `rtk node /tmp/codemap-mcp-smoke.mjs` — passed（真实 stdio child-process smoke，`codemap_query` / `codemap_impact` 均返回 `status: ok`）
- `rtk git diff --check` — passed

## Failure Rehearsal

- 空图 / 未生成图：`codemap_query` 返回 `GRAPH_NOT_FOUND`，并把 `graph_status` 标成 `missing`。
- 同名 symbol 无法消歧：`codemap_query` 返回 `AMBIGUOUS_EDGE`，并附 candidate 列表。
- stdio transport purity：loopback smoke test 捕获 `stdout` 原始帧，并验证每一帧都能直接 `JSON.parse()`，证明没有混入人类日志。

## Deviations

- `mcp install` 当前只维护 repo-local `.mcp.json`；没有实现全局 host support matrix、升级/卸载生命周期。
- MCP contract 仍未暴露 graph freshness identity（如 `commit_sha` / `dirty`）；该问题继续留在 `TODOS.md`。
- 未创建 git commit；遵守当前“除非用户显式要求，否则不 commit”的约束。

## Next Up

- 评估是否需要把 graph freshness identity（`commit_sha` / `dirty` / `graph_schema_version`）补进 MCP metadata
- 复查 `TODOS.md` 中 `mcp install` host support matrix 与 lifecycle 设计
- 基于真实 dogfood 反馈判断 MCP 是否继续保留在首期 surface，或在后续 tranche 下沉/延后
