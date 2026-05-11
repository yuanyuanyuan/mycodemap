# Phase 74: Env-contract Reminder Hook - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 74-env-contract-reminder-hook
**Areas discussed:** Trigger boundary, Silence scope, Failure visibility

---

## Trigger boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Delegated start only | Trigger only when a new agent/subagent starts delegated work | ✓ |
| All matching hook events | Trigger on broader hook activity inside the session | |
| Every start event | Remind every time and suppress later elsewhere | |

**User's choice:** Delegated start only
**Notes:** Keep the reminder attached to the real retrieval moment: before delegated work begins. Do not widen Phase 74 into a noisy all-hooks reminder layer.

---

## Silence scope

| Option | Description | Selected |
|--------|-------------|----------|
| Parent session only once | One reminder total for the whole parent session | |
| Parent session × role | First start for each delegated role reminds once, then stays silent | ✓ |
| Runtime × role | Split silence separately by runtime and role | |

**User's choice:** Parent session × role
**Notes:** This matches the existing role-aware `env-contract --for <agentType>` retrieval contract and avoids runtime-specific semantic drift.

---

## Failure visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Warning + remediation + continue | Show a visible warning, give exact remediation, continue delegated flow | ✓ |
| Warning but vague continuation | Warn without exact next step | |
| Hard block | Stop delegated flow until retrieval becomes available | |

**User's choice:** Warning + remediation + continue
**Notes:** Failure must be visible and actionable, but Phase 74 should not expand into a hard-block governance gate. Hidden fallback remains disallowed.

---

## the agent's Discretion

- Exact wording and transport shape of the reminder, as long as it stays retrieval-led and role-aware
- Exact in-memory/session bookkeeping used to implement `parent session × role` silence
- Exact visible failure marker and remediation phrasing, as long as tests can prove it appears

## Deferred Ideas

- Triggering on non-delegated hook events
- Cross-session persistence of reminder state
- Hard-block behavior when retrieval is unavailable
- Any redesign of the underlying Phase 58 env-contract contract
