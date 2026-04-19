# Phase 27 Research: repo-local rule control system + hooks / CI / QA coverage

**Status:** Ready for planning  
**Generated:** 2026-04-19  
**Mode:** fallback orchestrator research after `gsd-phase-researcher` timeout  

## Scope

Phase 27 should turn the external rule-control plan into repo-local, testable work. The roadmap requires coverage for:

- `P27-NOW-CAPABILITY-REPORT`
- `P27-NOW-VALIDATE-RULES`
- `P27-NOW-HOOKS-CI-QA`
- `P27-NOW-SOFT-GATE-DEFAULTS`
- `P27-NOW-SUBAGENT-RULE-INJECTION`
- `P27-NOW-WORKFLOW-VALIDATION`
- `P27-NOW-NO-VERIFY-BACKSTOP`

Primary planning inputs:

- `/home/stark/.claude/plans/harness-claude-openai-github-openharness-parallel-alpaca.md`
- `/home/stark/.gstack/projects/codemap/stark-main-eng-review-test-plan-20260418-200710.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

No `27-CONTEXT.md` exists. Treat the roadmap goal, main plan, and QA checklist as the phase boundary.

## Current repo facts

### Existing entry contracts

- `CLAUDE.md` is already a short execution manual with T0/T1/T2 progressive loading, rule routing, validation shortcuts, and delivery checklist.
- It does not currently require a repo-local `scripts/validate-rules.py --report-only` check after every Edit/Write.
- It does not currently state that rule files must be selected by edited file path even when the model omits the task-analysis format.

### Existing git hooks

- `.githooks/pre-commit` already runs changed-file tests, staged file count checks, TS header checks, docs guardrails for relevant files, and background AI-feed generation.
- `.githooks/commit-msg` currently validates commit message format and also repeats commit file-count enforcement.
- The QA checklist expects commit-msg to remain format-only after file-count logic moves out, so current repo state has a responsibility split drift that Phase 27 should resolve deliberately.

### Existing CI backstop

- `.github/workflows/ci-gateway.yml` already runs docs check, typecheck, lint, tests, build, calibrated contract checks, docs sync, commit format, commit size, file headers, AI feed generation, risk assessment, and output contract checks.
- There is no `scripts/validate-rules.py` or `scripts/capability-report.py` in the repo today.
- CodeMap CLI search returned zero matches for `validate-rules`, `gsd-workflow-guard`, and `check-commit-size`; fallback grep found only policy mentions for `--no-verify`, confirming the new rule-control scripts are not implemented yet.

### Existing Claude hook surface

- The repo already contains `.claude/settings.json` with repo-local hooks for `SessionStart`, `PreToolUse`, `PostToolUse`, and `statusLine`.
- `.claude/hooks/gsd-workflow-guard.js` is an advisory PreToolUse guard for Write/Edit, but it is currently opt-in via `.planning/config.json` `hooks.workflow_guard`.
- `.planning/config.json` currently enables only `hooks.context_warnings`; it does not enable workflow guard or a rule-control-specific soft gate.
- Existing `.claude/hooks/gsd-read-guard.js`, `gsd-prompt-guard.js`, `gsd-workflow-guard.js`, `gsd-phase-boundary.sh`, and `gsd-validate-commit.sh` establish a pattern: hooks should be advisory unless explicitly meant to block, should fail closed only where stated, and should not rely on machine-global `~/.claude` state.

## Main-plan adjustments needed

The external plan is directionally useful but needs adaptation to current repo truth:

1. **Not from zero:** The repo already has `.claude/hooks` and `.claude/settings.json`; Phase 27 should extend or wrap these rather than inventing an unrelated hook system.
2. **No global machine state:** Keep all new files under repo paths such as `scripts/`, `.githooks/`, `.github/workflows/`, `.claude/`, `docs/rules/`, and planning artifacts. Do not write to `/home/stark/.claude`.
3. **Commit-msg drift:** The plan says commit-msg should be format-only; current commit-msg also enforces file count. The implementation plan must explicitly move or preserve this responsibility with docs/tests, not leave it ambiguous.
4. **Soft gate defaults:** The external plan’s later correction says `enabled: true` and at least `change_analyzer: true` by default. Phase 27 should encode that default and verify disabled mode is a no-op.
5. **Edit/Write verification:** The main gap is not just a validation script; it is a verifiable workflow path proving the agent ran or was reminded to run `scripts/validate-rules.py --report-only` after edits.
6. **Subagent injection:** There is no automatic cross-runtime universal subagent context injection. The minimal viable path should be a deterministic rule-context helper plus updates to GSD/agent prompt surfaces that spawn subagents, with tests proving the helper returns scoped rule references.
7. **`--no-verify` backstop:** Git hooks cannot prevent `--no-verify`. The CI workflow must independently run the rule validation command so bypassed local hooks still fail remotely.

## Recommended plan split

### Plan 27-01 — Capability report baseline

Build `scripts/capability-report.py` and a committed report contract, without blocking commits.

Recommended files:

- `scripts/capability-report.py`
- `scripts/capability-report.json` only if the project wants a tracked latest report; otherwise write reports to `/tmp` during tests and document manual generation
- focused test/smoke command using Python standard library and temporary output path

Acceptance focus:

- Detect `python3`, `node`, `git config core.hooksPath`, and timing for `npm run typecheck`, `npm test`, `npm run lint`.
- Missing optional CLI build should produce `OPTIONAL_DISABLED` / optional failure, not a false pass.
- Required failures should be visible in JSON but the report command itself should be usable in report-only planning.

### Plan 27-02 — Repo-local rule validator

Build `scripts/validate-rules.py` with explicit report-only and gate modes.

Recommended files:

- `scripts/validate-rules.py`
- script-level tests using Python `unittest` or shell fixtures that do not require new dependencies
- `docs/rules/validation.md` updates for exit semantics

Acceptance focus:

- `--report-only` always exits 0 and prints JSON plus summary.
- Gate mode uses stable exit codes: pass, P0 blocked, P1 warning, P2 notice, dependency unavailable.
- The script uses existing project commands (`npm run typecheck`, `npm run lint`, `npm test`) rather than ad-hoc `npx eslint --rule` invocations.
- Dependency-missing cases return a distinct unavailable result and never print `SKIP` as a pass.

### Plan 27-03 — Entry docs and executable rule contracts

Update `CLAUDE.md` and `docs/rules/*` so the rule system is discoverable and path-driven.

Recommended files:

- `CLAUDE.md`
- `docs/rules/validation.md`
- `docs/rules/code-quality-redlines.md`
- `docs/rules/architecture-guardrails.md`
- `docs/rules/README.md` if it does not exist
- `docs/rules/engineering-with-codex-openai.md` if commit / `--no-verify` semantics change

Acceptance focus:

- `CLAUDE.md` states that edited file paths, not only the task-analysis template, determine which rule files load.
- `CLAUDE.md` states the post-edit report-only validation expectation.
- Rule docs include command, threshold/severity, failure behavior, and recovery path.
- Docs stay short enough to preserve progressive loading rather than duplicating AGENTS.md.

### Plan 27-04 — Hooks and CI hard backstop

Wire validation into `.githooks/pre-commit` and `.github/workflows/ci-gateway.yml`, and resolve commit-msg responsibility drift.

Recommended files:

- `.githooks/pre-commit`
- `.githooks/commit-msg`
- `.github/workflows/ci-gateway.yml`
- docs/rules validation or engineering docs if semantics change
- focused hook fixture tests or shell smoke scripts using a temporary git repo

Acceptance focus:

- Pre-commit calls `python3 scripts/validate-rules.py code` only after report-only readiness criteria are satisfied or behind a clear report-only/hard-gate toggle.
- P0 blocks commits; P1/P2 warn-only if that is the selected policy.
- CI runs `python3 scripts/validate-rules.py all`, so `git commit --no-verify` cannot bypass the final gate.
- Commit-msg either becomes format-only as QA expects, or the plan explicitly documents why file count remains there. Do not leave duplicate file-count enforcement unexplained.

### Plan 27-05 — Soft gate defaults and subagent rule injection

Implement minimal advisory rule routing around existing `.claude/hooks` and provide a reusable scoped-rule context helper for subagent prompts.

Recommended files:

- `.claude/rule-system.config.json`
- `.claude/settings.json`
- `.claude/hooks/*` new or extended rule-control hook(s)
- `scripts/rule-context.*` or equivalent helper
- targeted docs describing parent-agent injection responsibilities

Acceptance focus:

- Default config has `enabled: true` and at least `change_analyzer: true`.
- Disabled config produces no advisory output.
- Write/Edit paths are mapped to the intended 1-2 rule files, matching `CLAUDE.md` routing.
- Subagent prompt helper returns only scoped rule context, not every rule file.
- Advisory hooks do not block Edit/Write and do not depend on global `~/.claude`.

### Plan 27-06 — Workflow validation and QA matrix

Close the test-plan gaps with executable smoke paths.

Recommended files:

- a QA script under `scripts/` or `tests/fixtures/`
- `docs/rules/validation.md`
- planning summary / generated verification notes after execution

Acceptance focus:

- Healthy capability report path.
- P0 violation path blocks.
- P1/P2 warning path allows the local action but is visible.
- Missing dependency path is explicit.
- CI backstop path is documented and testable.
- Subagent scoped-rule injection path has a fixture or deterministic command output.

## Suggested waves

| Wave | Plans | Rationale |
|------|-------|-----------|
| 1 | 27-01, 27-02 | Baseline and validator can be implemented in parallel but 27-02 should read 27-01 results before hard-gate policy decisions. |
| 2 | 27-03 | Docs should lock the rule contract before hooks/CI make it operational. |
| 3 | 27-04, 27-05 | Hooks/CI and soft-gate/subagent paths can proceed in parallel once the validator and docs exist. |
| 4 | 27-06 | End-to-end QA should run after all executable surfaces exist. |

## Validation Architecture

Phase 27 needs validation at four layers:

1. **Script contract tests:** run `python3 scripts/capability-report.py --help` or equivalent smoke, `python3 scripts/validate-rules.py all --report-only`, and targeted fixture tests for exit-code semantics.
2. **Hook tests:** use a temporary git repo or fixture to prove pre-commit blocks P0 and commit-msg responsibility is as documented.
3. **CI static verification:** grep `.github/workflows/ci-gateway.yml` for `python3 scripts/validate-rules.py all` and ensure warn-only vs blocking behavior is explicit.
4. **Agent workflow simulation:** use a deterministic file-path-to-rule-context command to prove `src/cli/*`, `docs/*`, `.githooks/*`, and test files map to the intended rule docs, and that subagent context includes only scoped rules.

Failure rehearsals to require in PLAN.md:

- Missing `dist/cli/index.js` for architecture checks returns unavailable, not pass.
- P0 validator failure blocks local commit and CI.
- `--report-only` with P0 findings exits 0 but reports findings.
- `--no-verify` bypasses local hooks but CI still runs the validator.
- Soft gate disabled config emits no advisory.
- Subagent injection helper excludes unrelated rules.

## Risks for planner

- Keep each plan under the repo commit-size constraints; split docs, scripts, hooks, and QA into separate plans if the file count grows.
- Avoid modifying global `/home/stark/.claude` files. Repo-local `.claude/*` is in scope because it is already present in the repository.
- Do not weaken existing hooks or CI to make the new validator pass. If the new validator reveals existing P0 issues, keep report-only until remediation is explicitly planned.
- Do not rely on agent self-report as validation evidence. Each acceptance criterion should be grep-, command-, or fixture-verifiable.
- Because Phase 27 changes workflow and hooks, include docs synchronization and failure-mode verification in the same phase rather than deferring them.
