# Design Contract: Verify ready baseline

## Goal
- 在 `src/cli/design-verification-builder.ts` 中聚合 canonical verification truth

## Constraints
- 结构化输出必须落在 `src/interface/types/design-verification.ts`
- 必须保留 builder-focused 回归测试

## Acceptance Criteria
- [ ] `src/cli/design-verification-builder.ts` 会产出 conservative verification result
- [ ] `src/interface/types/design-verification.ts` 会定义正式 verification schema
- [ ] ready-path regressions 会被现有测试覆盖

## Non-Goals
- 不把 verify 重新塞回 `workflow` phase
