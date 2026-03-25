# Design Contract: Design validate command

## Goal
- 为 human-authored design contract 提供正式 validate 入口

## Constraints
- 不扩写 analyze intent
- 不恢复 workflow 的 commit / ci phases

## Acceptance Criteria
- [ ] `mycodemap design validate mycodemap.design.md --json` 返回机器可读结果
- [ ] 缺失必填 section 时返回 blocker diagnostics
- [ ] CLI 顶层 help 可以发现 `design` 命令

## Non-Goals
- 不做 design-to-code mapping
- 不生成 handoff package

## Context
- 当前 milestone 先收 design input surface，再做后续 mapping 与 handoff
