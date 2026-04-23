---
phase: 31-release-governance-contract
verified: 2026-04-22T17:29:30+08:00
status: passed
score: 4/4 must-haves verified
---

# Phase 31: Release governance contract Verification Report

**Phase Goal:** 定义 `/release` 的权威文档契约，并把发布治理路由接入现有 rules / entry docs。
**Verified:** 2026-04-22T17:29:30+08:00
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `docs/rules/release.md` 已成为 `/release` 的单一权威工作流文档 | ✓ VERIFIED | `docs/rules/release.md` |
| 2 | `deployment.md` 与 `pre-release-checklist.md` 已固定 milestone-bound release 与 readiness 语义 | ✓ VERIFIED | `docs/rules/deployment.md`, `docs/rules/pre-release-checklist.md` |
| 3 | `AGENTS.md` 与 `CLAUDE.md` 只保留 L3 边界与 release 路由，没有复制整份流程正文 | ✓ VERIFIED | `AGENTS.md`, `CLAUDE.md` |
| 4 | `/release` 已明确委托 `scripts/release.sh` 与 `.github/workflows/publish.yml`，保持 thin orchestrator 边界 | ✓ VERIFIED | `docs/rules/release.md`, `docs/rules/deployment.md` |

**Score:** 4/4 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `REL-01` | ✓ SATISFIED | `docs/rules/release.md` 明确 milestone closeout ↔ npm release 1:1 绑定 |
| `REL-02` | ✓ SATISFIED | `docs/rules/release.md` 固定 `vX.Y → X.Y.0` 与 `0.5.2-beta.1 → 1.9.0` major jump 警告 |
| `DOC-01` | ✓ SATISFIED | `docs/rules/release.md` 覆盖触发条件、流程、确认门、错误处理、禁止事项 |
| `DOC-02` | ✓ SATISFIED | `docs/rules/deployment.md` / `docs/rules/pre-release-checklist.md` 已同步 release binding 与 readiness |
| `DOC-03` | ✓ SATISFIED | `docs/rules/README.md`, `AGENTS.md`, `CLAUDE.md` 只做 release 路由和边界 |

## Automated Checks

- `rtk proxy rg -n "vX\\.Y → X\\.Y\\.0|v1\\.9 → 1\\.9\\.0|0\\.5\\.2-beta\\.1 → 1\\.9\\.0|Confirmation Gate #1|Confirmation Gate #2|thin orchestrator|scripts/release\\.sh|\\.github/workflows/publish\\.yml" docs/rules/release.md`
- `rtk proxy rg -n "Milestone-bound releases|/release|vX\\.Y → X\\.Y\\.0|不得绕过 GSD milestone closeout" docs/rules/deployment.md`
- `rtk proxy rg -n "Milestone readiness|### 12\\. Milestone 归档状态检查|Confirmation Gate #1|Confirmation Gate #2" docs/rules/pre-release-checklist.md`
- `rtk proxy rg -n "release\\.md|/release" docs/rules/README.md CLAUDE.md AGENTS.md`

## Failure Rehearsal

1. **如果 `AGENTS.md` / `CLAUDE.md` 再次粘入完整 release 步骤**
   - Expected failure: entry docs 重新长出第二套发布手册，`DOC-03` 失效
   - Detection: `release` 相关 grep 会同时命中路由文档与 rules 正文级术语

2. **如果 `pre-release-checklist.md` 继续推荐直接跑 `scripts/release.sh`**
   - Expected failure: rules 内部会出现“统一入口是 `/release`”与“推荐直接跑 helper”两套主入口
   - Detection: 手工审阅 `发布前准备` 小节，或 grep `使用发布脚本（一键完成）`

3. **如果 `docs/rules/release.md` 直接重写 commit / tag / push 逻辑**
   - Expected failure: `/release` 不再是 thin orchestrator，`REL-01` / `DOC-01` 的委托边界退化
   - Detection: source audit 发现 Step ⑦ 不再委托 `scripts/release.sh`

## Human Verification Required

None — 本 phase 是 release governance docs + routing contract，可通过文档工件与静态检查完成验收。

## Gaps Summary

**No phase gaps remain.** 下一步进入 `Phase 32`，把相同 contract 落到 `.claude/skills/release/SKILL.md`。
