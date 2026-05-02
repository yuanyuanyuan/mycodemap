---
phase: 54
slug: zero-config-preview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-02
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 1.6.1 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/cli/commands/__tests__/preview-command.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 54-01-01 | 01 | 1 | ZCP-01 | T-54-01 | Profile fallback provides safe defaults when no config | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "zero-config"` | ⬜ W0 | ⬜ pending |
| 54-01-02 | 01 | 1 | ZCP-02 | — | detectProjectType() correctly identifies project type | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "auto-detects"` | ⬜ W0 | ⬜ pending |
| 54-01-03 | 01 | 1 | ZCP-03 | T-54-02 | escomplex per-file try-catch prevents single-file failure from aborting | unit | `npx vitest run src/cli/preview/__tests__/complexity-scanner.test.ts -t "error handling"` | ⬜ W0 | ⬜ pending |
| 54-02-01 | 02 | 1 | ZCP-03 | — | Dependency extraction from marker files works correctly | unit | `npx vitest run src/cli/preview/__tests__/dependency-extractor.test.ts` | ⬜ W0 | ⬜ pending |
| 54-02-02 | 02 | 1 | ZCP-03 | — | Complexity hotspots returns top-5 by cyclomatic | unit | `npx vitest run src/cli/preview/__tests__/complexity-scanner.test.ts -t "top-5"` | ⬜ W0 | ⬜ pending |
| 54-03-01 | 03 | 2 | ZCP-04 | — | --save writes config and triggers generate | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "save"` | ⬜ W0 | ⬜ pending |
| 54-03-02 | 03 | 2 | ZCP-01 | — | End-of-output hint text present | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "hint"` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/cli/commands/__tests__/preview-command.test.ts` — covers ZCP-01..04
- [ ] `src/cli/preview/__tests__/dependency-extractor.test.ts` — covers marker-file dep extraction
- [ ] `src/cli/preview/__tests__/complexity-scanner.test.ts` — covers escomplex scanning
- [ ] `npm install smol-toml` — new dependency for TOML parsing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TTY auto-detection renders human-readable output | ZCP-03 | Requires real TTY to verify auto-detection | Run `codemap preview` in interactive terminal; verify table output |
| `--save` triggers full generate with visible output | ZCP-04 | Generate output is side-effect heavy | Run `codemap preview --save` in temp project; verify config file + generate output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
