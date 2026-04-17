---
date: 2026-04-15
topic: executable-architecture-constitution
focus: Pivot CodeMap to an "Executable Architecture Constitution" — making design.md a diff-aware, git-history-risk-weighted, CI-enforceable gate
---

# Ideation: Executable Architecture Constitution

## Codebase Context

**Project**: CodeMap — TypeScript CLI tool that generates structured code context for AI/Agents (dependency graphs, symbol maps, etc.). Currently pivoting from "AI code map tool" to "Executable Architecture Constitution" — an architecture contract governance engine.

**Key Assets**:
- MVP3 6-layer architecture is enforced (Interface → Infrastructure → Domain → Server → CLI)
- `design validate/map/handoff/verify` commands already exist with full JSON output contracts
- `docs/backlog.md` contains a v0.6 product重塑提案 to pivot to "architecture contract validation & guardrail system"
- Historical CI gateway exists (`codemap ci check-commits`, `check-headers`, `assess-risk`) but some are archived
- Git risk analyzer was designed and archived (GRAVITY/HEAT/IMPACT scoring formula exists in `src/orchestrator/workflow/git-analyzer.ts` but is dormant)
- Storage is currently KùzuDB; proposal suggests migrating to `better-sqlite3` + in-memory directed graph
- Tree-sitter parser exists for TS/Go/Python
- Current `design verify` only checks handoff drift; it does NOT scan actual `src/` code against architecture rules

**Pain Points**:
- `src/core/` and `src/parser/` migration debt
- Multiple temp output dirs
- Docs-sync pressure
- No diff-aware incremental validation exists yet

## Ranked Ideas

### 1. Diff-Aware Contract Enforcement
**Description:** Upgrade `mycodemap verify` into a true contract enforcer that scans `src/` code. By default, only validate files touched by `git diff` and their dependency chains. Return non-zero exit codes when `layer_direction`, `forbidden_imports`, or `module_public_api_only` rules are violated.
**Rationale:** This is the core product soul of the pivot. Today `design verify` only checks handoff drift and never touches source code — creating a dangerous false sense of security for users.
**Downsides:** Bridging design.md's text constraints with tree-sitter symbol extraction requires careful engineering for the first rule.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Unexplored

### 2. SQLite + In-Memory Graph Storage Migration
**Description:** Remove the KùzuDB adapter and replace it with `better-sqlite3` for persisting symbol relationships, plus a lightweight in-memory directed graph (Map/Set adjacency list) loaded at startup. The same storage layer should handle code graphs, git blame history, and contract metadata.
**Rationale:** KùzuDB installation failures are the top onboarding friction. SQLite's single-file nature turns CodeMap into a version-controllable CLI tool rather than a system requiring database ops.
**Downsides:** Must validate startup time and memory footprint against large codebases (target: <1s for 10K files, <200MB RAM).
**Confidence:** 85%
**Complexity:** Medium-High
**Status:** Unexplored

### 3. Revive Git History Risk Scoring (GRAVITY/HEAT/IMPACT)
**Description:** Harden the existing but dormant `calculateRiskScore` in `src/orchestrator/workflow/git-analyzer.ts` and rewire the GRAVITY/HEAT/IMPACT three-dimensional model into `verify` and `impact` outputs.
**Rationale:** Competitors cannot replicate the causal narrative of "who changed this block, what regressions this dependency chain caused before." The formula is already designed — it just needs to be wired up.
**Downsides:** Requires high-quality historical data (rollbacks, incident correlations); young codebases may have weak signal.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 4. Auto-Generate design.md from Existing Codebase
**Description:** Instead of asking humans to write `design.md` from scratch, use the existing tree-sitter parser to scan `src/` for module boundaries and public APIs, then generate a baseline contract. Users only review and lock it.
**Rationale:** Eliminates the root cause of "docs vs code divergence." If contract generation cost approaches zero, maintenance cost collapses too.
**Downsides:** Auto-generated rules may be too permissive or capture too many implementation details; needs smart UX to "lock" which rules matter.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 5. Auto-Generate Architecture Remediation Patches
**Description:** When `verify` finds a module boundary violation, don't just report it — generate a concrete refactoring patch (e.g., "move this import down to the adapter layer").
**Rationale:** In the AI era, "errors without fixes" is a half-measure. This was also highlighted in Codex's second opinion as a core element of the coolest version.
**Downsides:** Requires semantic understanding beyond import graphs; fully automated fixes risk introducing bugs.
**Confidence:** 65%
**Complexity:** High
**Status:** Unexplored

### 6. Self-Healing Design Contract (Drift Approval)
**Description:** Allow `design.md` to evolve with the code through an approval workflow. When drift is detected, provide `codemap design evolve --approve` to snapshot current code boundaries back into the contract as the new baseline.
**Rationale:** Architecture decay is an organizational norm. If contracts forever forbid drift, they get abandoned. A reviewable, approvable evolution mechanism is the only way they survive long-term.
**Downsides:** Requires strict versioning and multi-level approval, otherwise it becomes a channel for "legitimizing tech debt."
**Confidence:** 70%
**Complexity:** Medium
**Status:** Unexplored

### 7. MCP `verify_contract` Tool
**Description:** Wrap the `design verify` JSON output contract as an MCP Server tool for Claude Code / Cursor to call before every code modification.
**Rationale:** Minimal engineering investment for maximum ecosystem leverage. Transforms CodeMap from "a CLI developers remember to run" into "infrastructure AI calls by default."
**Downsides:** The MCP ecosystem is still early; interface standardization may shift.
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Zero-config CI Gateway | Too narrow; essentially a packaging simplification of existing `ci` subcommands, not a strategic improvement |
| 2 | Auto-sync docs guardrail | High engineering complexity for low leverage; contributes marginally to the pivot's core value |
| 3 | Architecture-as-Test-Suite | Functionally duplicates #1 with a different shape (Vitest vs CLI); drifts from CodeMap's CLI-native identity |
| 4 | GitHub Action as the only interface | Radical but too costly; conflicts with existing CLI investment and user base |
| 5 | Risk-weighted soft gate | Historically explored; soft thresholds rarely change developer behavior in practice |
| 6 | Commit message as architecture signal | Over-relies on LLM inference; high cost and unpredictable signal quality |
| 7 | TypeScript-only deep constitution | Strategic but would discard existing Go/Python parser work; unclear cost/benefit |
| 8 | One-shot removal of core/parser debt | A refactoring task, not a product improvement idea |

## Session Log

- 2026-04-15: Initial ideation — ~40 candidates generated across 4 frames, 7 survived after adversarial filtering
