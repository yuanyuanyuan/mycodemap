# Phase 58 Context: Subagent Environment Contract Injection

## Source Trigger

This phase comes from the observed delegation risk that sub-agents can miss project-specific environment contracts when those contracts are scattered across hooks, entry docs, package scripts, and rule-control helpers.

## Problem

Delegated agents may waste tokens or take wrong actions when they do not receive these facts before work starts:

- Shell commands in this repo should be wrapped with `rtk`.
- Commit messages must use `[TAG] scope: message` with the repo's valid uppercase tags.
- Test commands must follow the current Vitest truth from the repo, not guessed aliases.
- CodeMap/rule-context priority rules must be visible before scoped edit or review work.

## Required Verification Shape

Phase 58 is not complete unless verification includes a real delegated-agent run through Claude Code `claude -p` or Codex `codex exec`.

The verification must capture:

- the exact command used to launch the real delegated agent;
- the prompt or generated contract given to that agent;
- output evidence that the agent received and used the RTK, commit-format, and Vitest-entry guidance;
- a negative case where missing contract injection is rejected or flagged.

Mock-only tests or helper-output assertions without a real delegated sub-agent are insufficient for this phase.
