# Design Contract: Handoff pending review

## Goal
- 在 `src/cli/design-handoff-builder.ts` 中生成 canonical handoff truth

## Constraints
- 只允许修改 `src/cli/design-handoff-builder.ts`
- 默认 artifact path 必须落在 `.mycodemap/handoffs/`

## Acceptance Criteria
- [ ] `src/cli/design-handoff-builder.ts` 会把未决问题保留到 handoff JSON
- [ ] `src/cli/design-handoff-builder.ts` 会把结果标记为需要人工复核

## Non-Goals
- 不绕过人类审批 gate

## Open Questions
- 低风险 assumptions 是否也必须显式批准后再执行？
