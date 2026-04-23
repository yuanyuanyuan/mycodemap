# Phase 31: Release governance contract - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Source:** `/home/stark/.claude/plans/ticklish-sprouting-church.md`

<domain>

## Phase Boundary

Phase 31 defines the documentation contract and routing surface for `/release`.
It does not implement the Claude release skill, and it does not execute any version bump, tag, push, npm publish, or GitHub Release.

This phase turns the user-approved release proposal into authoritative live docs:

- `docs/rules/release.md` is the single workflow source of truth
- `docs/rules/deployment.md` and `docs/rules/pre-release-checklist.md` describe release binding and readiness checks
- `docs/rules/README.md`, `AGENTS.md`, and `CLAUDE.md` route readers to `docs/rules/release.md`

</domain>

<decisions>

## Implementation Decisions

### Release Binding

- Every milestone maps to exactly one npm release.
- Milestone `vX.Y` maps to npm version `X.Y.0`.
- The current planned `v1.9` release maps to npm `1.9.0`.
- Major version jumps, including `0.5.2-beta.1` to `1.9.0`, must be highlighted before release.

### Safety Gates

- `/release` must include two explicit user confirmation gates.
- Gate 1 happens after milestone closeout / archival summary and before release preparation.
- Gate 2 happens before any irreversible operation: `npm version`, git commit, git tag, `git push`, or publish-triggering remote action.
- Gate 2 must require explicit `y` / `Y`; default is no.
- Release remains L3: AI can prepare and verify, but cannot autonomously publish.

### Thin Orchestration

- `/release` must be documented as a thin orchestrator.
- It must reuse existing GSD milestone closeout instead of redefining closeout behavior.
- It must reuse `scripts/release.sh` / npm release tooling instead of rebuilding mechanical version/tag/push logic.
- It must rely on existing GitHub Actions publish workflow after tag push.

### the agent's Discretion

- Exact section names inside `docs/rules/release.md`, `deployment.md`, and `pre-release-checklist.md` may be chosen for readability.
- The phase may tighten the existing draft `docs/rules/release.md` if it conflicts with L3 boundaries or current release script facts.
- The phase may add minimal release routing rows to `docs/rules/README.md` and `CLAUDE.md`.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope

- `.planning/ROADMAP.md` — Phase 31 goal, requirements, and success criteria
- `.planning/REQUIREMENTS.md` — `REL-01`, `REL-02`, `DOC-01`, `DOC-02`, `DOC-03`
- `.planning/STATE.md` — current milestone state and release L3 risks
- `/home/stark/.claude/plans/ticklish-sprouting-church.md` — source proposal and user decisions

### Release Truth

- `package.json` — current version, release scripts, prepublish hooks
- `scripts/release.sh` — current mechanical version/tag/push release helper
- `.github/workflows/publish.yml` — tag-triggered npm publish and GitHub Release workflow
- `docs/rules/deployment.md` — current publish/package rules
- `docs/rules/pre-release-checklist.md` — current pre-release guardrails

### Routing / Governance

- `AGENTS.md` — L3 release authority boundary
- `CLAUDE.md` — entry router
- `docs/rules/README.md` — rules index
- `docs/rules/release.md` — release workflow draft and target authoritative document

</canonical_refs>

<specifics>

## Specific Ideas

- Add a `/release v{X.Y}` flow diagram to `docs/rules/release.md`.
- Document two confirmation gates with full example prompts.
- Document refusal cases: missing target version, dirty working tree, wrong branch, milestone not ready, existing tag conflict.
- Document version mapping: `vX.Y` → `X.Y.0`.
- Document that real publish is out of scope for this milestone.
- Add routing from `CLAUDE.md` and `docs/rules/README.md` to `docs/rules/release.md`.
- Expand `AGENTS.md` L3 row or adjacent text just enough to mention `/release` confirmation boundaries.

</specifics>

<deferred>

## Deferred Ideas

- Creating `.claude/skills/release/SKILL.md` is Phase 32.
- Dry-run failure-mode evidence is Phase 33.
- Actual npm / GitHub Release publication is out of scope until a future explicit release command.
- Non-Claude runtime release wrappers are v2 follow-up scope.

</deferred>

---

*Phase: 31-release-governance-contract*
*Context gathered: 2026-04-22 via source plan handoff*
