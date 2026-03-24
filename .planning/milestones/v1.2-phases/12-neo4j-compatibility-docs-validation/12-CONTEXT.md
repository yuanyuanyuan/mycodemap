# Phase 12: Neo4j Compatibility, Docs & Validation - Context

**Gathered:** 2026-03-24  
**Status:** Completed

## Phase Boundary

本阶段完成四件事：
1. 让 Neo4j 达到与 KùzuDB 对齐的最小 storage contract；
2. 把 graph storage 配置、边界和失败语义同步到 README / AI docs / setup / rules；
3. 补一条明确的 graph backend 失败路径自动化验证；
4. 输出 phase / milestone verification 工件。

## Decisions

- Neo4j 仍采用 snapshot-backed persistence，优先保证 contract parity，而不是追求本轮 DB-native 优化。
- 图存储生产化只收口存储面，不重新开放公共 `mycodemap server` 产品面。
- `docs:check` 必须把 graph storage 事实写成 guardrail，而不是只靠 README 文案。

## Canonical References

- `.planning/REQUIREMENTS.md` — `NEO-01` ~ `NEO-03`, `DOC-05`, `VAL-02`
- `.planning/ROADMAP.md` — Phase 12 / plans `12-01` ~ `12-03`
- `src/infrastructure/storage/adapters/Neo4jStorage.ts`
- `src/infrastructure/storage/adapters/__tests__/Neo4jStorage.test.ts`
- `README.md`
- `AI_GUIDE.md`
- `docs/ai-guide/COMMANDS.md`
- `docs/ai-guide/QUICKSTART.md`
- `docs/ai-guide/PATTERNS.md`
- `docs/ai-guide/INTEGRATION.md`
- `docs/SETUP_GUIDE.md`
- `docs/rules/validation.md`
- `scripts/validate-docs.js`

