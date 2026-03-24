---
phase: 09
slug: plugin-docs-validation
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 09 — Validation Strategy

> 文档正确不等于产品面稳定；必须同时验证 docs guardrail 和真实 CLI 双场景。

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Quick run command** | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/__tests__/validate-ai-docs-script.test.ts src/cli/commands/__tests__/generate.test.ts` |
| **Docs checks** | `npm run docs:check` |
| **Build checks** | `npm run typecheck && npm run build` |
| **CLI e2e** | built-in plugin + user plugin 两条真实 `generate` fixture |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 09-01-01 | 01 | 1 | DOC-03 | docs sync | `npm run docs:check` | ✅ green |
| 09-01-02 | 01 | 1 | DOC-03 | docs fixtures | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/__tests__/validate-ai-docs-script.test.ts` | ✅ green |
| 09-02-01 | 02 | 2 | DOC-04 | guardrail | `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts` | ✅ green |
| 09-02-02 | 02 | 2 | VAL-01 | CLI e2e | built-in + user plugin fixture `generate` runs | ✅ green |
| 09-02-03 | 02 | 2 | DOC-04, VAL-01 | type/build | `npm run typecheck && npm run build` | ✅ green |

---

## Failure Rehearsal

1. **README 回退到 `codemap.config.json`**
   - Detection: `fails when README reintroduces the legacy config filename`
   - Expected result: docs guardrail 失败

2. **OUTPUT 文档丢失 `pluginReport` 契约**
   - Detection: `fails when OUTPUT guide drops the pluginReport contract`
   - Expected result: docs guardrail 失败

3. **真实 CLI user plugin 仍不可用**
   - Detection: user plugin fixture
   - Expected result: `.mycodemap/plugins/good.txt` 成功写出，且 `pluginReport` 有可读 diagnostics

## Validation Sign-Off

- [x] Docs entrance and AI docs are both covered
- [x] Guardrail script has plugin-specific assertions
- [x] Real CLI evidence exists for built-in and user plugin flows
- [x] `nyquist_compliant: true` set in frontmatter
