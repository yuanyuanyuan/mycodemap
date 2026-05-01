# Phase 51: Post-Install Agent Bootstrap Configuration - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 51 delivers the post-install initialization experience for new `mycodemap` users. After a user installs the package and runs `mycodemap init`, the project should have a coherent `.mycodemap/` workspace, canonical config, hooks/rules assets, status receipt, and agent-context snippets for Claude/Codex-style assistants.

This phase is not a runtime/session enforcement phase. Phase 52 owns the separate CLI-first compliance guard/auditor work.

In scope:
- Improve `mycodemap init` post-install bootstrap behavior and receipt clarity.
- Ensure generated rules/context snippets make the initialized assets easy to reference from Claude, Codex, and generic assistant entry files.
- Keep `CLAUDE.md` / `AGENTS.md` safe by default: no silent rewrites of team-owned files.
- Align CLI contract, help, setup docs, and verification with the same init flow.
- Verify with real temp projects and subprocess execution.

Out of scope:
- Runtime/session enforcement of CLI-first behavior; this belongs to Phase 52.
- Hard-blocking live Claude/Codex sessions globally.
- Automatically rewriting user-owned or team-owned `CLAUDE.md` / `AGENTS.md` by default.
- Building a full external installer or package-manager wizard.
- Replacing existing `doctor`, `generate`, MCP gateway, or repo-analyzer skill surfaces.

</domain>

<decisions>
## Implementation Decisions

### Scope Split
- **D-01:** Keep Phase 51 focused on post-install bootstrap. Move runtime/session CLI-first compliance guard work to Phase 52.
- **D-02:** Phase 51 should make `mycodemap init` the main delivery surface for new-user configuration, rules, and agent setup guidance.

### Agent Context Bootstrap
- **D-03:** Generated assets must include Claude/Codex/generic assistant snippets that tell users how to reference `.mycodemap/` assets.
- **D-04:** Generated snippets may point to CLI-first guidance, but this phase should not implement a runtime compliance detector.
- **D-05:** Claude and Codex should be first-class targets for snippets or profiles because the audit evidence came from those runtimes. A generic assistant profile can remain available.

### Team-Owned File Safety
- **D-06:** Do not silently edit `CLAUDE.md` or `AGENTS.md` by default. Continue the existing pattern of `manual-action-needed`, copy-paste snippets, already-synced detection, and conflict reporting.
- **D-07:** If implementation adds an explicit opt-in write mode later, it must be separate from default init and clearly visible in the receipt.

### Receipt and Contract Truth
- **D-08:** The machine-readable init receipt is the truth source for what was installed, skipped, already synced, or needs manual action.
- **D-09:** The interface contract and actual command behavior must match. Current context indicates `init` has a `--json` contract entry, but the command options and renderer do not yet expose JSON receipt output consistently.

### Verification
- **D-10:** Tests must use real temp directories and real filesystem writes for fresh init, rerun idempotency, drift/conflict, and snippet detection.
- **D-11:** At least one verification path must invoke the built CLI through a subprocess, not only call TypeScript functions in-process.

### Agent's Discretion
- Exact flag shape for profiles is open to planning. Acceptable directions include `--profile claude|codex|generic`, richer receipt sections, or generated snippet files under `.mycodemap/assistants/`.
- Exact filename/category for assistant snippets is open, but generated assets must be discoverable from the receipt and not buried in unrelated validation prose.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 51 goal and success criteria.
- `.planning/STATE.md` — roadmap evolution and context session note.
- `docs/brainstorms/999.1-mycodemap-init-enhancements-requirements.md` — prior requirements for `mycodemap init` as a project-state reconciler.
- `docs/archive/ideation/2026-04-20-mycodemap-init-enhancements-ideation-archive.md` — prior implemented ideation around rules bundle, AI context snippets, and no automatic `CLAUDE.md` / `AGENTS.md` rewrite.

### Existing Init Implementation
- `src/cli/commands/init.ts` — current command entry; preview by default, apply with `--yes`.
- `src/cli/init/reconciler.ts` — init scan, asset model, receipt, workspace/config/status convergence.
- `src/cli/init/rules.ts` — rules bundle generation, drift detection, AI context snippet status.
- `src/cli/init/rule-templates.ts` — built-in rule templates and `mycodemap-rules-bundle` snippet.
- `src/cli/init/hooks.ts` — hook payload and shim reconciliation.
- `src/cli/init/receipt.ts` — human preview and receipt rendering.
- `src/cli/interface-contract/commands/init.ts` — schema contract for `init`, including current `--json` contract.
- `src/cli/first-run-guide.ts` — current first-run guide.

### Existing Tests
- `src/cli/commands/__tests__/init-command.test.ts` — fresh init, migration, legacy drift, idempotency, preview tests.
- `src/cli/commands/__tests__/init-rules.test.ts` — rules bundle, drift, manual snippet, already-synced tests.
- `src/cli/__tests__/first-run-guide.test.ts` — first-run guide expectations.

### Docs and Public Setup Surface
- `README.md` — quick start and `mycodemap init` command docs.
- `docs/SETUP_GUIDE.md` — human setup flow and init behavior.
- `docs/AI_ASSISTANT_SETUP.md` — AI assistant setup flow and current manual rules instructions.
- `docs/ai-guide/COMMANDS.md` — command reference for `init`.
- `AI_GUIDE.md` — AI-facing CLI usage map.

### Governance Inputs
- `AGENTS.md` Section 6 — repository-local CodeMap CLI-first retrieval rule; Phase 51 may link/reference it, while Phase 52 owns machine-checkable enforcement.
- `CLAUDE.md` — router pattern for keeping policy text out of adapter docs.
- `docs/rules/harness.md` — report-only-first philosophy if a future guard is added.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createInitPlan` / `applyInitPlan` already model initialization as a reconciliation plan with asset statuses.
- `InitAsset.status` already supports `manual-action-needed`, `conflict`, `already-synced`, `installed`, and `skipped`.
- `createRulesPlan` already writes generic built-in rule files and emits a copy-paste AI context snippet.
- `createHookPlan` already treats hook payloads and user-owned shims separately.
- Existing tests already use temp projects and real filesystem assertions.

### Established Patterns
- Preview is default; `-y/--yes` applies changes.
- Tool-owned files under `.mycodemap/` may be written by init.
- Team-owned files such as `CLAUDE.md` and `AGENTS.md` are detected, but not rewritten by default.
- Drift is reported with details instead of being overwritten silently.
- Receipt output is the operator-facing explanation of what happened and what still needs manual action.

### Integration Points
- `src/cli/commands/init.ts` for command options and output mode.
- `src/cli/init/rule-templates.ts` / `rules.ts` for generated rules and assistant snippets.
- `src/cli/interface-contract/commands/init.ts` for schema/help/MCP-visible contract alignment.
- `docs/AI_ASSISTANT_SETUP.md`, `docs/SETUP_GUIDE.md`, `README.md`, and `docs/ai-guide/COMMANDS.md` for docs synchronization.
- `src/cli/doctor/check-workspace-drift.ts` for post-init drift visibility.

### Current Gaps
- Generated rules are generic commit/test/lint/docs/validation guidance; they do not currently provide a complete assistant bootstrap package for Claude/Codex/generic users.
- `init` contract advertises `--json`, but current command entry does not expose JSON receipt output through `InitCommandOptions`.
- First-run guide currently points to `init`, `generate`, and `--help`, but does not surface agent context, rules snippet, or doctor verification.
- Setup docs still require users to manually assemble several post-install steps, which is exactly what init should reduce.

</code_context>

<specifics>
## Specific Ideas

- Generate per-runtime include snippets for Codex `AGENTS.md` and Claude `CLAUDE.md`, while preserving the no-auto-rewrite default.
- Consider writing assistant-ready files under `.mycodemap/assistants/` or `.mycodemap/rules/agent/` so the receipt can point users to stable local artifacts.
- Make `mycodemap init --json` return the real `InitReceipt`, or remove/adjust the contract if JSON output is intentionally not supported.
- Update the first-run and setup docs so the new path is install, init preview/apply, doctor, generate, then agent context connection.

</specifics>

<deferred>
## Deferred Ideas

- CLI-first runtime/session guard or auditor for non-compliant `rg` / `grep` / `find` usage → Phase 52.
- Automatic modification of team-owned context files without a separate explicit opt-in.
- Full MCP server setup automation beyond surfacing the existing schema-driven gateway setup.
- Deep multi-agent session audit tooling for all runtimes.

</deferred>

---

*Phase: 51-post-install-agent-bootstrap-configuration*
*Context gathered: 2026-05-01*
