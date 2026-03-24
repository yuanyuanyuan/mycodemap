---
phase: 08
slug: plugin-runtime-integration
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 08 — Validation Strategy

> 运行时接入的关键不是“能跑一次”，而是“显式 opt-in、失败可诊断、用户插件不炸主流程”。

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/config-loader.test.ts` |
| **CLI spot-check** | built-in plugin + user plugin 两条 `node dist/cli/index.js generate` 临时 fixture 流程 |
| **Build checks** | `npm run typecheck && npm run build` |
| **Estimated runtime** | ~120 seconds |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 08-01-01 | 01 | 1 | PLG-04, PLG-05 | unit/integration | `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts` | ✅ green |
| 08-01-02 | 01 | 1 | PLG-04, PLG-05 | type/build | `npm run typecheck && npm run build` | ✅ green |
| 08-02-01 | 02 | 2 | PLG-06 | failure isolation | `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/config-loader.test.ts` | ✅ green |
| 08-02-02 | 02 | 2 | PLG-04, PLG-06 | CLI e2e | built-in + user plugin fixture `generate` runs | ✅ green |

---

## Failure Rehearsal

1. **坏插件在 `analyze` / `generate` 阶段抛错**
   - Detection: `should isolate failing user plugins and keep generate alive`
   - Expected result: 好插件结果仍保留，坏插件进入 `pluginReport.diagnostics`

2. **用户插件目录是相对路径**
   - Detection: 真实 CLI user plugin fixture
   - Expected result: `pluginDir` 被解析为绝对路径，插件成功加载并写出文件

3. **插件文件试图写出到输出目录之外**
   - Detection: `resolvePluginOutputPath()` 越界保护
   - Expected result: 记录 generate-stage error diagnostics，而不是写越界文件

## Validation Sign-Off

- [x] Runtime integration is covered by automated tests
- [x] Failure isolation has at least one explicit rehearsal
- [x] Real CLI fixture evidence exists for built-in and user plugin flows
- [x] `nyquist_compliant: true` set in frontmatter
