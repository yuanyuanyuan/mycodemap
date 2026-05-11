# Phase 75: Core Infrastructure and Basic Token Analysis - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 75-core-infrastructure-basic-token-analysis
**Areas discussed:** Representative query set, Persistence granularity, Token estimation contract

---

## Representative query set

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed built-in set | Ship a narrow built-in representative query set for repeatable measurement | ✓ |
| Built-in + custom samples | Blend standard queries with project-local extension points in v1 | |
| User-provided only | Let the user fully define the sample set | |

**User's choice:** Fixed built-in set  
**Notes:** The first release should optimize for repeatability and comparability. Query coverage should balance common agent workflows and heavier response shapes, and it should focus on graph/query plus content-style queries rather than tool/ops commands.

---

## Persistence granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Detail rows first | Persist each run as a fact row; aggregate at read time | ✓ |
| Aggregates only | Store only grouped summaries / averages | |
| Detail + aggregate truth tables | Persist both as first-class storage truth | |

**User's choice:** Detail rows first  
**Notes:** Later reporting, CI thresholds, and trend analysis should build on persisted facts. Phase 75 should stay narrow and avoid storing full query-input snapshots by default.

---

## Token estimation contract

| Option | Description | Selected |
|--------|-------------|----------|
| Truth fields + estimated tokens | Treat raw chars/bytes as truth; token is derived estimate | ✓ |
| Token-first truth | Optimize around token counts as the primary authoritative metric | |
| Full harness accounting | Try to estimate full agent-side token load from the start | |

**User's choice:** Truth fields + estimated tokens  
**Notes:** Phase 75 should record input + output estimates, but keep them clearly marked as estimated. Input-side accounting should use a minimal approximation rather than full harness/system-prompt/schema modeling.

---

## the agent's Discretion

- Exact built-in representative query instances inside the fixed query-type set
- Exact SQLite schema for detail records, as long as per-run facts stay primary
- Exact stable heuristic used to derive estimated tokens from the truth fields

## Deferred Ideas

- Custom sample-set extensibility
- Tool/ops command coverage
- Tokenizer-accurate accounting
- Full harness/system-prompt/tool-schema cost modeling
- Rich report UX, threshold policy tuning, and intelligence-layer analytics
