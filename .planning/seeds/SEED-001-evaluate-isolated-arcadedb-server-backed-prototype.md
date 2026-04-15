---
id: SEED-001
status: dormant
planted: 2026-03-28
planted_during: post-v1.4 milestone archive
trigger_when: A future milestone explicitly needs server-backed graph storage evidence and is willing to approve remote config, auth, TLS, lifecycle, and docs/runtime changes for an isolated ArcadeDB prototype
scope: Large
---

# SEED-001: Evaluate isolated ArcadeDB server-backed prototype

## Why This Matters

`Phase 21` already disproved the weak premise that ArcadeDB could be treated as a direct embedded-style successor to the current local-first KuzuDB path.

That does not mean all ArcadeDB exploration is worthless. It means the only honest continuation is an isolated server-backed prototype with real live-smoke evidence, explicit approval for remote-product-surface changes, and zero assumption that `storage.type = arcadedb` should ship.

Without this seed, the next milestone risks repeating one of two bad patterns:

- forgetting the only conditional path that survived `Phase 21`
- reopening the old "just build the adapter first" mistake that `Phase 21` already rejected

## When to Surface

**Trigger:** A future milestone explicitly needs server-backed graph storage evidence and is willing to approve remote config, auth, TLS, lifecycle, and docs/runtime changes for an isolated ArcadeDB prototype.

This seed should be presented during `$gsd-new-milestone` when the milestone scope matches any of these conditions:

- a future roadmap discussion explicitly asks for server-backed graph storage evaluation rather than local-path storage only
- KuzuDB replacement pressure returns and the team is willing to approve remote connection semantics as product-surface changes
- a real ArcadeDB server is available for live smoke, and the milestone is willing to treat `handshake latency`, `query latency`, and `setup complexity` as first-class evidence gates

## Scope Estimate

**Large** — likely a full milestone, not a quick phase.

Reason:

- it needs real server provisioning and credential handling
- it needs isolated prototype boundaries so shipped runtime code stays untouched
- it needs approval for config, auth, TLS, setup guidance, and docs truth changes before any productization discussion
- it needs fresh validation and benchmark evidence, not just reuse of the offline harness

## Breadcrumbs

Related code and decisions found in the current codebase:

- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-EVALUATION-REPORT.md` — direct replacement `NO-GO`, isolated follow-up only
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-NEXT-STEPS.md` — suggested follow-up name, accepted/rejected paths, explicit non-goals
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md` — live-smoke preconditions, benchmark dimensions, stop conditions
- `.planning/milestones/post-v1.4-MILESTONE-AUDIT.md` — confirms the deferred live-smoke debt is non-blocking now but mandatory for any continuation
- `scripts/experiments/arcadedb-http-smoke.mjs` — isolated smoke harness contract kept outside shipped runtime code
- `src/interface/types/storage.ts` — current storage surface has no remote/server-backed config fields
- `src/infrastructure/storage/StorageFactory.ts` — current runtime only supports `filesystem`, `memory`, `kuzudb`, plus `auto`

## Notes

- Do not reopen `storage.type = arcadedb` as an active task without a new approved milestone.
- Treat remote config, auth, TLS, lifecycle, and setup guidance as product-surface changes, not adapter internals.
- This seed preserves the only conditional continuation that survived `Phase 21`; it does not overturn the current direct replacement `NO-GO`.
