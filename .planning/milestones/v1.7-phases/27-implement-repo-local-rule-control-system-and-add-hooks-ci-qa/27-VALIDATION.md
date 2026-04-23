---
phase: 27
slug: implement-repo-local-rule-control-system-and-add-hooks-ci-qa
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for repo-local rule control, hooks, CI, soft-gate, subagent injection, and workflow QA.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Python standard library `unittest`, shell/git fixture smoke tests, existing npm/vitest project checks |
| **Config file** | `package.json`, `.github/workflows/ci-gateway.yml`, `.githooks/*`, `.claude/settings.json` |
| **Quick run command** | `python3 scripts/validate-rules.py all --report-only` |
| **Full suite command** | `npm run docs:check && npm run typecheck && npm run lint && npm test && npm run build` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python3 scripts/validate-rules.py all --report-only` once the script exists.
- **After every plan wave:** Run the plan-specific focused tests plus `npm run docs:check` when docs, hooks, or CI contracts change.
- **Before `$gsd-verify-work`:** Full suite must be green, plus hook / CI / subagent-rule fixture smokes.
- **Max feedback latency:** 120 seconds for full suite, 30 seconds for focused rule-control fixtures.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | P27-NOW-CAPABILITY-REPORT | T-27-01 | Missing optional capability is reported, not silently passed | smoke | `python3 scripts/capability-report.py --output /tmp/codemap-capability-report.json` | ❌ W0 | ⬜ pending |
| 27-02-01 | 02 | 1 | P27-NOW-VALIDATE-RULES | T-27-02 | P0 findings block in gate mode; report-only exits 0 with findings visible | fixture | `python3 scripts/validate-rules.py all --report-only` | ❌ W0 | ⬜ pending |
| 27-03-01 | 03 | 2 | P27-NOW-WORKFLOW-VALIDATION | T-27-03 | Rule loading is derived from edited file path, not only agent self-report | docs check | `npm run docs:check` | ✅ | ⬜ pending |
| 27-04-01 | 04 | 3 | P27-NOW-HOOKS-CI-QA | T-27-04 | Hooks and CI run rule validation without disabling existing guardrails | fixture + grep | `grep -R "validate-rules.py" .githooks .github/workflows/ci-gateway.yml` | ✅ | ⬜ pending |
| 27-04-02 | 04 | 3 | P27-NOW-NO-VERIFY-BACKSTOP | T-27-05 | CI still runs validator when local hooks are bypassed | grep | `grep -n "python3 scripts/validate-rules.py all" .github/workflows/ci-gateway.yml` | ✅ | ⬜ pending |
| 27-05-01 | 05 | 3 | P27-NOW-SOFT-GATE-DEFAULTS | T-27-06 | Soft gate defaults to advisory enabled and disabled mode is no-op | fixture | `node .claude/hooks/<rule-hook>.js < /tmp/hook-payload.json` | ❌ W0 | ⬜ pending |
| 27-05-02 | 05 | 3 | P27-NOW-SUBAGENT-RULE-INJECTION | T-27-07 | Subagent helper emits only scoped rule context | fixture | `node scripts/<rule-context-helper>.mjs --files src/cli/index.ts` | ❌ W0 | ⬜ pending |
| 27-06-01 | 06 | 4 | P27-NOW-WORKFLOW-VALIDATION | T-27-08 | End-to-end QA proves pass, warn, block, unavailable, disabled, and bypass-backstop paths | e2e smoke | `bash scripts/<rule-control-qa>.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/capability-report.py` — capability baseline command for `P27-NOW-CAPABILITY-REPORT`.
- [ ] `scripts/validate-rules.py` — validator command used by hooks, CI, and report-only workflow checks.
- [ ] rule-context helper — deterministic file-path to rule-doc mapping for soft gate and subagent prompts.
- [ ] hook / git fixture harness — temporary repo path for pre-commit and commit-msg behavior checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Claude Code hook advisory rendering | P27-NOW-SOFT-GATE-DEFAULTS | Hook UI rendering depends on Claude runtime event injection | Trigger a Write/Edit in Claude Code and confirm advisory text appears without blocking |
| Real subagent prompt quality | P27-NOW-SUBAGENT-RULE-INJECTION | Automated helper can prove scoped context, but not subjective attention quality | Inspect spawned subagent prompt text or transcript for only relevant rule snippets |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing executable validation references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 120s.
- [ ] `nyquist_compliant: true` set in frontmatter after plan checker accepts coverage.

**Approval:** pending
