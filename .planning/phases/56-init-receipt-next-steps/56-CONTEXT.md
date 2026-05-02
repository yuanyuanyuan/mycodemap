# Phase 56: Init Receipt + Next Steps - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 56 completes the init experience with clear receipt reporting that distinguishes main-agent setup from subagent setup, safe team-owned file handling, and synchronized documentation.

In scope:
- Init receipt displays two sections: Main Agent and Subagent, each with paths and action guidance.
- Receipt reports agent context connection status: generated snippets, manual references needed, already-synced detection.
- After init, displays personalized next steps based on receipt (not fixed three-step welcome).
- Setup docs (README, SETUP_GUIDE, AI_ASSISTANT_SETUP) describe unified flow: install → init → doctor → generate → connect agent.

Out of scope:
- Automatically rewriting project-root CLAUDE.md, AGENTS.md, .claude/settings.json, or Codex agent config files.
- Implementing Phase 58's full env-contract discovery engine, role filtering, conflict detection, or doctor integration.
- Runtime/session CLI-first enforcement or subagent compliance auditing.
- Deep command inference from README, CI workflows, Makefile, or arbitrary docs.

</domain>

<decisions>
## Implementation Decisions

### Receipt Two-Section Layout

- **D-01:** Init receipt displays two distinct sections: **Main Agent** and **Subagent**.
- **D-02:** **Main Agent section** reports:
  - Paths to generated context files: `claude-context.md`, `agents-context.md`
  - Merge instructions: "Review and manually merge into project-root CLAUDE.md / AGENTS.md"
  - Does NOT auto-rewrite team-owned files.
- **D-03:** **Subagent section** reports:
  - Path to `env-contract.json` generation status
  - Paths to adapter config examples: `claude-hook-example.json`, `codex-agent-example.toml`
  - Copy instructions: "Copy configs into platform settings (.claude/settings.json, .codex/agents/)"
- **D-04:** Each section clearly distinguishes what was installed vs what needs manual action.

### Personalized Next Steps

- **D-05:** Next steps are dynamically generated based on actual installed assets, not a fixed template.
- **D-06:** Priority order for next steps computation:
  1. Conflict steps (highest priority) — from assets with `conflict` status
  2. Manual action steps — from assets with `manual-action-needed` status
  3. Installed asset usage guidance — for newly installed assistant/env-contract assets
  4. Default recommended steps — `mycodemap generate`, `mycodemap doctor` (lowest priority)
- **D-07:** Each next step is specific to the installed asset, not generic. Example: "Review .mycodemap/assistants/claude-context.md and merge into CLAUDE.md" rather than "Check your assistant files."
- **D-08:** If multiple manual actions exist, display them all but limit to top 3 to avoid information overload.

### Already-Synced Detection

- **D-09:** Detect already-synced state by checking file content of CLAUDE.md/AGENTS.md for `.mycodemap/` path references.
- **D-10:** Detection logic:
  - Read CLAUDE.md content, check if it contains `.mycodemap/` path references
  - Read AGENTS.md content, check if it contains `.mycodemap/` path references
  - If references found → status: `already-synced`
  - If no references → status: `manual-action-needed` with copy-paste snippet
- **D-11:** Detection is case-insensitive for path matching and handles both relative and absolute paths.
- **D-12:** If CLAUDE.md or AGENTS.md does not exist, status is `manual-action-needed` with creation guidance.

### Setup Doc Synchronization

- **D-13:** Three docs need updating to describe the unified flow:
  1. **README.md** — Quick start section: install → init → preview → connect agent
  2. **docs/SETUP_GUIDE.md** — Detailed setup steps with init receipt explanation
  3. **docs/AI_ASSISTANT_SETUP.md** — Agent-specific connection guide with main-agent and subagent sections
- **D-14:** Unified flow described in all three docs: install → init → doctor → generate → connect agent (main agent via entry docs, subagent via retrieval).
- **D-15:** Docs should reference the new two-section receipt and explain what each section means.

### Agent's Discretion

- Exact TypeScript module layout for receipt enhancement is a planner choice.
- Exact wording of receipt sections and next steps is planner discretion as long as they follow D-01 through D-08.
- Whether to add a new `buildPersonalizedNextSteps()` function or modify existing `buildNextSteps()` is a planner choice.
- Exact detection regex for `.mycodemap/` references in team files is planner discretion.
- Doc update scope and wording is planner discretion as long as the unified flow is described.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope

- `.planning/ROADMAP.md` — Phase 56 goal, success criteria, and requirements.
- `.planning/REQUIREMENTS.md` — ABT-03, ABT-04, INI-02, INI-03.
- `.planning/PROJECT.md` — v2.1 onboarding milestone vision and no automatic team-owned file rewrite boundary.
- `.planning/STATE.md` — current v2.1 progress and prior decisions.

### Prior Phase Context

- `.planning/phases/55-agent-bootstrap-assets/55-CONTEXT.md` — Phase 55 decisions: assistant assets, env-contract seed, --assistant-profile flag, InitAsset model.
- `.planning/phases/53-bootstrap-profiles-project-detection/53-CONTEXT.md` — Phase 53 decisions: InitReceipt model, InitAssetStatus enum, preview/apply modes.
- `.planning/phases/54-zero-config-preview/54-CONTEXT.md` — Phase 54 decisions: zero-config preview separation from init receipt.

### Existing Init Implementation

- `src/cli/commands/init.ts` — current init command implementation; renders preview/receipt.
- `src/cli/init/reconciler.ts` — `InitAsset`, `InitReceipt`, `createInitPlan`, `applyInitPlan`, `writeInitReceipt`, `buildNextSteps()`.
- `src/cli/init/receipt.ts` — `renderInitPreview`, `renderInitReceipt`; handles `already-synced` and `manual-action-needed` status rendering.
- `src/cli/init/assistant-plan.ts` — Phase 55 assistant asset planning; generates `claude-context.md`, `agents-context.md`, `claude-hook-example.json`, `codex-agent-example.toml`.
- `src/cli/init/rules.ts` — existing AI context rules snippet pattern and no-auto-rewrite behavior.
- `src/cli/init/hooks.ts` — hook payload/shim reconciliation and ownership handling.

### Docs to Update

- `README.md` — Quick start section needs unified flow.
- `docs/SETUP_GUIDE.md` — Detailed setup steps need init receipt explanation.
- `docs/AI_ASSISTANT_SETUP.md` — Agent connection guide needs main-agent and subagent sections.

### Existing Tests

- `src/cli/commands/__tests__/init-command.test.ts` — fresh init, migration, legacy drift, idempotency, and preview tests.
- `src/cli/commands/__tests__/init-rules.test.ts` — no-auto-rewrite and manual AI context snippet behavior.
- `src/cli/commands/__tests__/init-profile.test.ts` — project profile detection/apply/preview/refusal behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `InitAsset` / `InitReceipt` already represent install state, ownership, details, hashes, rollback hints, manual actions, summary counts, and next steps. Phase 56 enhances these models.
- `buildNextSteps()` in `src/cli/init/reconciler.ts:513` currently returns fixed three-step welcome or manual-action steps. Needs upgrade to personalized logic.
- `renderInitReceipt()` in `src/cli/init/receipt.ts:118` already handles `already-synced` and `manual-action-needed` status rendering. Can be extended for two-section layout.
- `assistant-plan.ts` already generates assistant assets with proper `InitAsset` status. Phase 56 receipt just needs to report them clearly.

### Established Patterns

- Preview is default; apply requires `-y/--yes`.
- Tool-owned files under `.mycodemap/` may be written by init in apply mode.
- Team-owned files such as `CLAUDE.md` and `AGENTS.md` are never silently rewritten.
- Receipt output is the truth source for installed, skipped, already-synced, conflict, and manual-action-needed states.
- Public CLI changes require commander registration, interface-contract sync, docs sync, and focused tests.

### Integration Points

- Enhance `buildNextSteps()` in `src/cli/init/reconciler.ts` to compute personalized steps from assets.
- Enhance `renderInitReceipt()` in `src/cli/init/receipt.ts` to display two-section layout.
- Add `.mycodemap/` reference detection logic for CLAUDE.md/AGENTS.md content checking.
- Update three docs: README.md, docs/SETUP_GUIDE.md, docs/AI_ASSISTANT_SETUP.md.
- Add tests for personalized next steps, two-section receipt, and already-synced detection.

</code_context>

<specifics>
## Specific Ideas

Receipt two-section layout example:

```
## Init Receipt

### Main Agent
- claude-context.md → Review and merge into project-root CLAUDE.md
- agents-context.md → Review and merge into project-root AGENTS.md

### Subagent
- env-contract.json → Generated (project environment contract)
- claude-hook-example.json → Copy to .claude/settings.json
- codex-agent-example.toml → Copy to .codex/agents/

### Next Steps
1. Review .mycodemap/assistants/claude-context.md and merge into CLAUDE.md
2. Run mycodemap doctor to verify setup
3. Run mycodemap generate to create code map
```

Already-synced detection:
- Check if CLAUDE.md contains string `.mycodemap/` (case-insensitive)
- Check if AGENTS.md contains string `.mycodemap/` (case-insensitive)
- If found → mark as `already-synced` in receipt
- If not found → mark as `manual-action-needed` with copy-paste snippet

</specifics>

<deferred>
## Deferred Ideas

- Full env-contract discovery across hooks, docs, CI, Makefile, AGENTS.md, and rules docs belongs to Phase 58.
- `mycodemap env-contract --for <agent-type>`, `--as-hook-config`, `--as-codex-agent`, `--check`, and doctor conflict detection belong to Phase 58.
- Automatic platform config mutation for `.claude/settings.json` or `.codex/agents/*.toml` remains out of scope unless a future phase introduces explicit opt-in write mode.
- Runtime/session enforcement that subagents actually retrieved project rules remains out of scope for this phase.

</deferred>

---

*Phase: 56-init-receipt-next-steps*
*Context gathered: 2026-05-02*
*Mode: discuss (default)*
