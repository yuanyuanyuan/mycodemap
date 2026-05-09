# Phase 69: PythonTypeEnhancer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 69-PythonTypeEnhancer
**Areas discussed:** Output shape and write-back contract, Docstring parsing scope

---

## Output shape and write-back contract

| Option | Description | Selected |
|--------|-------------|----------|
| Light backfill | Prioritize writing type information into existing symbol structures and only add minimal top-level metadata when required. | |
| TS-aligned primary entry | Use top-level `result.typeInfo` as the main write-back entry, then backfill symbol structures where clearly useful. | ✓ |
| Dual-write everywhere | Maintain a full top-level type summary while also duplicating broadly into symbol structures. | |

**User's choice:** TS-aligned primary entry, with targeted symbol backfill for visible class attribute information.
**Notes:** The user accepted the recommendation to keep `result.typeInfo` as the authoritative entry point, add class attribute information to both symbols and top-level summaries, and interpret "matching TS shape" primarily as using the same field names and read path rather than forcing a strict internal mirror of every TS-specific detail.

---

## Docstring parsing scope

| Option | Description | Selected |
|--------|-------------|----------|
| Stable subset first | Support Google, NumPy, and Sphinx styles through high-confidence mainstream patterns only; skip ambiguous variants. | ✓ |
| Broad permissive coverage | Try to handle many style variants early, accepting more heuristics and ambiguity. | |
| Agent decides case-by-case | Leave the parsing strictness threshold open for implementation-time judgment. | |

**User's choice:** Stable subset first.
**Notes:** The user accepted the recommendation to focus first on parameters, return types, and clearly declared class attributes; fail soft on complex or ambiguous docstrings; and treat each docstring style as complete in this phase once at least one mainstream pattern is covered by fixtures and tests.

---

## the agent's Discretion

- Internal helper naming and parser decomposition for the docstring readers
- Exact metadata organization inside `typeInfo`, provided the top-level entry contract stays aligned with the TypeScript enhancer seam
- Exact high-confidence threshold for skipping ambiguous docstring patterns

## Deferred Ideas

- Wider docstring variant coverage beyond a stable mainstream subset
- Parser/result contract cleanup or enhancer relocation work from Phase 71
- Call-graph or complexity-related Python enrichment work from later phases
