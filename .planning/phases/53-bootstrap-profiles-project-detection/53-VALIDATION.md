---
phase: 53
slug: bootstrap-profiles-project-detection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-01
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 1.1.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/cli/init/__tests__/detect.test.ts src/cli/init/__tests__/profile-loader.test.ts src/cli/commands/__tests__/init-profile.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/cli/init/__tests__/detect.test.ts src/cli/init/__tests__/profile-loader.test.ts src/cli/commands/__tests__/init-profile.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 1 | FRC-01 | — | Marker-only detection, no path traversal | unit | `npx vitest run src/cli/init/__tests__/detect.test.ts` | ❌ W0 | pending |
| 53-01-02 | 01 | 1 | FRC-02 | T-53-01 | Profile name allow-list, zod validation | unit | `npx vitest run src/cli/init/__tests__/profile-loader.test.ts` | ❌ W0 | pending |
| 53-01-03 | 01 | 1 | FRC-03 | — | 5 built-in profiles with parser/ignore/depth | unit | `npx vitest run src/cli/init/__tests__/profile-loader.test.ts` | ❌ W0 | pending |
| 53-02-01 | 02 | 1 | FRC-04 | — | ProfilePlan creates InitAsset with correct status | integration | `npx vitest run src/cli/commands/__tests__/init-profile.test.ts` | ❌ W0 | pending |
| 53-02-02 | 02 | 1 | FRC-04 | — | --profile flag bypasses detection | integration | `npx vitest run src/cli/commands/__tests__/init-profile.test.ts` | ❌ W0 | pending |
| 53-02-03 | 02 | 1 | FRC-04 | T-53-02 | Non-TTY exits non-zero without --profile or -y | integration | `npx vitest run src/cli/commands/__tests__/init-profile.test.ts` | ❌ W0 | pending |
| 53-02-04 | 02 | 1 | D-16 | — | Existing config skips detection, reports already-configured | integration | `npx vitest run src/cli/commands/__tests__/init-profile.test.ts` | ❌ W0 | pending |
| 53-03-01 | 03 | 2 | FRC-01 | — | detect.test.ts covers all 4 markers + no-marker case | unit | `npx vitest run src/cli/init/__tests__/detect.test.ts` | ❌ W0 | pending |
| 53-03-02 | 03 | 2 | FRC-02 | — | profile-loader.test.ts covers all 5 profiles | unit | `npx vitest run src/cli/init/__tests__/profile-loader.test.ts` | ❌ W0 | pending |
| 53-03-03 | 03 | 2 | FRC-04 | — | init-profile.test.ts covers preview/apply/existing-config | integration | `npx vitest run src/cli/commands/__tests__/init-profile.test.ts` | ❌ W0 | pending |
| 53-03-04 | 03 | 2 | D-15 | — | first-run-guide.ts mentions profile recommendation | unit | `npx vitest run src/cli/__tests__/first-run-guide.test.ts` | ✅ | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `src/cli/init/__tests__/detect.test.ts` — stubs for FRC-01
- [ ] `src/cli/init/__tests__/profile-loader.test.ts` — stubs for FRC-02, FRC-03
- [ ] `src/cli/commands/__tests__/init-profile.test.ts` — stubs for FRC-04, D-12, D-02
- [ ] `src/cli/init/profiles/*.json` — 5 built-in profile data files

*Existing infrastructure (Vitest, temp dir patterns, receipt assertions) covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-marker interactive selection (TTY) | D-02 | Requires real TTY | Run `mycodemap init` in a temp dir with both package.json and Cargo.toml, verify numbered prompt appears |
| First-run guide text displayed | D-15 | Requires isFirstRun() state | Fresh clone, no .mycodemap/, verify guide mentions profile recommendation |

*All other behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
