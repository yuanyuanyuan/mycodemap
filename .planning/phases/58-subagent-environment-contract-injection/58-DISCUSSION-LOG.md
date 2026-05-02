# Phase 58: Subagent Environment Contract Retrieval - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 58-subagent-environment-contract-injection
**Areas discussed:** Existing context handling, live verification freshness, seed-to-full-contract evolution, integration surface, dependency risk

---

## Existing Context Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Update it | Read existing context and update it with current decisions. | ✓ |
| View it | Summarize existing context before deciding whether to update. | |
| Skip | Leave existing context unchanged. | |

**User's choice:** Tool fallback defaulted to "Update it" because `request_user_input` is unavailable in Default mode and the user invoked `$gsd-discuss-phase 58`.
**Notes:** Existing `58-CONTEXT.md` was already present and marked ready for planning. The update path preserved its retrieval-over-injection direction.

---

## Live Verification Freshness

| Option | Description | Selected |
|--------|-------------|----------|
| Correct statuses | Re-check canonical external refs and update issue status language before planning. | ✓ |
| Keep prior summary | Leave the old issue-status summary unchanged and let researcher re-check later. | |
| Remove issue table | Drop status table and keep only high-level design conclusion. | |

**User's choice:** Tool fallback defaulted to "Correct statuses".
**Notes:** Live recheck found that the old "all 8 issues open" statement was no longer accurate. CONTEXT now records closed/open split and tells downstream agents to re-read canonical refs instead of trusting stale status summaries.

---

## Seed-To-Full-Contract Evolution

| Option | Description | Selected |
|--------|-------------|----------|
| Evolve existing seed | Upgrade Phase 55 `.mycodemap/env-contract.json` seed into full contract while preserving migration path. | ✓ |
| New writer | Add a separate Phase 58 writer and leave Phase 55 seed untouched. | |
| Rewrite from scratch | Replace the seed model entirely without compatibility expectations. | |

**User's choice:** Tool fallback defaulted to "Evolve existing seed".
**Notes:** This matches Phase 55's future-compatible seed boundary and minimizes duplicate state writers.

---

## Integration Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Interface contract first | Register `env-contract` as a public CLI command and let dynamic MCP registration expose it. | ✓ |
| Native MCP first | Add a hand-written native MCP tool immediately. | |
| CLI only | Skip MCP exposure for v1. | |

**User's choice:** Tool fallback defaulted to "Interface contract first".
**Notes:** Existing MCP server already dynamically registers interface-contract commands; a native MCP tool remains allowed only if generated tool ergonomics are insufficient.

---

## Dependency Risk

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit preflight | Keep Phase 58 context usable, but require planner to confirm Phase 57 state before implementation. | ✓ |
| Block discussion | Stop all Phase 58 context updates until Phase 57 is complete. | |
| Ignore dependency | Proceed as if dependency state is already resolved. | |

**User's choice:** Tool fallback defaulted to "Explicit preflight".
**Notes:** ROADMAP says Phase 58 depends on Phase 57, while STATE still shows Phase 57 ready_to_plan. CONTEXT now flags this for planner.

## the agent's Discretion

- Exact schema migration shape from `env-contract.seed.v1` to full Project Environment Contract.
- Exact generated MCP tool name if CLI command name contains a hyphen.
- Exact wording of assistant retrieval examples, provided they route to filtered `mycodemap env-contract --for <type> --json` or MCP retrieval.

## Deferred Ideas

- None added in this update. Existing deferred ideas in CONTEXT remain unchanged.
