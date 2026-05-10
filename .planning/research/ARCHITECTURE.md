# Architecture Research: agent-metrics Integration

**Domain:** CodeMap v2.7 agent-effectiveness-validation
**Researched:** 2026-05-10
**Confidence:** HIGH

## Summary

`agent-metrics` integrates into CodeMap through six existing architectural seams: CLI command registration, interface contract schema, output infrastructure, SQLite storage, git history parsing, and the execution layer. The command should follow the `history` command pattern (thin CLI wrapper over a dedicated service) rather than the `benchmark` command pattern (self-contained with custom output).

## Key Findings

### 1. CLI Command Registration: Use Subcommand Pattern

**Current state:** `src/cli/index.ts` registers commands via Commander.js. Two patterns exist:

| Pattern | Example | When Used |
|---------|---------|-----------|
| Direct registration | `benchmark`, `query`, `deps` | Single-purpose commands |
| Subcommand via `.addCommand()` | `ci`, `check`, `history`, `design` | Command families with multiple subcommands |

**Recommendation:** Use `.addCommand()` pattern for `agent-metrics` because it has two subcommands (`token`, `report`). This matches `ci`, `check`, and `design` command families.

**Integration point:** `src/cli/index.ts` line ~229-244. Add `program.addCommand(agentMetricsCommand)` alongside existing command families.

### 2. Interface Contract Schema: New Contract File Required

**Current state:** `src/cli/interface-contract/commands/` contains contracts for 8 commands. Each contract is a `CommandContract` object with `name`, `description`, `args`, `flags`, `outputShape`, `errorCodes`, and `examples`.

**Recommendation:** Create `src/cli/interface-contract/commands/agent-metrics.ts` with two subcontracts:
- `agentMetricsTokenContract` for `codemap agent-metrics token`
- `agentMetricsReportContract` for `codemap agent-metrics report`

**Integration point:** `src/cli/interface-contract/commands/index.ts` must add the new contracts to `commandContracts` array.

### 3. Output Infrastructure: Reuse Shared Layer

**Current state:** `src/cli/output/` provides:
- `resolveOutputMode()` — TTY/flag detection for `--json` / `--human`
- `renderOutput()` — mode-aware stdout writer
- `formatError()` — structured error formatting
- `createProgressEmitter()` — progress updates

**Problem:** `benchmark` command does NOT use this infrastructure. It has custom `console.log` output and manual `JSON.stringify`. This is technical debt (noted in PROJECT.md as `AGENT-11: benchmark 命令迁移到共享输出基础设施`).

**Recommendation:** `agent-metrics` MUST use the shared output infrastructure from day one. This avoids adding to the migration debt and ensures consistent JSON/human output behavior.

**Pattern to follow:** `src/cli/commands/query.ts` lines 29-53:
```typescript
const mode = resolveOutputMode({ json: options.json, human: options.human });
const progress = createProgressEmitter(mode, 'Analyzing tokens...');
// ... execute logic ...
renderOutput(result, formatAgentMetricsHuman, mode);
```

### 4. SQLite Storage: New Table for Metrics Persistence

**Current state:** `src/infrastructure/storage/sqlite/schema.ts` defines the governance schema with tables for `metadata`, `projects`, `modules`, `symbols`, `dependencies`, `graph_edges`, `history_snapshots`, `history_relations`, and `snapshots`.

**Recommendation:** Add a new `agent_metrics` table to persist token cost analysis results:

```sql
CREATE TABLE IF NOT EXISTS agent_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  query_type TEXT NOT NULL,
  command TEXT NOT NULL,
  json_response_size_bytes INTEGER NOT NULL,
  estimated_input_tokens INTEGER NOT NULL,
  estimated_output_tokens INTEGER NOT NULL,
  estimated_total_tokens INTEGER NOT NULL,
  execution_time_ms INTEGER,
  git_commit_hash TEXT,
  git_commit_message TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_project
  ON agent_metrics (project_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_query_type
  ON agent_metrics (query_type);
```

**Integration points:**
- `src/infrastructure/storage/sqlite/schema.ts` — add table definition
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — add methods for metrics CRUD
- `src/interface/types/storage.ts` — add `IStorage` method signatures for metrics

### 5. Git History Parsing: Reuse GitAnalyzer

**Current state:** `src/orchestrator/git-analyzer.ts` provides:
- `GitAnalyzer` class with `findRelatedCommits()`, `calculateRiskScore()`
- `CommitInfo` interface with `hash`, `message`, `date`, `author`, `files`, `tag`
- `CommitTag` with `type` (BUGFIX/FEATURE/REFACTOR/etc), `scope`, `subject`

**Recommendation:** Create `src/orchestrator/agent-metrics-service.ts` that:
1. Uses `GitAnalyzer.findRelatedCommits()` to get recent commits
2. Maps commit patterns to query types (e.g., refactor commits → impact analysis, feature commits → dependency tracing)
3. Runs representative queries for each type and measures token costs

**Query type mapping from git history:**

| Commit Pattern | Extracted Query Type | Rationale |
|----------------|---------------------|-----------|
| `REFACTOR` + files in same module | `impact` analysis | Refactoring requires understanding impact |
| `FEATURE` + new dependencies | `deps` query | Adding features often requires dependency analysis |
| `BUGFIX` + specific symbol | `query --symbol` | Bug fixes target specific symbols |
| `DELETE` + module removal | `cycles` detection | Removing modules may break cycles |
| Multiple files changed | `analyze find` | Broad changes need comprehensive analysis |

### 6. Execution Layer: Optional MCP Integration

**Current state:** `src/execution/contract-tools/` provides shared transport-free execution for `query`, `deps`, `analyze`. Both CLI and MCP call this layer.

**Recommendation:** For MVP, `agent-metrics` is CLI-only (as stated in requirements). However, the service layer should be designed to be callable from MCP later:

```
CLI: src/cli/commands/agent-metrics.ts
  ↓
Service: src/orchestrator/agent-metrics-service.ts
  ↓
Execution: queries existing contract-tools (query, deps, impact, etc.)
  ↓
Storage: IStorage (SQLite) for metrics persistence
```

This ensures future MCP gateway integration (v2) can reuse the service layer without duplication.

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/cli/commands/agent-metrics.ts` | CLI entry point, flag parsing, output formatting | `agent-metrics-service.ts`, `output/` |
| `src/orchestrator/agent-metrics-service.ts` | Core logic: git history parsing, query execution, token estimation | `git-analyzer.ts`, `contract-tools/`, `IStorage` |
| `src/cli/interface-contract/commands/agent-metrics.ts` | Schema definition for `--schema` output | `interface-contract/index.ts` |
| `src/infrastructure/storage/sqlite/schema.ts` | Table definition | `SQLiteStorage.ts` |
| `src/infrastructure/storage/adapters/SQLiteStorage.ts` | Metrics CRUD operations | `IStorage` interface |

## Data Flow

```
1. User runs: codemap agent-metrics report --max-tokens-per-query 5000

2. CLI layer (src/cli/commands/agent-metrics.ts):
   - Parse flags via Commander
   - Resolve output mode (--json / --human / TTY)
   - Call agent-metrics-service

3. Service layer (src/orchestrator/agent-metrics-service.ts):
   a. Git history extraction:
      - GitAnalyzer.findRelatedCommits() → recent commits
      - Map commit patterns → query types
   b. Query execution:
      - For each query type, run representative query via contract-tools
      - Capture JSON response size
   c. Token estimation:
      - JSON size → token count (heuristic: ~4 chars/token)
      - Aggregate by query type
   d. Threshold check:
      - If --max-tokens-per-query set, compare against threshold
      - Return pass/fail status

4. Storage layer (IStorage):
   - Persist metrics to agent_metrics table
   - Load historical metrics for trend analysis

5. Output layer (src/cli/output/):
   - renderOutput() with human renderer or JSON
   - Exit code 1 if threshold exceeded
```

## Suggested Build Order

### Phase 75: agent-metrics Core Infrastructure

**Goal:** Create the command skeleton, service layer, and SQLite schema.

**Components:**
1. `src/cli/commands/agent-metrics.ts` — CLI entry with `token` and `report` subcommands
2. `src/orchestrator/agent-metrics-service.ts` — Service with git history parsing and query execution
3. `src/infrastructure/storage/sqlite/schema.ts` — Add `agent_metrics` table
4. `src/infrastructure/storage/adapters/SQLiteStorage.ts` — Add metrics CRUD methods
5. `src/interface/types/storage.ts` — Add `IStorage` method signatures

**Why first:** Foundation for all subsequent work. Without storage and service, no analysis can run.

### Phase 76: Token Estimation and Reporting

**Goal:** Implement token heuristics, per-query-type aggregation, and report output.

**Components:**
1. Token estimation logic in service layer
2. Per-query-type statistics (avg, min, max, p95)
3. Human-readable table renderer
4. JSON output mode

**Why second:** Depends on Phase 75 infrastructure. Reporting is the primary user value.

### Phase 77: CI Gate and Threshold Enforcement

**Goal:** Implement `--max-tokens-per-query` threshold and non-zero exit code.

**Components:**
1. Threshold comparison logic
2. Pass/fail summary output
3. Exit code handling
4. CI-friendly output format

**Why third:** Depends on Phase 76 reporting. CI gate is the secondary user value.

### Phase 78: Interface Contract and Schema

**Goal:** Define interface contract for `agent-metrics` commands.

**Components:**
1. `src/cli/interface-contract/commands/agent-metrics.ts`
2. Update `src/cli/interface-contract/commands/index.ts`
3. Update `src/cli/interface-contract/index.ts` exports

**Why last:** Contract can be defined after command behavior is stable. Early contract definition risks churn.

## Relationship with Existing Benchmark Command

**Current state:** `benchmark` command compares WASM vs Native performance. It has:
- Custom output formatting (not using shared infrastructure)
- No interface contract
- No storage persistence
- No git history integration

**Recommendation:** Keep `agent-metrics` separate from `benchmark` as stated in requirements. However, note that `AGENT-11` (benchmark migration to shared output infrastructure) should be done in `v2.6` to reduce technical debt.

**Future consideration:** If `benchmark` migrates to shared infrastructure, both commands could share:
- Output formatting patterns
- Progress emitter usage
- Error handling patterns

## Anti-Patterns to Avoid

### Anti-Pattern 1: Custom Output Like Benchmark

**What:** Writing `console.log` with manual table formatting instead of using `renderOutput()`.

**Why bad:** Creates migration debt. `AGENT-11` already exists to fix this for benchmark.

**Instead:** Use `resolveOutputMode()`, `renderOutput()`, and `formatError()` from `src/cli/output/`.

### Anti-Pattern 2: Inline Git Parsing

**What:** Duplicating git command execution logic in the command file.

**Why bad:** `GitAnalyzer` already handles git operations with proper error handling.

**Instead:** Create a service that uses `GitAnalyzer` as a dependency.

### Anti-Pattern 3: Ephemeral-Only Metrics

**What:** Running analysis without persisting results to SQLite.

**Why bad:** No trend tracking, no historical comparison, no CI regression detection.

**Instead:** Always persist to `agent_metrics` table, even if user only wants current report.

### Anti-Pattern 4: Tight Coupling to Contract-Tools

**What:** Directly importing and calling `executeQueryTool()` in the command file.

**Why bad:** Bypasses service layer, makes MCP integration harder.

**Instead:** Service layer calls contract-tools; command file calls service.

## Open Questions

1. **Token estimation calibration:** The heuristic of ~4 chars/token needs validation against actual LLM tokenizers. Should we add a calibration mode that runs against known token counts?

2. **Query scenario coverage:** How many representative queries per type? Running all possible queries could be expensive. Suggest starting with 3-5 per type.

3. **Historical trend window:** How far back should trend analysis go? Suggest 30 days by default with `--since` flag.

4. **Metrics retention policy:** Should old metrics be pruned? Suggest keeping last 90 days by default.

5. **Git history depth:** How many commits to analyze for query extraction? Suggest 50-100 recent commits.

## Sources

- [src/cli/index.ts](/data/codemap/src/cli/index.ts) — CLI command registration
- [src/cli/commands/benchmark.ts](/data/codemap/src/cli/commands/benchmark.ts) — existing benchmark command (anti-pattern reference)
- [src/cli/commands/query.ts](/data/codemap/src/cli/commands/query.ts) — good pattern for shared output usage
- [src/cli/commands/history.ts](/data/codemap/src/cli/commands/history.ts) — good pattern for service-backed command
- [src/cli/interface-contract/commands/benchmark.ts](/data/codemap/src/cli/interface-contract/commands/benchmark.ts) — interface contract example
- [src/cli/interface-contract/commands/index.ts](/data/codemap/src/cli/interface-contract/commands/index.ts) — contract registry
- [src/cli/output/index.ts](/data/codemap/src/cli/output/index.ts) — shared output infrastructure
- [src/cli/output/types.ts](/data/codemap/src/cli/output/types.ts) — output types
- [src/infrastructure/storage/sqlite/schema.ts](/data/codemap/src/infrastructure/storage/sqlite/schema.ts) — SQLite schema
- [src/infrastructure/storage/adapters/SQLiteStorage.ts](/data/codemap/src/infrastructure/storage/adapters/SQLiteStorage.ts) — storage adapter
- [src/interface/types/storage.ts](/data/codemap/src/interface/types/storage.ts) — storage interface
- [src/orchestrator/git-analyzer.ts](/data/codemap/src/orchestrator/git-analyzer.ts) — git history parsing
- [src/orchestrator/history-risk-service.ts](/data/codemap/src/orchestrator/history-risk-service.ts) — service pattern reference
- [src/cli/storage-runtime.ts](/data/codemap/src/cli/storage-runtime.ts) — storage initialization
- [src/execution/contract-tools/](/data/codemap/src/execution/contract-tools/) — shared execution layer
- [docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md](/data/codemap/docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md) — requirements

---
*Architecture research for: v2.7 agent-effectiveness-validation*
*Researched: 2026-05-10*
