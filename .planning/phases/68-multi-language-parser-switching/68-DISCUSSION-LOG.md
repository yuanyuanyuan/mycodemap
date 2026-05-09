# Phase 68: Multi-language Parser Switching - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 68-multi-language-parser-switching
**Areas discussed:** Generalization landing zone, Grammar switch trigger, Python fallback semantics, TS/JS cutover depth

---

## Generalization landing zone

| Option | Description | Selected |
|--------|-------------|----------|
| Capability-first, migration later | Deliver shared multi-language Tree-sitter capability now; leave relocation/interface cleanup to Phase 71 | ✓ |
| One-step migration | Generalize and also migrate into infrastructure / unify interfaces in Phase 68 | |
| Minimal change | Keep old `TreeSitterParser` mostly untouched and only extract shared switching logic | |

**User's choice:** Capability-first, migration later
**Notes:** User wants Phase 68 to deliver the shared parsing capability without absorbing the cleanup scope already assigned to Phase 71.

---

## Grammar switch trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect by extension only | Keep switching fully extension-driven and aligned with current registry routing | ✓ |
| Auto-detect plus explicit override | Add optional internal or external `language` override support | |
| Explicit language only | Require callers to provide language rather than infer from extension | |

**User's choice:** Auto-detect by extension only
**Notes:** User chose to preserve the existing extension-driven routing model and avoid creating a new decision/API surface in this phase.

---

## Python fallback semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Continue explicit error | Preserve Phase 67 strict grammar-missing behavior; no automatic regex fallback | ✓ |
| Restore automatic regex fallback | Match older roadmap wording by falling back to `PythonParser` when grammar is missing | |
| Make fallback configurable | Add a strategy/config switch between strict error and fallback | |

**User's choice:** Continue explicit error
**Notes:** User chose to keep the newer Phase 67 locked decision rather than re-open fallback semantics in Phase 68.

---

## TS/JS cutover depth

| Option | Description | Selected |
|--------|-------------|----------|
| Main-path cutover | Switch TS/JS default registry implementation to the shared Tree-sitter parser in this phase | ✓ |
| Proof only | Keep TS/JS main path on regex parser and only prove shared parser in tests/local paths | |
| Dual-track | Introduce the shared parser but keep TS/JS default on regex for now | |

**User's choice:** Main-path cutover
**Notes:** User wants the shared parser to be real production path behavior for TS/JS, not just a demonstration artifact.

---

## the agent's Discretion

- Exact internal class/helper naming for the shared Tree-sitter capability
- Exact fixture organization and test naming
- Whether the capability is implemented by directly generalizing the existing legacy parser or by introducing a nearby shared helper while staying inside Phase 68 scope

## Deferred Ideas

- Parser interface unification and adapter removal
- Full parser-layer migration/cleanup owned by Phase 71
