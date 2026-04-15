# Design Contract: No match blocker

## Goal
- 只允许修改 `src/imaginary/missing-scope.ts`
- 只接受符号 `ImaginaryScopeResolver`

## Constraints
- 不允许猜测其他模块

## Acceptance Criteria
- [ ] 若没有明确候选，系统必须阻断

## Non-Goals
- 不做宽泛关键词搜索
