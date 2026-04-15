# Design Contract: Handoff baseline

## Goal
- 在 `src/cli/design-handoff-builder.ts` 中生成 canonical handoff truth

## Constraints
- 只允许修改 `src/cli/design-handoff-builder.ts`

## Acceptance Criteria
- [ ] `src/cli/design-handoff-builder.ts` 会返回 machine-readable handoff payload
- [ ] `src/cli/design-handoff-builder.ts` 会输出 canonical handoff truth
- [ ] `src/cli/design-handoff-builder.ts` 会稳定解析 artifact path

## Non-Goals
- 不修改 `src/cli/commands/analyze.ts`

## Open Questions
