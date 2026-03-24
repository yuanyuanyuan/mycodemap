---
phase: 02-cli-surface-cleanup-cli
verified: 2026-03-24T02:42:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 2: cli-surface-cleanup-cli Verification Report

**Phase Goal:** 从公共 CLI 中移除与 AI-first 代码地图定位冲突的命令，并把新的命令面同步到文档与 guardrail。  
**Verified:** 2026-03-24T02:42:00Z  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `mycodemap --help` / `codemap --help` 不再暴露 `server`、`watch`、`report`、`logs` | ✓ VERIFIED | `src/cli/index.ts:84`, `src/cli/index.ts:141`, `src/cli/index.ts:159`, `src/cli/index.ts:169`, `src/cli/__tests__/index-help.test.ts:49`, `src/cli/__tests__/index-help.test.ts:62` |
| 2 | 直接调用 removed commands 会得到显式迁移提示，而不是 generic unknown command | ✓ VERIFIED | `src/cli/index.ts:27`, `src/cli/index.ts:29`, `src/cli/removed-commands.ts:12`, `src/cli/removed-commands.ts:19`, `src/cli/__tests__/removed-commands.test.ts:49`, `src/cli/__tests__/removed-commands.test.ts:71` |
| 3 | README、AI 文档与 setup 文档都不再把四个 removed commands 写成当前公开命令 | ✓ VERIFIED | `README.md:28`, `README.md:114`, `README.md:237`, `AI_GUIDE.md:98`, `docs/ai-guide/README.md:7`, `docs/ai-guide/COMMANDS.md:295`, `docs/SETUP_GUIDE.md:246`, `docs/ai-guide/QUICKSTART.md:29`, `docs/ai-guide/INTEGRATION.md:511` |
| 4 | docs guardrail 会在 removed commands 被重新写回公开文档时失败 | ✓ VERIFIED | `scripts/validate-docs.js:181`, `scripts/validate-docs.js:217`, `scripts/validate-docs.js:234`, `src/cli/__tests__/validate-docs-script.test.ts:113` |
| 5 | 编译后入口、docs:check 与 docs-sync helper 对同一套 public surface 达成一致 | ✓ VERIFIED | `README.md:28`, `docs/ai-guide/COMMANDS.md:295`, `src/cli/commands/__tests__/ci-docs-sync.test.ts:30`, `src/cli/commands/__tests__/ci-docs-sync.test.ts:39` |

**Score:** 5/5 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `CLI-01`: 公共 CLI 不再暴露 `server` 命令 | ✓ SATISFIED | `src/cli/index.ts:159`, `src/cli/removed-commands.ts:12`, `README.md:242` |
| `CLI-02`: 公共 CLI 不再暴露 `watch` 命令 | ✓ SATISFIED | `src/cli/index.ts:84`, `src/cli/tree-sitter-check.ts:86`, `docs/SETUP_GUIDE.md:250` |
| `CLI-03`: 公共 CLI 不再暴露 `report` 命令 | ✓ SATISFIED | `src/cli/index.ts:141`, `src/cli/removed-commands.ts:26`, `README.md:243` |
| `CLI-04`: 公共 CLI 不再暴露 `logs` 命令 | ✓ SATISFIED | `src/cli/index.ts:141`, `src/cli/removed-commands.ts:33`, `README.md:244` |
| `CLI-05`: CLI 注册、README、AI 文档、护栏脚本中的保留命令列表保持一致 | ✓ SATISFIED | `README.md:28`, `docs/ai-guide/COMMANDS.md:5`, `scripts/validate-docs.js:271`, `src/cli/__tests__/validate-docs-script.test.ts:50` |

## Automated Checks

- `pnpm exec vitest run src/cli/__tests__/index-help.test.ts`
- `pnpm exec vitest run src/cli/__tests__/removed-commands.test.ts`
- `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts`
- `npm run build`
- `node dist/cli/index.js --help`
- `node dist/cli/index.js server`
- `node dist/cli/index.js watch`
- `node dist/cli/index.js report`
- `node dist/cli/index.js logs`
- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`

## Failure Rehearsal

1. **重新把 removed command 写回 AI 文档**
   - Rehearsal: `src/cli/__tests__/validate-docs-script.test.ts` 会把 `docs/ai-guide/COMMANDS.md` 中的 removed-command 迁移章节改写成 `## server - HTTP 服务器（当前过渡能力）`
   - Expected failure: `scripts/validate-docs.js` 报 `documentation guardrails failed`
   - Evidence: `src/cli/__tests__/validate-docs-script.test.ts:113`, `scripts/validate-docs.js:224`

2. **旧命令再次退化为 generic unknown command**
   - Rehearsal: 直接运行 `node dist/cli/index.js watch`
   - Expected behavior: 输出 removed-command 迁移提示并返回非零退出码，而不是 Commander 默认 `unknown command`
   - Evidence: `src/cli/index.ts:27`, `src/cli/removed-commands.ts:19`

## Human Verification Required

None — 本 phase 的可观察真相都已通过 CLI 入口、文档脚本与单元测试验证。

## Gaps Summary

**No product gaps found.** Phase 2 goal achieved and ready to move to Phase 3.

---
*Verified: 2026-03-24T02:42:00Z*
