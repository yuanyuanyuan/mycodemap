---
phase: 29-rewrite-the-three-entry-docs-to-constitution-router-adapter-roles
verified: 2026-04-22T07:24:35Z
status: passed
score: 4/4 must-haves verified
---

# Phase 29: Rewrite the three entry docs to constitution / router / adapter roles Verification Report

**Phase Goal:** 重写 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`，让三份入口文档分别承担宪法 / 路由 / Claude adapter 单一职责。  
**Verified:** 2026-04-22T07:24:35Z  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `AGENTS.md` 已只保留仓库级治理协议、证据协议、改动边界、验证/交付底线与原则级 RTK 约束 | ✓ VERIFIED | `AGENTS.md` |
| 2 | 根 `CLAUDE.md` 已只保留入口路由，不再出现执行回路、验证命令、rule-system 默认值、dogfood 或交付 checklist | ✓ VERIFIED | `CLAUDE.md` |
| 3 | `.claude/CLAUDE.md` 已变成 Claude adapter，不再形成第二套执行手册 | ✓ VERIFIED | `.claude/CLAUDE.md` |
| 4 | 被迁出的任务模板与 AI 友好文档细则已在 `docs/rules/engineering-with-codex-openai.md` 获得 authoritative 归宿 | ✓ VERIFIED | `docs/rules/engineering-with-codex-openai.md` |

**Score:** 4/4 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `AUTH-01` | ✓ SATISFIED | `AGENTS.md` 只保留 constitution content |
| `AUTH-02` | ✓ SATISFIED | `CLAUDE.md` 只保留路由，不含执行政策正文 |
| `AUTH-03` | ✓ SATISFIED | `.claude/CLAUDE.md` 只保留 adapter 差异 |
| `DEST-03` | ✓ SATISFIED | moved operational content 已下沉到 `docs/rules/engineering-with-codex-openai.md` |

## Automated Checks

- `rtk proxy rg -n "执行回路|修改后必须执行|Rule-system 默认值|CodeMap CLI Dogfood|交付清单|Commit 策略|任务初始化模板|<claude-mem-context>" AGENTS.md CLAUDE.md .claude/CLAUDE.md || true`
- `rtk npm run docs:check`
- `rtk node dist/cli/index.js ci check-docs-sync`
- `rtk proxy git diff --check`

## Failure Rehearsal

1. **如果有人把执行回路或命令清单重新写回根 `CLAUDE.md`**
   - Rehearsal: 在 `CLAUDE.md` 中恢复 `执行回路` 标题
   - Expected failure: 入口文档重新长成第二套执行手册，`AUTH-02` 失效；Phase 30 的 discoverability scan 也会再次出现角色冲突

2. **如果 `.claude/CLAUDE.md` 再次加入 commit / TDD / checklist**
   - Rehearsal: 在 adapter 中恢复 `Commit 策略` 段落
   - Expected failure: `AUTH-03` 失效，Claude runtime 重新读到第二套通用政策

3. **如果 `AGENTS.md` 保留会话级 mem payload 或长命令表**
   - Rehearsal: 把 `<claude-mem-context>` 或 RTK 速查表重新贴回 `AGENTS.md`
   - Expected failure: constitution 层再次混入非规范性运行时内容，`AUTH-01` 与 `DEST-03` 同时退化

## Human Verification Required

None — 本 phase 是 entry-doc rewrite + docs guardrail，可通过文档工件与静态校验完成验收。

## Gaps Summary

**No phase gaps remain.** 下一步进入 Phase 30 的全局 discoverability sweep 与 zero-duplication verification。
