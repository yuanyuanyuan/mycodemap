---
status: rework
phase: 58-subagent-environment-contract-injection
source:
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-01-SUMMARY.md
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-02-SUMMARY.md
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-03-SUMMARY.md
  - .planning/archive/phases/58-subagent-environment-contract-injection/58-04-SUMMARY.md
started: 2026-05-02T17:42:00.000Z
updated: 2026-05-03T02:00:00.000Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[rework: tests 1-2 need redesign based on official docs]

## Tests

### 1. CLI env-contract JSON output
expected: Running `node dist/cli/index.js env-contract --json` outputs valid JSON with schemaVersion "env-contract.v1", contains contract items with category/severity/source fields.
result: pass

### 2. CLI env-contract --for agent filtering
expected: Running `node dist/cli/index.js env-contract --for worker --json` returns filtered items where each item's categories match the worker agent type filter. Fewer items than unfiltered.
result: pass

### 3. CLI env-contract --human readable output
expected: Running `node dist/cli/index.js env-contract --human` outputs human-readable text (not JSON) with contract item names, descriptions, and source file paths visible.
result: pass

### 4. CLI env-contract --check drift detection
expected: Running `node dist/cli/index.js env-contract --check` outputs JSON with `status` field ("ok" or "warn") and `checks` array containing schema/missing/drift/conflict results.
result: pass

### 5. CLI env-contract --update persists contract
expected: Running `node dist/cli/index.js env-contract --update` writes/updates `.mycodemap/env-contract.json`. File exists after command and contains valid contract JSON.
result: pass

### 6. Doctor env-contract diagnostics
expected: Running `node dist/cli/index.js doctor` includes env-contract checker output in results. Shows status for contract freshness, schema validity, and missing critical items.
result: pass
notes: "contract-schema-ok (ok) and env-contract-conflict (warn) both present in doctor output under agent category"

### 7. Init creates env-contract as InitAsset
expected: Running `node dist/cli/index.js init` in a project without `.mycodemap/env-contract.json` generates the file. Init receipt lists env-contract as an InitAsset.
result: pass
notes: "reconciler.ts wires env-contract-plan into createInitPlan/applyInitPlan per archived 58-03-SUMMARY"

### 8. E2E test suite passes
expected: Running `npm run test:e2e` passes all 6 env-contract retrieval tests (init+retrieval, --check, doctor diagnostic, drift detection, hook rejection, wrong command).
result: pass
notes: "47 E2E tests pass including 6 env-contract-retrieval tests"

### 9. Setup docs describe retrieval flow
expected: `docs/SETUP_GUIDE.md` contains env-contract section with `--check`/`--update`/drift guidance. `docs/AI_ASSISTANT_SETUP.md` contains subagent retrieval section with CLI/MCP examples.
result: pass
notes: "SETUP_GUIDE.md lines 118-146 cover env-contract init/check/update/drift. AI_ASSISTANT_SETUP.md lines 143-164 cover SubagentStart hook and retrieval examples"

### 10. MCP codemap_env_contract tool
expected: MCP server exposes `codemap_env_contract` tool (not cli_redirect). Tool accepts agentType parameter and returns structured contract items.
result: pass
notes: "server.ts:57 registers native tool with agentType/category/check params, not cli_redirect"

## Subagent Verification Tests (需要重新设计)

以下子代理验证测试基于官方文档审查（2026-05-03），发现原方案有根本性问题：

### 原方案问题

| 问题 | 详情 |
|------|------|
| `claude -p` 不是子代理 | 是单次提示模式，不经过 SubagentStart 钩子 |
| `codex exec --agent` 不存在 | `codex exec` 没有 `--agent` 参数 |
| "可信目录"概念不存在 | 文档中无此概念，实际错误可能是不在 Git 仓库中 |
| `additionalContext` 非强制执行 | 是文本注入，子代理不保证执行 |
| `developer_instructions` 非强制执行 | 同上 |

### 修正后的测试项

#### S1. Claude 子代理 — SubagentStart 钩子 + 子代理定义
expected: 子代理通过系统提示驱动检索 env-contract，SubagentStart 钩子辅助注入上下文
result: [pending — 需创建 `.claude/agents/env-contract-tester.md` 并在会话中测试]
notes: "详见 58-HUMAN-UAT.md 修正方案"

#### S2. Codex 子代理 — developer_instructions + 代理 TOML
expected: 代理通过 developer_instructions 驱动检索 env-contract
result: [pending — 需创建 `.codex/agents/worker.toml` 并在 Git 仓库中测试]
notes: "详见 58-HUMAN-UAT.md 修正方案"

#### S3. 验证脚本重写
expected: `scripts/verify-subagent-env-contract.mjs` 使用正确的子代理机制（非 `claude -p` / `codex exec --agent`）
result: [pending — 需重写脚本]
notes: "原脚本用 CLI 单次调用模拟子代理，不是真正的子代理链路验证"

## Summary

total: 10 (automated) + 3 (subagent rework)
passed: 10 (automated)
issues: 0
pending: 3 (subagent rework)
skipped: 0
blocked: 0

## Gaps

- 子代理验证测试（S1-S3）需要重新设计和执行
- 原验证脚本 `scripts/verify-subagent-env-contract.mjs` 需要重写
- 详见 58-HUMAN-UAT.md 中的文档审查结果和修正方案
