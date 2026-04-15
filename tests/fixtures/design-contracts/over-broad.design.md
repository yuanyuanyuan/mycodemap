# Design Contract: Over broad blocker

## Goal
- 同时覆盖 `src/cache/index.ts`
- 同时覆盖 `src/cache/file-hash-cache.ts`
- 同时覆盖 `src/parser/index.ts`
- 同时覆盖 `src/interface/types/index.ts`
- 同时覆盖 `src/cli/design-contract-loader.ts`
- 同时覆盖 `src/cli/commands/design.ts`
- 同时覆盖 `src/server/CodeMapServer.ts`

## Constraints
- 当前设计允许这些范围一起进入候选集合

## Acceptance Criteria
- [ ] 如果候选集合超过人工可审查阈值，系统必须返回 blocker

## Non-Goals
- 不命中 `src/cli/commands/analyze.ts`
