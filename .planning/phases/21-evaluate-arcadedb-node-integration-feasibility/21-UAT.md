---
status: complete
phase: 21-evaluate-arcadedb-node-integration-feasibility
source:
  - 21-01-SUMMARY.md
  - 21-02-SUMMARY.md
started: 2026-03-28T09:04:46Z
updated: 2026-03-28T09:04:46Z
---

## Current Test

[testing complete]

## Tests

### 1. Official Support Matrix Evidence
expected: 运行 `rg -n "Embedded \\| JVM only|HTTP/JSON \\| Client/server|Bolt \\| Client/server|No Node embedded SDK assumption" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVIDENCE.md` 时，证据文件必须明确写出 `Embedded=JVM only`、`HTTP/JSON=preferred Node experiment path`、`Bolt=secondary validation`，并显式否定 Node embedded 假设。
result: pass

### 2. Blast Radius Baseline
expected: 运行 `rg -n "auto -> kuzudb|auto -> filesystem|uri|username|password|tls|serverLifecycle|Treat server-backed ArcadeDB as a product-surface change" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-BLAST-RADIUS.md` 时，文档必须同时覆盖远程 backend contract 缺口与现有 `auto` drift baseline，而不是只列新增字段。
result: pass

### 3. HTTP Smoke Harness Syntax Check
expected: 运行 `node --check scripts/experiments/arcadedb-http-smoke.mjs` 时，脚本语法校验通过，证明隔离 smoke harness 至少可被离线复核。
result: pass

### 4. Offline Help Contract
expected: 运行 `node scripts/experiments/arcadedb-http-smoke.mjs --help` 时，帮助文本必须明确 `ARCADEDB_HTTP_URL`、`ARCADEDB_DATABASE`、`ARCADEDB_USERNAME`、`ARCADEDB_PASSWORD`、请求 endpoint、Basic auth 与“无服务时仅做离线校验”的边界。
result: pass

### 5. Missing Environment Failure Rehearsal
expected: 在未设置任何 `ARCADEDB_*` 环境变量时运行 `node scripts/experiments/arcadedb-http-smoke.mjs`，命令必须非零退出，并明确报出缺失的必填环境变量；不能 silent-pass，也不能伪造连通性成功。
result: pass

### 6. Validation Design Coverage
expected: 运行 `rg -n "## Preconditions|## Smoke Checks|## Benchmark Strategy|## Stop Conditions|handshake latency|query latency|setup complexity" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md` 时，验证设计必须覆盖前置条件、smoke 检查、benchmark 维度与停止条件。
result: pass

### 7. Decision Report Integrity
expected: 运行 `rg -n "Decision:|NO-GO for direct replacement|CONDITIONAL for isolated server-backed follow-up|## Decision Matrix|## Risks" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVALUATION-REPORT.md` 时，报告必须把 `NO-GO` 固定为 direct replacement 的主建议，并保留条件式 follow-up 与风险段落。
result: pass

### 8. Follow-Up Routing Contract
expected: 运行 `rg -n "## If Accepted|## If Rejected|isolated server-backed prototype|storage.type = arcadedb" .planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-NEXT-STEPS.md` 时，后续路线必须同时覆盖 accepted/rejected 两条路径，并明确禁止直接把 `storage.type = arcadedb` 推进到 shipped public surface。
result: pass

### 9. Storage Fallback Regression Baseline
expected: 运行 `pnpm exec vitest run src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` 时，既有 storage fallback baseline 必须保持绿色，证明本 phase 的 evidence/script 产物没有引入主路径回归。
result: pass

### 10. Docs Guardrail Regression
expected: 运行 `npm run docs:check:human` 时，文档护栏通过，证明本轮 follow-up 的 planning/docs 更新没有打破仓库的人类可读文档约束。
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- 仍未对真实 ArcadeDB server 执行 live smoke，因此没有 handshake/query latency 实测值；这不是当前 feasibility phase 的 blocker，但意味着后续如果要推进 server-backed prototype，必须先补真实环境验证。
