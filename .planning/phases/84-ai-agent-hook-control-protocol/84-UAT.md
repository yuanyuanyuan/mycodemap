---
status: complete
phase: 84-ai-agent-hook-control-protocol
source:
  - 84-01-SUMMARY.md
started: 2026-05-12T07:00:35+08:00
updated: 2026-05-12T07:00:35+08:00
---

## Current Test

[testing complete]

## Tests

### 1. AI agent receives fail-fast split route for staged file overflow
expected: non-dot staged file count overflow is blocked before heavy checks, and the payload provides `next_action=split_commit` with suggested groups.
result: pass

### 2. AI agent receives rewrite route for commit message blockers
expected: `commit-format` and `commit-scope-message` failures emit `codemap.commitmsg.v1` plus `rewrite_commit_message` guidance instead of only human prose.
result: pass

### 3. Installable template truth stays deployable across projects
expected: template hooks and managed copies both expose the protocol contract, while related-test remediation remains generic instead of assuming only `vitest`.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None.
