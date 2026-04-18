---
phase: 21-evaluate-arcadedb-node-integration-feasibility
plan: 01
subsystem: "support-truth-blast-radius-and-http-smoke"
tags: [arcadedb, evidence, blast-radius, smoke, storage]
requires: []
provides:
  - official support evidence for Node-facing ArcadeDB paths
  - quantified storage/config/docs blast radius baseline
  - isolated HTTP smoke harness under `scripts/experiments/`
affects: [phase-21-02, arcadedb-follow-up-scope]
tech-stack:
  added: []
  patterns: [evidence-first, isolated-harness, product-surface-accounting]
key-files:
  created:
    - .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVIDENCE.md
    - .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-BLAST-RADIUS.md
    - scripts/experiments/arcadedb-http-smoke.mjs
  modified: []
key-decisions:
  - "Embedded 被明确排除为 Node runtime 路径；HTTP/JSON 成为主实验面，Bolt 只保留为 secondary validation"
  - "现有 runtime/docs drift (`auto -> kuzudb` vs `auto -> filesystem`) 被纳入 blast radius baseline"
requirements-completed: [ARC-01, ARC-02, ARC-03]
completed: 2026-03-28
---

# Phase 21-01 Summary

**Wave 1 已把 `Phase 21` 从模糊猜测收口成硬证据：官方支持矩阵、blast radius baseline 和隔离 smoke harness 都已就位。**

## Accomplishments

- 新增 `21-EVIDENCE.md`，明确 `Embedded = NO-GO`、`HTTP/JSON = primary`、`Bolt = secondary`
- 新增 `21-BLAST-RADIUS.md`，把当前 contract 缺口和 `auto` 现有 drift 一并量化
- 新增 `scripts/experiments/arcadedb-http-smoke.mjs`，通过 `--help` 提供离线契约说明，通过 `node --check` 保证语法可验证

## Verification

- `rg -n "Embedded \| JVM only|HTTP/JSON \| Client/server|Bolt \| Client/server" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVIDENCE.md`
- `rg -n "auto -> kuzudb|auto -> filesystem|serverLifecycle" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-BLAST-RADIUS.md`
- `node --check scripts/experiments/arcadedb-http-smoke.mjs`
- `node scripts/experiments/arcadedb-http-smoke.mjs --help`

## Decisions & Deviations

- 关键决策：把现有 docs/runtime drift 视为 baseline，而不是“顺手以后再修”的无关问题
- 偏差：未执行 live smoke；这是刻意保留给真实服务环境的后续验证，不伪造连通性结论
