---
phase: 84
slug: ai-agent-hook-control-protocol
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-12
---

# Phase 84 — Security

> Per-phase security contract for AI-readable hook guardrails.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Git staged state -> hook protocol | Hook reads staged files, commit message, and repo config to decide whether a commit is allowed. | staged file list, commit first line, rule metadata |
| Hook protocol -> AI agent | Hook emits structured JSON that an agent may use to decide its next git action. | blocker status, resolution route, verify commands, attempt context |
| Template truth -> managed copies | Install-time assets mirror repo-owned templates into `.mycodemap/hooks`. | hook shell logic, protocol schema, rule docs refs |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-84-01 | Bypass | blocker remediation | mitigate | blocker paths explicitly avoid suggesting `--no-verify`; payload tests assert that staged-file-limit output never recommends bypassing the hook. Evidence: `src/cli/init/__tests__/hook-payloads.test.ts`. | closed |
| T-84-02 | Drift | template vs managed hook parity | mitigate | workflow unittest checks both `scripts/hooks/templates/*` and `.mycodemap/hooks/*` for the same protocol contract strings. Evidence: `scripts/tests/test_rule_control_workflow.py`. | closed |
| T-84-03 | Misconfiguration | project-specific test runner assumption | mitigate | pre-commit template keeps generic test-strategy fallbacks (`package-test`, `pytest`, `go test ./...`, `cargo test`) so other installed projects are not locked to `vitest`. Evidence: `scripts/tests/test_rule_control_workflow.py`. | closed |
| T-84-04 | Recovery loss | multi-attempt agent retry flow | mitigate | protocol carries `attempt_id`, `CODEMAP_AGENT_CONTEXT`, and structured resolutions/log references so agents can restore intent after a blocked commit. Evidence: `scripts/hooks/templates/pre-commit`, `scripts/hooks/templates/commit-msg`. | closed |

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-12 | 4 | 4 | 0 | codex |

## Sign-Off

- [x] All threats have a disposition.
- [x] No accepted-risk blocker remains open.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-05-12
