# Design Contract: Design-to-code mapping baseline

## Goal
- 在 `src/cli/commands/design.ts` 上暴露 `design map` 能力
- 保持复用 `runDesignValidate`，不要复制旧的 validate 逻辑

## Constraints
- scope resolver 放在 `src/cli/design-scope-resolver.ts`
- 继续复用模块 `src/cli/design-contract-loader`
- 需要正式类型文件 `src/interface/types/design-mapping.ts`

## Acceptance Criteria
- [ ] `mycodemap design map mycodemap.design.md --json` 返回 candidates 与 reasons
- [ ] 输出能说明为什么命中 `runDesignValidate`
- [ ] machine-readable 结果可用于后续 handoff phase

## Non-Goals
- 不修改 `src/cli/commands/analyze.ts`
- 不恢复 workflow 的 commit / ci phases
