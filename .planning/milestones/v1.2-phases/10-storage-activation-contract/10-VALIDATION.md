# Phase 10: Storage Activation & Contract - Validation

## Must Verify

1. 默认配置会生成 `storage` 配置，且 loader 会接受 `filesystem` / `kuzudb` / `neo4j` / `memory` / `auto`。
2. `generate` 会把 CodeGraph 保存到配置后端，而不是继续硬编码 `filesystem`。
3. 共享 helper / contract tests 能固定 callers/callees/cycles/impact/statistics 的最小一致行为。

## Commands

- `npx vitest run src/cli/__tests__/config-loader.test.ts src/infrastructure/storage/__tests__/graph-helpers.test.ts src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/generate.test.ts`
- `npm run typecheck`

## Failure Rehearsal

- 若 `storage.location` 之类的未知字段被静默接受，配置契约会再次漂移；本阶段用 `config-loader` 回归测试锁住该失败模式。

