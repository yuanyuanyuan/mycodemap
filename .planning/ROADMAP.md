# Roadmap: CodeMap

## Current Planning Surface

**Status:** No active milestone selected after `v1.9` closeout preparation on 2026-04-23.

`v1.9 release-governance-unification` has been archived as a planning milestone. The active phase directories for Phase 31-34 were moved to `.planning/milestones/v1.9-phases/`, and the milestone audit / roadmap / requirements snapshots are now under `.planning/milestones/`.

## v1.9 release-governance-unification (Archived)

`v1.9` defined and verified a safe unified `/release` workflow that binds milestone closeout to npm release governance while preserving L3 confirmation boundaries for version bumps, tags, pushes, and publication.

Key deliverables:
- `docs/rules/release.md` is the authoritative `/release` workflow document.
- `.claude/skills/release/SKILL.md` provides the thin orchestrator for readiness checks, version mapping, two confirmation gates, and helper delegation.
- `docs/rules/deployment.md` and `docs/rules/pre-release-checklist.md` route release governance to the same authority chain.
- `Phase 34` removed the helper-first checklist drift and restored `/release` as the only recommended release entry.

Validation:
- Milestone audit: `.planning/milestones/v1.9-MILESTONE-AUDIT.md`
- Roadmap archive: `.planning/milestones/v1.9-ROADMAP.md`
- Requirements archive: `.planning/milestones/v1.9-REQUIREMENTS.md`
- Phase archive: `.planning/milestones/v1.9-phases/`

## Next Options

1. Start the next planning milestone with `$gsd-new-milestone`.
2. If the intent is to publish, run a future explicit `/release v1.9` on a clean working tree and pass both confirmation gates.
3. Keep deferred governance/debug items visible in `.planning/STATE.md` until a future milestone explicitly resolves or retires them.

## Historical Index

See `.planning/MILESTONES.md` for shipped milestone summaries and `.planning/milestones/` for archived roadmap / requirements / phase artifacts.
