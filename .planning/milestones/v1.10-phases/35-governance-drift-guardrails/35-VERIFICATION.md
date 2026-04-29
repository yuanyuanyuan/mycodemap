---
phase: 35-governance-drift-guardrails
verified: 2026-04-23T11:49:06+08:00
status: passed
score: 4/4 must-haves verified
---

# Phase 35: Governance drift guardrails Verification Report

**Phase Goal:** 为入口文档与路由文档建立可执行的治理 drift 检测基线，把 duplicate policy、ghost command 与 competing authority 问题收敛到现有 docs guardrail。  
**Verified:** 2026-04-23T11:49:06+08:00  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | 现有 docs guardrail 现在能显式发现 entry-doc duplicate policy drift | ✓ VERIFIED | `scripts/validate-docs.js` |
| 2 | 现有 docs guardrail 现在能显式发现 ghost command 与 missing route target drift | ✓ VERIFIED | `scripts/validate-docs.js` |
| 3 | drift 输出已按 `duplicate-policy` / `ghost-command` / `ghost-route` / `authority-routing` 分类 | ✓ VERIFIED | `scripts/validate-docs.js` |
| 4 | 新检测仍走 `docs:check` / `ci check-docs-sync`，没有引入新的治理入口 | ✓ VERIFIED | `package.json`, `scripts/validate-docs.js`, command results below |

**Score:** 4/4 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `GOV-01` | ✓ SATISFIED | `validateEntryDocGovernance` 现在会抓 duplicate policy / competing authority drift |
| `GOV-02` | ✓ SATISFIED | 同一 guardrail 会抓 ghost commands / ghost routes |
| `GOV-03` | ✓ SATISFIED | 所有检查继续经由 `docs:check` / `ci check-docs-sync` 运行 |

## Automated Checks

- `rtk proxy rg -n "\\[entry-doc duplicate-policy\\]|\\[entry-doc ghost-command\\]|\\[entry-doc ghost-route\\]|\\[entry-doc authority-routing\\]" scripts/validate-docs.js`
  - Result: matched all four failure categories
- `rtk npm run docs:check`
  - Result: Documentation guardrails passed; AI documentation guardrails passed
- `rtk node dist/cli/index.js ci check-docs-sync`
  - Result: Documentation guardrails passed; Analyze documentation blocks are in sync
- `rtk proxy git diff --check`
  - Result: pass

## Failure Rehearsal

1. **如果 `CLAUDE.md` 重新长出 `npm run docs:check` / `node dist/cli/index.js ...` 之类命令面**
   - Expected failure: 入口文档重新成为执行手册，违背 router-only 边界
   - Detection: `[entry-doc ghost-command]`

2. **如果 `.claude/CLAUDE.md` 再复制 `AGENTS.md` 的任务分级 / 证据协议 section**
   - Expected failure: Claude adapter 重新长成第二套规则面
   - Detection: `[entry-doc duplicate-policy]`

3. **如果 `docs/rules/README.md` 或 root `CLAUDE.md` 指向的某份 live doc 被删除/重命名**
   - Expected failure: routing surface 变成 ghost route
   - Detection: `[entry-doc ghost-route]`

4. **如果 router / adapter 不再把读者带回 `AGENTS.md`、`CLAUDE.md` 与 rules index**
   - Expected failure: authority chain 中断
   - Detection: `[entry-doc authority-routing]`

## Human Verification Required

None — 本 phase 是 guardrail backstop 收口，可通过静态脚本与 docs validation 验收。
