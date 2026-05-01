# Phase 46: Validation Router + No Ghost Commands - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** Infrastructure phase — minimal context

<domain>
## Phase Boundary

Fix the "docs say one thing, commands do another" trust crisis. Root `CLAUDE.md` validation section must become a 1-screen decision tree by change type. `check:architecture` and `check:unused` must become real checks or be honestly removed. No `echo` stub commands may remain in `package.json`. Docs guardrail scans must verify referenced `npm run` commands are not stubs. `docs/rules/architecture-guardrails.md` must sync with real automation.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP success criteria and codebase conventions to guide decisions.

### Key Constraints
- `check:architecture` currently echoes: `echo 'dependency-cruiser not installed, run: npm i -D dependency-cruiser'`
- `check:unused` currently echoes: `echo 'knip not installed, run: npm i -D knip'`
- Ghost command detection already exists in `src/cli/doctor/check-ghost-commands.ts` (Phase 43)
- `architecture-guardrails.md` references `npm run check:architecture` in its "快速验证" section
- `validate-docs.js` scans docs for command references but does NOT verify npm scripts are real

### Decision: Remove, Don't Install
Rather than installing `dependency-cruiser` and `knip` (which would add dev dependencies and complexity), honestly remove the echo stubs and update all docs references. The actual architecture validation is already covered by `deps` command and CI. Unused code detection can be deferred or handled by existing lint rules.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/doctor/check-ghost-commands.ts` — already detects echo stubs in package.json scripts
- `scripts/validate-docs.js` — docs guardrail scanner, needs extension to verify npm scripts
- `src/cli/output/types.ts` — ActionableError types from Phase 45 for structured error handling

### Established Patterns
- Phase 43 (doctor) established diagnostic result patterns: `{category, severity, id, message, remediation}`
- Phase 45 established ActionableError with `nextCommand` for remediation
- Docs validation runs as `npm run docs:check` which calls `scripts/validate-docs.js`

### Integration Points
- `package.json` scripts section — remove `check:architecture` and `check:unused`
- `CLAUDE.md` — add validation decision tree section
- `docs/rules/architecture-guardrails.md` — remove or replace `npm run check:architecture` reference
- `scripts/validate-docs.js` — add npm script stub verification

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
