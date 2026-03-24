# Phase 12: Neo4j Compatibility, Docs & Validation - Validation

## Must Verify

1. Neo4j backend 能保存、读取、更新、删除并查询 / 分析 snapshot-backed CodeGraph。
2. graph storage 配置、可选依赖、失败语义与边界已进入 README / AI docs / setup / rules / schema / docs guardrail。
3. 自动化验证至少包含一条成功路径和一条失败路径。

## Commands

- `npx vitest run src/infrastructure/storage/adapters/__tests__/Neo4jStorage.test.ts src/cli/__tests__/validate-docs-script.test.ts`
- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Failure Rehearsal

- 若文档写成“缺少依赖会自动 fallback”，现场排障会走错方向；本阶段要求 docs guardrail 与失败测试一起锁住这条语义。

