# Phase 74: Env-contract Reminder Hook - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement `HOOK-02` as a `first-remind-then-silent` reminder hook that routes agents to the shipped Phase 58 `env-contract` retrieval surface before delegated work begins. This phase delivers: start-of-delegation reminder behavior, session-local silence semantics, role-aware retrieval reminders, and visible/actionable failure signaling when the retrieval surface is unavailable. It does NOT deliver: a new env-contract contract model, hidden prompt-rule fallback, global/persistent reminder memory, hard-block governance, or broader hook/security policy infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Trigger Boundary
- **D-01:** The reminder triggers only at **agent/subagent start** for delegated work, not on unrelated hook events in the same session.
- **D-02:** Codex and Claude should preserve the same behavior semantics, but may use runtime-specific equivalent hook implementations rather than forcing one identical event model.
- **D-03:** Reminder selection is **role-aware**: within a parent session, the first start for each delegated role may trigger its own reminder.

### Silence Scope
- **D-04:** `then-silent` is keyed by **parent session × agent role**.
- **D-05:** Within the same parent session, the first `worker` start reminds, later `worker` starts stay silent; a first `explore` or `verify` start may still remind once for that role.
- **D-06:** Silence state resets when the parent session ends; Phase 74 does not introduce cross-session or persistent memory.
- **D-07:** Silence keys should not split separately by runtime, to avoid Codex/Claude drift in the user-visible contract.

### Failure Visibility
- **D-08:** If the Phase 58 retrieval surface is unavailable, the hook must emit a **visible warning** with **exact actionable remediation**.
- **D-09:** Phase 74 must not silently fall back to hidden prompt snippets, cached rules, or implicit injected guidance.
- **D-10:** Retrieval failure should remain visible while delegated work continues; this phase does not hard-block agent/subagent start.

### Phase Boundary Reinforcement
- **D-11:** Phase 74 reuses the shipped Phase 58 `env-contract` retrieval surface; it must not reopen or redesign the underlying env-contract contract.
- **D-12:** Phase 74 locks behavior around reminders only; it must not expand into a new governance/control plane for hooks.

### the agent's Discretion
- Exact session-key plumbing and in-memory state shape, as long as user-visible semantics remain `parent session × role`.
- Exact reminder wording, as long as it points to the existing `env-contract` retrieval surface and remains clearly role-aware.
- Exact failure-message format and transport surface, as long as failures are visible, actionable, and testable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Authority
- `.planning/ROADMAP.md` — Phase 74 goal, dependency boundary, and success criteria
- `.planning/PROJECT.md` — active milestone scope, `HOOK-02`, and retrieval-led hook constraint

### Prior Phase Decisions
- `.planning/phases/58-subagent-environment-contract-injection/58-01-SUMMARY.md` — shipped Phase 58 baseline and why `env-contract` exists as the retrieval surface
- `docs/ideation/2026-05-04-subagent-hooks-deep-dive-ideation.md` — validated conclusion that injection paths are unreliable and retrieval-based reminder is the stable path

### Existing Retrieval Surfaces
- `src/cli/commands/env-contract.ts` — CLI flags, role-aware `--for <agentType>` retrieval, and existing hook/codex examples
- `src/cli/init/assistant-plan.ts` — generated assistant bootstrap examples that already point delegated work toward `env-contract`
- `src/cli/env-contract/index.ts` — exported env-contract subsystem surface
- `src/server/mcp/__tests__/env-contract-tool.test.ts` — test-backed env-contract retrieval behavior for MCP-facing use

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `env-contract` already exposes role-aware retrieval via `--for <agentType>`, so Phase 74 can remind per delegated role without inventing a new contract lookup path.
- `env-contract` already prints Claude/Codex-oriented examples, providing a strong precedent for runtime-equivalent behavior rather than one forced mechanism.
- Assistant bootstrap messaging already tells downstream agents to run `mycodemap env-contract --for ... --json` before delegated work.

### Established Patterns
- The validated pattern is `retrieval before delegated work`, not best-effort context injection.
- Existing project constraints prefer explicit failure over silent fallback; Phase 74 should preserve that posture for reminder failures too.
- The milestone is explicitly ordered on the `v2.5` mainline after Phases 70, 72, and 73; Phase 74 should stay narrow and avoid reopening adjacent deep-analysis or topology decisions.

### Integration Points
- Runtime hook integration points that observe delegated agent/subagent start
- Role-aware `env-contract` lookup path in `src/cli/commands/env-contract.ts`
- Assistant bootstrap/generated examples in `src/cli/init/assistant-plan.ts`
- Existing env-contract MCP/CLI proof surfaces used to validate reminder output

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose **delegated agent/subagent start only** as the reminder trigger boundary.
- The user explicitly chose **runtime-equivalent semantics** rather than forcing identical Codex/Claude hook mechanics.
- The user explicitly chose **per-role first reminder within a parent session** rather than one global reminder or repeated reminders on every start.
- The user explicitly chose **visible warning + exact remediation + continue**, not silent fallback and not hard-blocking delegated work.

</specifics>

<deferred>
## Deferred Ideas

- Expanding reminders to unrelated hook events beyond delegated start
- Cross-session or persistent reminder memory
- Hidden fallback rule injection, prompt snippets, or cached governance text
- Hard-blocking delegated work when retrieval is unavailable
- Any redesign of the Phase 58 env-contract contract or broader hook policy framework

</deferred>

---

*Phase: 74-env-contract-reminder-hook*
*Context gathered: 2026-05-10*
