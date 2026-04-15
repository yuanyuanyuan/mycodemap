# Design Contract: High risk blocker

## Goal
- 直接修改 `src/cli/commands/analyze.ts`

## Constraints
- 当前设计没有给出更细的 blast-radius 边界

## Acceptance Criteria
- [ ] 命中高风险 public surface 时必须阻断

## Non-Goals
- 不扩大到其他 CLI surfaces
