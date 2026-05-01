# Phase 51: Post-Install Agent Bootstrap Configuration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 51-post-install-agent-bootstrap-configuration
**Areas discussed:** phase boundary, phase split, team-owned file safety, runtime targets, verification

---

## Phase Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| CLI-priority harness guard | Treat the audit finding mainly as a Claude/Codex session guard problem. | |
| Post-install init bootstrap | Treat the audit finding as a new-user initialization/configuration problem delivered through `mycodemap init`. | yes |

**User's choice:** The user corrected the scope: this phase involves what `mycodemap` should do after installation/configuration to initialize new users properly.
**Notes:** Roadmap and context were retargeted accordingly.

---

## Phase Split

| Option | Description | Selected |
|--------|-------------|----------|
| Single phase | Keep init bootstrap and runtime compliance guard together. | |
| Split phases | Keep Phase 51 for `mycodemap init`; create Phase 52 for CLI-first runtime/session guard. | yes |

**User's choice:** User noted there were effectively two Phase 50s and asked to separate them.
**Notes:** Phase 51 now owns post-install bootstrap. Phase 52 owns CLI-first compliance guard/auditor work.

---

## Team-Owned File Safety

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-edit `CLAUDE.md` / `AGENTS.md` | Convenient, but risky for team-owned context files. | |
| Manual snippets by default | Preserve current safe pattern: generate snippets and report manual actions. | yes |
| Explicit opt-in write mode | Possible future extension, separate from default init. | |

**User's choice:** Default selected from existing product pattern.
**Notes:** Existing `init` implementation already detects references and emits `manual-action-needed` without rewriting team files.

---

## Runtime Targets

| Option | Description | Selected |
|--------|-------------|----------|
| Generic only | One assistant-neutral snippet. | |
| Claude + Codex first | Cover the two audited runtimes first, plus generic fallback. | yes |
| All assistant ecosystems | Add every known assistant runtime now. | |

**User's choice:** Inferred from the audit context and user request covering Claude and Codex logs.
**Notes:** Additional runtimes can be deferred unless already covered by existing examples.

---

## Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Unit-only | Call init functions in-process and assert object shapes. | |
| Real temp project + subprocess | Use real filesystem and at least one built CLI subprocess flow. | yes |
| Full external install smoke | Install from registry/package tarball in every test. | |

**User's choice:** Selected from existing repository testing standard and Phase 51 roadmap needs.
**Notes:** Full external package install can be a release/pre-release smoke, not required for the smallest phase slice.

---

## Agent's Discretion

- Exact profile flag shape is open for planning.
- Exact generated file path for assistant snippets is open, as long as the receipt and docs make it discoverable.
- Implementation should stay within the existing init reconciliation model unless research finds a strong reason to change it.

## Deferred Ideas

- Runtime/session CLI-first guard or auditor → Phase 52.
- Automatic context-file rewriting by default.
- Full cross-runtime session audit tooling.
