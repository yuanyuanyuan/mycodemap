---
date: 2026-04-15
archived: 2026-04-29
source: docs/ideation/2026-04-15-executable-architecture-constitution-ideation.md
reason: 以下想法已在 2026-04-15 至 2026-04-29 期间实现并合并至主分支
---

# Ideation Archive: Executable Architecture Constitution (Implemented)

> 本归档包含原 ideation 文档中已实现的 2 项核心想法（#1 Diff-Aware Contract Enforcement、#3 Revive Git History Risk Scoring）。
> 剩余项（#2 SQLite Migration、#4–#7）保留在源文档中。

## Codebase Context (原文)

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

## 已实现的想法

### 1. Diff-Aware Contract Enforcement ✅
**Description:** Upgrade `mycodemap verify` into a true contract enforcer that scans `src/` code. By default, only validate files touched by `git diff` and their dependency chains. Return non-zero exit codes when `layer_direction`, `forbidden_imports`, or `module_public_api_only` rules are violated.
**Rationale:** This is the core product soul of the pivot. Today `design verify` only checks handoff drift and never touches source code — creating a dangerous false sense of security for users.
**Downsides:** Bridging design.md's text constraints with tree-sitter symbol extraction requires careful engineering for the first rule.
**Confidence:** 90%
**Complexity:** Medium
**Status:** Implemented

**Implementation References:**
- `src/cli/contract-diff-scope.ts` — diff scope resolution (`--base`, `--changed-files`)
- `src/cli/contract-checker.ts` — rule execution (`layer_direction`, `forbidden_imports`, `module_public_api_only`)
- `src/cli/commands/check.ts` — CLI entry, `process.exitCode = 1` on blocking violations
- `src/cli/design-contract-loader.ts` — contract rule parsing and validation
- Tests: `src/cli/commands/__tests__/check-diff-aware.test.ts`, `src/cli/__tests__/contract-checker.test.ts`, `src/cli/__tests__/design-contract-loader.test.ts`

### 3. Revive Git History Risk Scoring (GRAVITY/HEAT/IMPACT) ✅
**Description:** Harden the existing but dormant `calculateRiskScore` in `src/orchestrator/workflow/git-analyzer.ts` and rewire the GRAVITY/HEAT/IMPACT three-dimensional model into `verify` and `impact` outputs.
**Rationale:** Competitors cannot replicate the causal narrative of "who changed this block, what regressions this dependency chain caused before." The formula is already designed — it just needs to be wired up.
**Downsides:** Requires high-quality historical data (rollbacks, incident correlations); young codebases may have weak signal.
**Confidence:** 80%
**Complexity:** Medium
**Status:** Implemented

**Implementation References:**
- `src/orchestrator/history-risk-service.ts` — canonical `GitHistoryService` with GRAVITY/HEAT/IMPACT scoring
- `src/orchestrator/workflow/git-analyzer.ts` — `calculateRiskScore` and `FileHeat` primitives
- `src/cli/contract-checker.ts` — integrates `GitHistoryService` into `runContractCheck`
- `src/cli/commands/check.ts` — renders `History Risk` in CLI output
- Tests: `src/orchestrator/__tests__/history-risk-service.test.ts`, `src/orchestrator/__tests__/git-analyzer.test.ts`

## Session Log

- 2026-04-15: Initial ideation — ~40 candidates generated across 4 frames, 7 survived after adversarial filtering
- 2026-04-15: Began implementation of diff-aware contract enforcement (`contract-diff-scope.ts`, `contract-checker.ts`)
- 2026-04-15: Revived and hardened GRAVITY/HEAT/IMPACT scoring into `history-risk-service.ts`
- 2026-04-29: Verified #1 and #3 fully implemented; archived to this document
