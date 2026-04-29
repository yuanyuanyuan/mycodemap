---
phase: 38-codex-release-entry-surface
verified: 2026-04-23T13:34:48+08:00
status: passed
score: 4/4 must-haves verified
---

# Phase 38: Codex release entry surface Verification Report

**Phase Goal:** 为 Codex 落地首个 non-Claude release entry surface，同时保持 `docs/rules/release.md` 继续是唯一 authority chain。  
**Verified:** 2026-04-23T13:34:48+08:00  
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Codex 现在已有 repo-local `/release` runtime adapter | ✓ VERIFIED | `.agents/skills/release/SKILL.md` |
| 2 | adapter 继续保留 `Confirmation Gate #1`、`Confirmation Gate #2`、`scripts/release.sh` 与 `.github/workflows/publish.yml` 委托边界 | ✓ VERIFIED | `.agents/skills/release/SKILL.md` |
| 3 | `docs/rules/release.md` 继续声明自己是单一权威，并把 Claude / Codex skill 都约束为 runtime adapters | ✓ VERIFIED | `docs/rules/release.md` |
| 4 | Phase 38 没有触发真实 release side effects，且 docs validation 仍然通过 | ✓ VERIFIED | command results below |

**Score:** 4/4 truths verified

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `RELF-01` | ✓ SATISFIED | Codex 已有 `.agents/skills/release/SKILL.md`，但它只 route / delegate 到现有 `/release` authority chain |
| `SAFE-01` | ✓ SATISFIED | `docs/rules/release.md` 仍声明单一权威；Codex wrapper 只作 adapter |
| `SAFE-02` | ✓ SATISFIED | 本 phase 只改 docs / skill / planning truth，没有真实 `npm publish`、tag、push 或 GitHub Release |

## Automated Checks

- `rtk proxy rg -n "docs/rules/release\\.md|Confirmation Gate #1|Confirmation Gate #2|scripts/release\\.sh|\\.github/workflows/publish\\.yml" .agents/skills/release/SKILL.md`
  - Result: matched release authority path, both gates, helper, and workflow references
- `rtk proxy rg -n "single authoritative|单一权威|\\.claude/skills/release/SKILL\\.md|\\.agents/skills/release/SKILL\\.md" docs/rules/release.md`
  - Result: matched the single-authority line plus both runtime adapter paths
- `! rtk proxy rg -n "Confirmation Gate #1|Confirmation Gate #2" README.md AI_GUIDE.md CLAUDE.md`
  - Result: pass
- `rtk npm run docs:check`
  - Result: Documentation guardrails passed; AI documentation guardrails passed
- `rtk node dist/cli/index.js ci check-docs-sync`
  - Result: Documentation guardrails passed; Analyze documentation blocks are in sync
- `rtk git diff --check`
  - Result: pass

## Failure Rehearsal

1. **如果 Codex skill 自称 authoritative workflow**
   - Expected failure: 第二条 release authority chain 出现
   - Detection: anti-authority grep 将不再通过

2. **如果 Codex skill 去掉 Gate #1 或 Gate #2**
   - Expected failure: non-Claude runtime release safety boundary 退化
   - Detection: gate grep 将缺失 `Confirmation Gate #1` / `#2`

3. **如果 README / AI guide / CLAUDE 再复制 release gate 正文**
   - Expected failure: release workflow 再次膨胀成多处 competing prose
   - Detection: `! rg "Confirmation Gate #1|Confirmation Gate #2"` 将失败

## Human Verification Required

None — 本 phase 是 runtime adapter + docs routing 收口，可通过静态工件与 docs validation 验收。
