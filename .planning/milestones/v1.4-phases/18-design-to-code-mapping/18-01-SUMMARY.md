---
phase: 18-design-to-code-mapping
plan: 01
subsystem: "design-map-baseline"
tags: [design-map, cli, mapping, fixtures, vitest]
requires: []
provides:
  - `DesignMappingResult` / `DesignMappingCandidate` / `DesignMappingDiagnostic` 正式类型
  - `resolveDesignScope()` baseline resolver 与 reason chain
  - `design map` CLI 入口、success fixture 与 focused tests
affects: [phase-18-02, phase-18-03, design-command-surface]
tech-stack:
  added: []
  patterns: [boundary-first-mapping, dedicated-design-surface, json-first-cli]
key-files:
  created:
    - src/interface/types/design-mapping.ts
    - src/cli/design-scope-resolver.ts
    - src/cli/__tests__/design-scope-resolver.test.ts
    - src/cli/commands/__tests__/design-map-command.test.ts
    - tests/fixtures/design-contracts/mapping-basic.design.md
  modified:
    - src/interface/types/index.ts
    - src/cli/commands/design.ts
key-decisions:
  - "继续把 mapping 挂在既有 `design` command 下，不扩写 analyze/workflow public contract"
  - "exact anchors 优先走 filesystem/code map 真值，再补 broad search"
requirements-completed: [MAP-01]
completed: 2026-03-25
---

# Phase 18-01 Summary

**`design map` baseline 已落地，能够把 validated design contract 解析成带 reason chain 的 candidate scope。**

## Accomplishments

- 新增 `design-mapping` 正式类型，避免继续借用 analyze output 冒充 mapping contract
- 新增 CLI-owned `resolveDesignScope()`，支持 file / module / symbol candidates 与 `section / matchedText / evidenceType` 原因链
- `design map [file] --json` 已成为正式 CLI 入口，并通过 success fixture 与 focused Vitest 回归锁住

## Verification

- `npm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts`
- `npm run build`
- `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json`

## Decisions & Deviations

- 关键决策：exact path/module anchors 先走 filesystem fallback，避免 stale code map 让新文件失明
- 偏差：未执行 git commit；遵循当前运行时更高优先级约束，仅保留文件改动、测试证据与 summary
