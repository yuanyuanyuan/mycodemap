---
phase: 82
slug: interface-contract-1.0.0
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-11
---

# Phase 82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vitest` |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `rtk ./node_modules/.bin/vitest run src/cli/interface-contract/__tests__/interface-contract.test.ts src/cli/__tests__/index-schema.test.ts` |
| **Full suite command** | `rtk ./node_modules/.bin/vitest run src/cli/interface-contract/__tests__/interface-contract.test.ts src/cli/__tests__/index-schema.test.ts src/server/mcp/__tests__/schema-adapter.test.ts && rtk npx tsc --noEmit` |
| **Estimated runtime** | Quick: ~5-8s; full: ~10-15s |

## Sampling Rate

- **After every task commit:** Run the quick contract/schema smoke above.
- **After every plan wave:** Run the full suite command plus typecheck.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** 15 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 82-01-01 | 01 | 1 | POL-04 | T-82-01 | `CommandContract` types and zod schema both require `stable`, preventing implicit publishability drift | unit | `rtk ./node_modules/.bin/vitest run src/cli/interface-contract/__tests__/interface-contract.test.ts` | ✅ extend existing | ✅ green |
| 82-01-02 | 01 | 1 | POL-04 | T-82-02 | built-in registered commands all declare `stable: true` as explicit schema truth | unit | `rtk ./node_modules/.bin/vitest run src/cli/interface-contract/__tests__/interface-contract.test.ts` | ✅ extend existing | ✅ green |
| 82-01-03 | 01 | 1 | POL-04 | T-82-03 | full contract version and `--schema` output stay synchronized at `1.0.0` | unit + command | `rtk ./node_modules/.bin/vitest run src/cli/__tests__/index-schema.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts` | ✅ extend existing | ✅ green |
| 82-01-04 | 01 | 1 | POL-04 | T-82-04 | MCP schema adapter and meta-schema reject incomplete fixtures before unstable contract shapes can ship | unit + integration | `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/schema-adapter.test.ts src/cli/interface-contract/__tests__/interface-contract.test.ts && rtk npx tsc --noEmit` | ✅ extend existing | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All phase behaviors have automated verification.

## Validation Audit 2026-05-11

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit evidence:
- `rtk ./node_modules/.bin/vitest run src/cli/interface-contract/__tests__/interface-contract.test.ts`
- `rtk ./node_modules/.bin/vitest run src/cli/__tests__/index-schema.test.ts`
- `rtk ./node_modules/.bin/vitest run src/server/mcp/__tests__/schema-adapter.test.ts`
- `rtk npx tsc --noEmit`

Notes:
- This phase deliberately stayed schema-first: no new runtime command family was added, only contract truth and stricter validation around the existing surface.

## Validation Sign-Off

- [x] All tasks have `<automated>` verify coverage.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 coverage exists inside existing test seams; no extra harness is required.
- [x] No watch-mode flags in validation commands.
- [x] Feedback latency < 15s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** verified 2026-05-11
