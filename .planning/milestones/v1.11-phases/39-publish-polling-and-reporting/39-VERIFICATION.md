---
phase: 39-publish-polling-and-reporting
verified: 2026-04-23T19:57:24+08:00
status: passed
score: 4/4 must-haves verified
---

# Phase 39: Publish polling and reporting Verification Report

**Phase Goal:** 为现有发布链补齐一个独立、只读、strict truth-first 的 publish follow-up surface，让 humans / agents 都能读取 GitHub Actions publish snapshot truth，而不扩张 `/release` authority。  
**Verified:** 2026-04-23T19:57:24+08:00  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | 仓库现在已有独立 `publish-status` 顶层 CLI 命令 | ✓ VERIFIED | `src/cli/commands/publish-status.ts`, `src/cli/index.ts` |
| 2 | `publish-status` 复用共享 snapshot resolver，并且能输出终端摘要 + machine-readable JSON / structured truth | ✓ VERIFIED | `src/cli/commands/publish-status.ts`, `src/cli/commands/__tests__/publish-status-command.test.ts` |
| 3 | exact-match 失败场景现在显式返回 `ambiguous` / `unavailable`，不会猜“最新一条 publish run” | ✓ VERIFIED | `src/cli/commands/ship/monitor.ts`, `src/cli/commands/ship/__tests__/monitor.test.ts` |
| 4 | release rules / Codex skill / AI command docs 都把 `publish-status` 定位为 follow-up observability only，而不是第二条 release authority | ✓ VERIFIED | `docs/rules/release.md`, `.agents/skills/release/SKILL.md`, `docs/ai-guide/COMMANDS.md` |

**Score:** 4/4 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `RELF-02` | ✓ SATISFIED | `publish-status` + `snapshotPublishStatus(...)` 已交付 human / machine 共享的 publish truth |
| `SAFE-01` | ✓ SATISFIED | `docs/rules/release.md` 仍声明 `/release` 是单一权威；`publish-status` 只作 follow-up observability |
| `SAFE-02` | ✓ SATISFIED | 本 phase 只做读取、测试、文档和 planning 更新；没有真实 `npm publish`、tag、push 或 GitHub Release |

## Automated Checks

- `rtk proxy rg -n "snapshotPublishStatus|ambiguous|unavailable|export async function monitorCI" src/cli/commands/ship/monitor.ts`
  - Result: pass; strict snapshot resolver, `ambiguous`, `unavailable`, and `monitorCI` all present
- `rtk npm test -- src/cli/commands/ship/__tests__/monitor.test.ts src/cli/commands/ship/__tests__/pipeline.test.ts src/cli/commands/__tests__/publish-status-command.test.ts`
  - Result: 3 test files passed, 10 tests passed
- `rtk npm run build`
  - Result: pass (`tsc`)
- `rtk proxy rg -n "publish-status|follow-up observability|只读|single authority|单一权威" docs/rules/release.md .agents/skills/release/SKILL.md docs/ai-guide/COMMANDS.md`
  - Result: pass; matched publish-status routing plus single-authority wording
- `rtk npm run docs:check`
  - Result: Documentation guardrails passed; AI documentation guardrails passed
- `rtk git diff --check`
  - Result: pass

## Failure Rehearsal

1. **如果出现多个同时匹配 `tag + sha` 的 workflow runs**
   - Expected failure: command 不能再声称知道“哪一条才是最新 publish run”
   - Detection: `monitor.test.ts` 断言返回 `ambiguous`

2. **如果 GitHub Actions runs API 不可达 / 权限不足**
   - Expected failure: command 必须返回 `unavailable`，而不是伪装成 empty success
   - Detection: `monitor.test.ts` 断言 `403` 场景返回 `unavailable`

3. **如果有人把 `publish-status` 写成第二条 release path**
   - Expected failure: release authority drift
   - Detection: docs routing grep 将暴露缺少“单一权威 / follow-up observability only”约束

4. **如果 `--structured` 脱离 `--json` 单独运行**
   - Expected failure: machine contract 入口歧义
   - Detection: `publish-status-command.test.ts` 断言命令抛出 `--structured 需要配合 --json 使用`

## Human Verification Required

None — 本 phase 的验收点都可由静态工件、聚焦测试、build、docs guardrails 与 diff hygiene 覆盖。
