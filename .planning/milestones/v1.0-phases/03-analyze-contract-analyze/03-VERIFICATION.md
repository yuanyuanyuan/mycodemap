---
phase: 03-analyze-contract-analyze
verified: 2026-03-24T06:54:46Z
status: passed
score: 5/5 must-haves verified
---

# Phase 3: analyze-contract-analyze Verification Report

**Phase Goal:** 将 `analyze` 收敛为 `find` / `read` / `link` / `show` 四意图，并把 machine-readable 输出契约、legacy 兼容与文档护栏一起固定下来。  
**Verified:** 2026-03-24T06:54:46Z  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | public analyze intent 已固定为 `find` / `read` / `link` / `show`，并有明确的 legacy 兼容元数据与 warning 结构 | ✓ VERIFIED | `src/orchestrator/types.ts:100`, `src/orchestrator/types.ts:119`, `src/orchestrator/types.ts:147`, `src/orchestrator/types.ts:172`, `src/orchestrator/types.ts:199`, `src/orchestrator/types.ts:218` |
| 2 | `IntentRouter` 会把 `search/impact/complexity/dependency/reference/overview/documentation` 统一 normalize 到四意图，并为兼容期附带 deprecation metadata | ✓ VERIFIED | `src/orchestrator/intent-router.ts:24`, `src/orchestrator/intent-router.ts:37`, `src/orchestrator/intent-router.ts:87`, `src/orchestrator/intent-router.ts:103` |
| 3 | `AnalyzeCommand` 已改为显式要求 `intent`，`find` 支持 `keywords-only`，invalid intent 统一返回 `E0001_INVALID_INTENT` | ✓ VERIFIED | `src/cli/commands/analyze.ts:98`, `src/cli/commands/analyze.ts:109`, `src/cli/commands/analyze.ts:121`, `src/cli/commands/analyze.ts:131`, `src/cli/commands/analyze.ts:139`, `src/cli/commands/__tests__/analyze-command.test.ts:237`, `src/cli/commands/__tests__/analyze-command.test.ts:250`, `src/cli/commands/__tests__/analyze-command.test.ts:387` |
| 4 | `read` / `link` / `show` 已拥有 machine-readable `analysis` 聚合结构，CLI 回归测试覆盖 public 四意图与 legacy warning | ✓ VERIFIED | `src/orchestrator/types.ts:172`, `src/orchestrator/types.ts:199`, `src/orchestrator/types.ts:218`, `src/cli/commands/__tests__/analyze-command.test.ts:266`, `src/cli/commands/__tests__/analyze-command.test.ts:312`, `src/cli/commands/__tests__/analyze-command.test.ts:363`, `src/cli/commands/__tests__/analyze-command.test.ts:404` |
| 5 | docs guardrail 与 AI docs guardrail 会在 legacy analyze 示例或旧 schema 被写回时直接失败 | ✓ VERIFIED | `scripts/validate-docs.js:83`, `scripts/validate-docs.js:119`, `scripts/validate-docs.js:180`, `src/cli/__tests__/validate-docs-script.test.ts:156`, `src/cli/__tests__/validate-docs-script.test.ts:175`, `src/cli/__tests__/validate-ai-docs-script.test.ts:62`, `src/cli/__tests__/validate-ai-docs-script.test.ts:81`, `src/cli/__tests__/validate-ai-docs-script.test.ts:100` |

**Score:** 5/5 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `ANL-01`: `analyze -i find` 提供符号 / 文件发现能力 | ✓ SATISFIED | `src/orchestrator/types.ts:100`, `src/cli/commands/analyze.ts:121`, `src/cli/commands/__tests__/analyze-command.test.ts:250` |
| `ANL-02`: `analyze -i read` 返回统一的复杂度 / 影响分析结构 | ✓ SATISFIED | `src/orchestrator/types.ts:172`, `src/cli/commands/__tests__/analyze-command.test.ts:266` |
| `ANL-03`: `analyze -i link` 返回统一的引用 / 依赖关联结构 | ✓ SATISFIED | `src/orchestrator/types.ts:199`, `src/cli/commands/__tests__/analyze-command.test.ts:312` |
| `ANL-04`: `analyze -i show` 覆盖展示 / 导出类分析结果 | ✓ SATISFIED | `src/orchestrator/types.ts:218`, `src/cli/commands/__tests__/analyze-command.test.ts:363` |
| `ANL-05`: 旧 analyze intent 在两个 minor 版本内输出弃用警告，之后统一报 `E0001_INVALID_INTENT` | ✓ SATISFIED | `src/orchestrator/types.ts:147`, `src/orchestrator/intent-router.ts:103`, `src/cli/commands/__tests__/analyze-command.test.ts:387`, `src/cli/commands/__tests__/analyze-command.test.ts:404` |

## Automated Checks

- `npm run build`
- `pnpm exec vitest run src/orchestrator/__tests__/intent-router.test.ts src/orchestrator/__tests__/types.test.ts src/orchestrator/__tests__/confidence.test.ts src/cli/commands/__tests__/analyze-command.test.ts src/cli/__tests__/validate-docs-script.test.ts src/cli/__tests__/validate-ai-docs-script.test.ts`
- `node dist/cli/index.js analyze --help`
- `node dist/cli/index.js analyze -i invalid -t src/cli/index.ts`
- `node dist/cli/index.js analyze -i read -t src/cli/index.ts --json`
- `node dist/cli/index.js analyze -i link -t src/cli/index.ts --json`
- `node dist/cli/index.js analyze -i read -t src/cli/index.ts --output-mode human`
- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`

## Failure Rehearsal

1. **README / AI docs 重新写回 legacy analyze 示例**
   - Rehearsal: `src/cli/__tests__/validate-docs-script.test.ts` 会篡改 `AI_GUIDE.md` 模板块与 `OUTPUT.md` 的 analyze schema。
   - Expected failure: `scripts/validate-docs.js` 报 `documentation guardrails failed`。
   - Evidence: `src/cli/__tests__/validate-docs-script.test.ts:156`, `src/cli/__tests__/validate-docs-script.test.ts:175`, `scripts/validate-docs.js:119`, `scripts/validate-docs.js:180`

2. **AI 文档重新写回 legacy intent**
   - Rehearsal: `src/cli/__tests__/validate-ai-docs-script.test.ts` 会把 `QUICKSTART.md` / `llms.txt` / `INTEGRATION.md` 改回 `impact` / `complexity` / `search`。
   - Expected failure: `scripts/validate-ai-docs.js` 报 `AI documentation guardrails failed`。
   - Evidence: `src/cli/__tests__/validate-ai-docs-script.test.ts:62`, `src/cli/__tests__/validate-ai-docs-script.test.ts:81`, `src/cli/__tests__/validate-ai-docs-script.test.ts:100`

## Human Verification Required

None — CLI human mode 已通过 `node dist/cli/index.js analyze -i read -t src/cli/index.ts --output-mode human` spot-check，可读输出与 JSON 契约分离。

## Gaps Summary

**No product gaps found.** Phase 3 goal achieved and ready to transition to Phase 4.

---
*Verified: 2026-03-24T06:54:46Z*
