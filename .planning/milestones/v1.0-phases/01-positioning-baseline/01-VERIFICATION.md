---
phase: 01-positioning-baseline
verified: 2026-03-24T02:13:12Z
status: passed
score: 5/5 must-haves verified
---

# Phase 1: positioning-baseline Verification Report

**Phase Goal:** 把产品是谁、输出面向谁、架构层与公共命令之间的边界写成统一基线。  
**Verified:** 2026-03-24T02:13:12Z  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `README.md`、`AI_GUIDE.md` 与 `docs/ai-guide/README.md` 统一把 CodeMap 描述为 AI-first 代码地图工具，并明确 AI/Agent 为主要消费者 | ✓ VERIFIED | `README.md:3`, `README.md:23`, `README.md:24`, `AI_GUIDE.md:5`, `docs/ai-guide/README.md:5` |
| 2 | 入口文档不再把 HTTP API、发布流程或实现型 workflow 当作首屏核心价值 | ✓ VERIFIED | `README.md:10`, `README.md:28`, `README.md:114`, `docs/ai-guide/README.md:6`, `docs/ai-guide/README.md:43` |
| 3 | `ARCHITECTURE.md` 明确区分 MVP3 `Server Layer` 与公共 `server` CLI 命令，不再把两者混成同一件事 | ✓ VERIFIED | `ARCHITECTURE.md:20`, `ARCHITECTURE.md:56`, `ARCHITECTURE.md:57`, `src/cli/index.ts:205`, `src/cli/index.ts:223` |
| 4 | 详细 AI 文档用统一措辞说明“机器可读优先 + 人类可读显式入口”的目标契约，并清楚标明当前 CLI 的过渡现实 | ✓ VERIFIED | `AI_GUIDE.md:6`, `docs/ai-guide/QUICKSTART.md:25`, `docs/ai-guide/COMMANDS.md:5`, `docs/ai-guide/COMMANDS.md:135`, `docs/ai-guide/OUTPUT.md:7`, `docs/ai-guide/OUTPUT.md:114` |
| 5 | `scripts/validate-docs.js` 与验证规则能守住新的契约叙事，而不是继续只检查旧示例 | ✓ VERIFIED | `scripts/validate-docs.js:110`, `scripts/validate-docs.js:152`, `scripts/validate-docs.js:200`, `docs/rules/engineering-with-codex-openai.md:51`, `docs/rules/engineering-with-codex-openai.md:52`, `docs/rules/validation.md:6`, `docs/rules/validation.md:30` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `README.md` | 入口定位与边界总表 | ✓ EXISTS + SUBSTANTIVE | `README.md:3`, `README.md:19`, `README.md:28`, `README.md:114` |
| `AI_GUIDE.md` | AI 主索引与定位速查 | ✓ EXISTS + SUBSTANTIVE | `AI_GUIDE.md:3`, `AI_GUIDE.md:31`, `AI_GUIDE.md:44`, `AI_GUIDE.md:98` |
| `docs/ai-guide/README.md` | AI 文档入口说明 | ✓ EXISTS + SUBSTANTIVE | `docs/ai-guide/README.md:3`, `docs/ai-guide/README.md:24`, `docs/ai-guide/README.md:43` |
| `ARCHITECTURE.md` | 架构定位与命名边界 | ✓ EXISTS + SUBSTANTIVE | `ARCHITECTURE.md:8`, `ARCHITECTURE.md:20`, `ARCHITECTURE.md:56` |
| `docs/ai-guide/QUICKSTART.md` | 决策树与输出契约速查 | ✓ EXISTS + SUBSTANTIVE | `docs/ai-guide/QUICKSTART.md:23`, `docs/ai-guide/QUICKSTART.md:57`, `docs/ai-guide/QUICKSTART.md:118` |
| `docs/ai-guide/COMMANDS.md` | 核心命令 + 过渡能力说明 | ✓ EXISTS + SUBSTANTIVE | `docs/ai-guide/COMMANDS.md:5`, `docs/ai-guide/COMMANDS.md:131`, `docs/ai-guide/COMMANDS.md:241` |
| `docs/ai-guide/OUTPUT.md` | 目标态 + 当前 CLI 现实契约 | ✓ EXISTS + SUBSTANTIVE | `docs/ai-guide/OUTPUT.md:7`, `docs/ai-guide/OUTPUT.md:17`, `docs/ai-guide/OUTPUT.md:112` |
| `docs/ai-guide/PATTERNS.md` | 核心分析模式与过渡 workflow 边界 | ✓ EXISTS + SUBSTANTIVE | `docs/ai-guide/PATTERNS.md:5`, `docs/ai-guide/PATTERNS.md:13`, `docs/ai-guide/PATTERNS.md:185` |
| `scripts/validate-docs.js` | Phase 1 基线 guardrail | ✓ EXISTS + SUBSTANTIVE | `scripts/validate-docs.js:110`, `scripts/validate-docs.js:152`, `scripts/validate-docs.js:200` |
| `docs/rules/engineering-with-codex-openai.md` | 修改入口文档时的验证规则 | ✓ EXISTS + SUBSTANTIVE | `docs/rules/engineering-with-codex-openai.md:17`, `docs/rules/engineering-with-codex-openai.md:45`, `docs/rules/engineering-with-codex-openai.md:51` |
| `docs/rules/validation.md` | 验证顺序与典型失败模式 | ✓ EXISTS + SUBSTANTIVE | `docs/rules/validation.md:5`, `docs/rules/validation.md:8`, `docs/rules/validation.md:30` |

**Artifacts:** 11/11 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `README.md` | `AI_GUIDE.md` | AI 文档导航入口 | ✓ WIRED | `README.md:98`, `README.md:99` 与 `AI_GUIDE.md:3`, `AI_GUIDE.md:5` 一致使用 AI-first 主入口语义 |
| `AI_GUIDE.md` | `docs/ai-guide/README.md` | 同词汇定位与读者模型 | ✓ WIRED | `AI_GUIDE.md:5`, `AI_GUIDE.md:35` 与 `docs/ai-guide/README.md:5`, `docs/ai-guide/README.md:28` 共享“AI-first/AI/Agent 主要消费者”表述 |
| `docs/ai-guide/COMMANDS.md` | `docs/ai-guide/OUTPUT.md` | “目标态 + 当前过渡态”契约 | ✓ WIRED | `docs/ai-guide/COMMANDS.md:5`, `docs/ai-guide/COMMANDS.md:135`, `docs/ai-guide/OUTPUT.md:7`, `docs/ai-guide/OUTPUT.md:9` |
| `ARCHITECTURE.md` | `src/cli/index.ts` | Server Layer 与公共命令的边界反证 | ✓ WIRED | `ARCHITECTURE.md:20`, `ARCHITECTURE.md:57` 明确分离；`src/cli/index.ts:205`, `src/cli/index.ts:223` 证明公共 `server` / `ship` 命令仍真实存在 |
| `scripts/validate-docs.js` | 入口/AI/规则文档 | 基线片段 guardrail | ✓ WIRED | `scripts/validate-docs.js:118`, `scripts/validate-docs.js:130`, `scripts/validate-docs.js:153`, `scripts/validate-docs.js:218`, `scripts/validate-docs.js:232` 对应检查 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/README.md`、`docs/ai-guide/OUTPUT.md` 与规则文档 |

**Wiring:** 5/5 connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| `POS-01`: `README.md`、`AI_GUIDE.md` 与 AI 文档入口将 CodeMap 描述为 AI-first 代码地图工具 | ✓ SATISFIED | - |
| `POS-02`: 保留命令默认输出机器可读结果，并提供明确的人类可读模式说明 | ✓ SATISFIED | - |
| `POS-03`: 文档明确区分“Server Layer 架构概念”和公共 `server` CLI 命令 | ✓ SATISFIED | - |

**Coverage:** 3/3 requirements satisfied

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `AI_GUIDE.md` | 49 | `XXX` 仅用于查询示例占位符 | ℹ️ Info | 示例占位符，不是未完成实现 |
| `docs/ai-guide/QUICKSTART.md` | 70 | `XXX` 仅用于场景示例占位符 | ℹ️ Info | 示例占位符，不是文档漂移 |
| `docs/ai-guide/PATTERNS.md` | 152 | `[FIX] module: 修复 XXX 问题` 为提交格式示例 | ℹ️ Info | 示例说明，不构成 phase blocker |

**Anti-patterns:** 3 found (0 blockers, 0 warnings)

## Human Verification Required

None — all verifiable items in this phase are documentation / CLI-surface boundary checks and were verified programmatically against repository facts.

## Failure Rehearsal

1. **工具误报 frontmatter 缺失**
   - Observation: `node /data/codemap/.codex/get-shit-done/bin/gsd-tools.cjs verify artifacts .planning/milestones/v1.0-phases/01-positioning-baseline/01-01-PLAN.md` 与 `verify key-links` 对两个 PLAN 文件都返回 `No must_haves... found in frontmatter`
   - Counter-evidence: 同一文件用 `frontmatter get --field must_haves` 可以正确读出 `truths/artifacts/key_links`
   - Impact: 若后续 phase 依赖该 helper，可能把已完成的 must-haves 误判为缺失
   - Mitigation in this report: 回退到逐文件 + 命令输出的人工验证，不将该工具误报升级为产品 gap

## Gaps Summary

**No product gaps found.** Phase 1 goal achieved and ready to transition.

## Verification Metadata

**Verification approach:** Goal-backward + repository evidence  
**Must-haves source:** `01-01-PLAN.md` / `01-02-PLAN.md` frontmatter  
**Automated checks:** `npm run docs:check`, `node dist/cli/index.js ci check-docs-sync`, `node dist/cli/index.js impact -f src/cli/index.ts -j`  
**Helper fallback:** `gsd-tools verify artifacts` / `verify key-links` produced false negatives on Phase 1 plans  
**Human checks required:** 0  
**Verifier:** the agent

---
*Verified: 2026-03-24T02:13:12Z*
