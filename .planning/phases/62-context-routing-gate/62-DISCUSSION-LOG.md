# Phase 62: Context Routing Gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 62-context-routing-gate
**Areas discussed:** Task semantics, Routing payload, Suggestions and filtering, Detail levels and verification

---

## Task semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Review-first | `review` focuses on risk/blast radius, `debug` on troubleshooting order, `default` on general overview | ✓ |
| Debug-first | Bias the gate toward failure triage even for review requests | |
| Fully generic | Keep all tasks nearly identical and let downstream tools differentiate | |

**User's choice:** Adopted the recommended split: `review` = inspect risk/blast radius first; `debug` = locate and triage failure first; `default` = lightweight general orientation.
**Notes:** User replied "按照你建议", explicitly delegating the choice to the agent.

---

## Routing payload

| Option | Description | Selected |
|--------|-------------|----------|
| Thin core | Always return `graphStats + riskSummary + nextToolSuggestions`, keep hotspots out of the minimum payload | ✓ |
| Expanded core | Always include candidate files/hotspots in the base payload | |
| Full context | Include warnings, hotspots, and richer context in every response | |

**User's choice:** Adopted the recommended thin-core contract, with warnings/unknowns included only when they materially affect routing quality.
**Notes:** Candidate files/hotspots are preserved for richer detail modes rather than the always-on minimum payload.

---

## Suggestions and filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Static-first + strict filtering | Stable task-to-tool mapping with small dynamic adjustments; expose only relevant tools | ✓ |
| Static-first + soft filtering | Keep a stable mapping but still show the wider tool universe | |
| Strong dynamic routing | Generate suggestions mostly from live context each time | |

**User's choice:** Adopted the recommended static-first routing with strict filtering.
**Notes:** The gate may adjust slightly for missing graph state or unavailable tools, but predictability remains the primary goal.

---

## Detail levels and verification

| Option | Description | Selected |
|--------|-------------|----------|
| Thin `minimal`, richer `standard` | `minimal` = summary/counts/risk/2-3 suggestions; `standard` adds rationale, hotspots, warnings | ✓ |
| Nearly identical levels | Keep `minimal` and `standard` close for implementation simplicity | |
| Heavy multi-tier output | Push toward backlog-style `full` output in this phase | |

**User's choice:** Adopted the recommended thin `minimal` and richer `standard` boundary.
**Notes:** Verification should focus on invalid task input, missing/stale graph truth, suggestion executability/relevance, filtering regressions, and proving `minimal` is observably shorter than `standard`.

---

## the agent's Discretion

- Exact payload field names
- Exact per-task suggestion lists
- Exact stale-graph heuristics and warning wording

## Deferred Ideas

- Community metadata in graph stats
- Dossier-style `full` mode with code snippets
- Highly dynamic recommendation logic beyond small context-based adjustments
