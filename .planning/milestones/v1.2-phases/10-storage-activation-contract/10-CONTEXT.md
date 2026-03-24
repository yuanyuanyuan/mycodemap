# Phase 10: Storage Activation & Contract - Context

**Gathered:** 2026-03-24  
**Status:** Completed

## Phase Boundary

本阶段只解决三件事：
1. 给 `mycodemap.config.json` 补上正式 `storage` 配置面与诊断入口；
2. 让 `generate` / `export` / 内部 `Server Layer` 运行时真正读取配置的 storage backend；
3. 抽出共享 graph helper / contract tests，停止让后端各自复制 fallback 逻辑。

## Decisions

- 继续沿用 brownfield 路线：先收口 activation path，再做 backend-specific 实现。
- `storage.type = "auto"` 先保守落到 `filesystem`，不把未来启发式切换伪装成当前事实。
- 缺少可选依赖时必须显式报错，不允许静默 fallback 掩盖配置问题。

## Canonical References

- `.planning/REQUIREMENTS.md` — `GST-01` ~ `GST-03`
- `.planning/ROADMAP.md` — Phase 10 / plans `10-01` ~ `10-03`
- `src/cli/config-loader.ts`
- `src/cli/storage-runtime.ts`
- `src/cli/commands/generate.ts`
- `src/cli/commands/export.ts`
- `src/cli/commands/server.ts`
- `src/cli-new/commands/query.ts`
- `src/infrastructure/storage/graph-helpers.ts`

