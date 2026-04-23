---
phase: 27-implement-repo-local-rule-control-system-and-add-hooks-ci-qa
verified: 2026-04-18T20:19:04Z
status: passed
score: 6/6 must-haves verified
---

# Phase 27: Implement repo-local rule control system and add hooks CI QA coverage for the seven workflow gaps Verification Report

**Phase Goal:** 以 `/home/stark/.claude/plans/harness-claude-openai-github-openharness-parallel-alpaca.md` 作为主计划，结合 `/home/stark/.gstack/projects/codemap/stark-main-eng-review-test-plan-20260418-200710.md` 作为实施 / QA 清单，把 repo-local rule control system 的落地与验证纳入下一阶段规划。
**Verified:** 2026-04-18T20:19:04Z
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | capability baseline 必须显式区分 required / optional / strategy 状态，并记录 `duration_ms` | ✓ VERIFIED | `scripts/capability-report.py` 输出 `PASS` / `REQUIRED_FAIL` / `OPTIONAL_DISABLED` / `STRATEGY_PASS`，`/tmp/codemap-capability-report.json` 含 `duration_ms` |
| 2 | repo-local validator 必须固定 `report-only` 与 gate exit-code contract | ✓ VERIFIED | `scripts/validate-rules.py` 固定 `0/1/2/3/4` 语义；`scripts/tests/test_validate_rules.py` 8 个用例通过 |
| 3 | 规则入口 contract 必须默认启用 path-based routing，并把 hard gate 保持在 `report-only` | ✓ VERIFIED | `.claude/rule-system.config.json` 含 `enabled: true`、`route_by_edit_path: true`、`hard_gate.mode: "report-only"`；`CLAUDE.md` 明确 post-edit 验证命令 |
| 4 | pre-commit / commit-msg / CI 必须接入统一 validator contract，且 `--no-verify` 不能绕过 CI backstop | ✓ VERIFIED | `.githooks/pre-commit` 与 `.github/workflows/ci-gateway.yml` 都调用 `scripts/validate-rules.py`；QA 覆盖 `no-verify-backstop` 并通过 |
| 5 | soft gate 与 subagent rule injection 必须只注入 scoped rules，disabled 时保持 no-op | ✓ VERIFIED | `scripts/rule-context.mjs` 只返回匹配规则；`.claude/hooks/rule-route-advisory.js` disabled 时 0 字节输出；Claude / Codex execute/quick workflow 都注入 `<rule_context>` |
| 6 | 规则系统不能只停留在文档声明，必须有可执行 QA 与回归测试覆盖关键场景 | ✓ VERIFIED | `scripts/qa-rule-control.sh --scenario all` 通过 7 个场景；`scripts/tests/test_rule_control_workflow.py` 3 个回归用例通过；`npm run docs:check`、`npm test`、schema drift 检查均通过 |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/capability-report.py` | capability baseline reporter | ✓ EXISTS + SUBSTANTIVE | 输出结构化 JSON，区分 required / optional / strategy，并记录命令耗时 |
| `scripts/validate-rules.py` | repo-local validator CLI | ✓ EXISTS + SUBSTANTIVE | 支持 `code` / `arch` / `all` 与 `--report-only`，gate exit-code 固定 |
| `.claude/rule-system.config.json` | repo-local rule default config | ✓ EXISTS + SUBSTANTIVE | 默认启用 route-by-edit-path 与 advisory soft gate、report-only hard gate |
| `.githooks/pre-commit` | local hook integration | ✓ EXISTS + SUBSTANTIVE | 读取 `hard_gate.mode` 并调用 validator |
| `.github/workflows/ci-gateway.yml` | CI backstop | ✓ EXISTS + SUBSTANTIVE | 固定存在 `Rule validation backstop`，只在 exit `1/4` 时 fail |
| `scripts/rule-context.mjs` | scoped rule helper | ✓ EXISTS + SUBSTANTIVE | 支持 `json` / `prompt` 输出，显式 fallback 为 `No scoped rules inferred` |
| `.claude/hooks/rule-route-advisory.js` | advisory-only hook | ✓ EXISTS + SUBSTANTIVE | 通过 `additionalContext` 输出 advisory，disabled 配置时 no-op |
| `scripts/qa-rule-control.sh` | executable QA matrix | ✓ EXISTS + SUBSTANTIVE | 覆盖 capability / P0 / P1 / unavailable / disabled / scoped context / no-verify backstop |
| `scripts/tests/test_rule_control_workflow.py` | regression contract tests | ✓ EXISTS + SUBSTANTIVE | 锁定 workflow `<rule_context>` 注入与 CI backstop 文本契约 |

**Artifacts:** 9/9 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.claude/rule-system.config.json` | `.githooks/pre-commit` | `hard_gate.mode` 读取 | ✓ WIRED | pre-commit 根据 repo-local config 决定 report-only / enforce 行为 |
| `scripts/validate-rules.py` | `.githooks/pre-commit` | `python3 scripts/validate-rules.py code` | ✓ WIRED | 本地 hook 直接复用统一 validator contract |
| `scripts/validate-rules.py` | `.github/workflows/ci-gateway.yml` | `Rule validation backstop` step | ✓ WIRED | CI 对 `1/4` fail、`2/3` warn-only，保持 backstop 真实存在 |
| `scripts/rule-context.mjs` | `.codex/get-shit-done/workflows/execute-phase.md` / `.claude/get-shit-done/workflows/execute-phase.md` | `RULE_CONTEXT` 派生 | ✓ WIRED | spawn executor 前显式生成并注入 `<rule_context>` |
| `.claude/settings.json` | `.claude/hooks/rule-route-advisory.js` | hook registration | ✓ WIRED | Write/Edit 触发 advisory-only scoped rule context |
| `scripts/qa-rule-control.sh` | `docs/rules/validation.md` | copy-paste QA command | ✓ WIRED | 文档列出与脚本一致的一键 QA 命令 |

**Wiring:** 6/6 connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| `P27-NOW-CAPABILITY-REPORT` | ✓ SATISFIED | - |
| `P27-NOW-VALIDATE-RULES` | ✓ SATISFIED | - |
| `P27-NOW-HOOKS-CI-QA` | ✓ SATISFIED | - |
| `P27-NOW-SOFT-GATE-DEFAULTS` | ✓ SATISFIED | - |
| `P27-NOW-SUBAGENT-RULE-INJECTION` | ✓ SATISFIED | - |
| `P27-NOW-WORKFLOW-VALIDATION` | ✓ SATISFIED | - |
| `P27-NOW-NO-VERIFY-BACKSTOP` | ✓ SATISFIED | - |

**Coverage:** 7/7 requirements satisfied

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/rule-context.mjs` | - | 路由覆盖仍偏窄，未覆盖更多根级路径 | ⚠️ Warning | 新路径可能回退到 `No scoped rules inferred` |
| `scripts/capability-report.py` | - | hooks 可用性检查可能对无效 `core.hooksPath` 给出假阳性 | ⚠️ Warning | capability baseline 可能略显乐观 |
| `.githooks/pre-commit` | - | docs guardrail 触发范围与文档表述未完全对齐 | ⚠️ Warning | 文档与真实触发条件仍有细缝 |
| `docs/rules/engineering-with-codex-openai.md` | - | worktree / `--no-verify` 说明仍需进一步精确化 | ⚠️ Warning | 人类读者可能误解某些 hook 细节 |

**Anti-patterns:** 4 found (0 blockers, 4 warnings)

## Human Verification Required

None — Phase 27 的 must-haves 已由代码事实、自动化回归、QA 脚本、docs guardrail、全量测试和 schema drift 检查覆盖；剩余问题仅为 advisory warnings。

## Gaps Summary

**No gaps found.** Phase goal achieved. Ready to proceed.

## Verification Metadata

**Verification approach:** Goal-backward（从 ROADMAP phase goal 与 27-01 → 27-06 PLAN must-haves 反推）  
**Must-haves source:** `ROADMAP.md` 的 Phase 27 goal + `27-01-PLAN.md` → `27-06-PLAN.md` frontmatter  
**Automated checks:** 9 passed, 0 failed  
**Human checks required:** 0  
**Total verification time:** ~2 min

### Automated Checks Run

1. `python3 scripts/capability-report.py --output /tmp/codemap-capability-report.json`
2. `python3 scripts/validate-rules.py code --report-only`
3. `python3 -m unittest scripts/tests/test_capability_report.py`
4. `python3 -m unittest scripts/tests/test_validate_rules.py`
5. `bash scripts/qa-rule-control.sh --scenario all`
6. `python3 -m unittest scripts/tests/test_rule_control_workflow.py`
7. `npm run docs:check`
8. `npm test`
9. `node /data/codemap/.codex/get-shit-done/bin/gsd-tools.cjs verify schema-drift 27`

---
*Verified: 2026-04-18T20:19:04Z*
*Verifier: Codex inline verification*
