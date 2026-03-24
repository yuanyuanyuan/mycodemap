---
phase: 07
slug: plugin-contract-config-surface
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 07 — Validation Strategy

> 先锁死配置契约与入口，再让 Phase 08 接 runtime；验证策略也必须围绕这个边界展开。

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/config-loader.test.ts src/cli/__tests__/validate-docs-script.test.ts` |
| **Full suite command** | `npm test` |
| **Docs / CLI checks** | `npm run docs:check`、`node dist/cli/index.js generate --help` |
| **Build checks** | `npm run typecheck && npm run build` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/config-loader.test.ts`
- **After every plan wave:** Run `npm run docs:check && npm run typecheck`
- **Before `$gsd-verify-work`:** `npm test && npm run docs:check && npm run build`
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PLG-01, PLG-02 | type/schema | `pnpm exec vitest run src/cli/__tests__/config-loader.test.ts` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | PLG-01, PLG-02 | docs/config | `npm run docs:check` | ✅ | ✅ green |
| 07-01-03 | 01 | 1 | PLG-01, PLG-02 | build | `npm run typecheck && npm run build` | ✅ | ✅ green |
| 07-02-01 | 02 | 2 | PLG-03 | unit | `pnpm exec vitest run src/cli/commands/__tests__/generate.test.ts src/cli/__tests__/generate.test.ts src/cli/__tests__/config-loader.test.ts` | ✅ | ✅ green |
| 07-02-02 | 02 | 2 | PLG-03 | CLI/error | `node dist/cli/index.js generate` (fixture with invalid plugin config) | ✅ | ✅ green |
| 07-02-03 | 02 | 2 | PLG-03 | docs guardrail | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts && npm run docs:check` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/cli/__tests__/config-loader.test.ts` — 配置路径回退、默认值归一化、非法插件字段 hard-fail 回归测试

---

## Failure Rehearsal

1. **README 继续写旧配置文件名**
   - Failure mode: 用户按 README 新建 `codemap.config.json`，却与 `initCommand()` / schema 主叙事脱节。
   - Detection: `validate-docs-script.test.ts` + `npm run docs:check` 必须能抓到 canonical config example 漂移。

2. **`generate` 仍忽略配置文件**
   - Failure mode: `plugins` 配置写进文件后主命令没有任何反馈，用户误以为插件已接入。
   - Detection: `generate` 回归测试与 fixture CLI spot-check 失败。

3. **坏插件配置被静默吞掉**
   - Failure mode: `plugins: "foo"` 或非法 `pluginDir` 类型没有报错，只是 quietly fallback。
   - Detection: `config-loader.test.ts` 与 `generate` 错误路径测试失败。

---

## Manual-Only Verifications

- 使用临时 fixture 目录放置一份包含非法插件字段的 `mycodemap.config.json`，人工确认 CLI 错误信息指出具体字段与修复方向。

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed
