# Phase 66: community-detection-baseline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 66-community-detection-baseline
**Areas discussed:** Baseline algorithm and weighting, Delivery surface, Cluster grain, Output interpretability and degradation

---

## Baseline algorithm and weighting

| Option | Description | Selected |
|--------|-------------|----------|
| Louvain baseline | Lowest-risk baseline for Phase 66, with a later seam for Leiden upgrade | ✓ |
| Leiden baseline | Stronger community guarantees, but higher integration and implementation complexity for this phase | |
| Algorithm-pluggable baseline | Delay commitment and keep the algorithm open during planning | |

**User's choice:** Follow the recommended baseline.
**Notes:** Locked to Louvain for Phase 66. The discussion also locked a simple edge-type weighting model now rather than using equal weights or a richer multi-pass weighting framework.

---

## Delivery surface

| Option | Description | Selected |
|--------|-------------|----------|
| CLI first | Land a maintainer-facing command before agent-facing structured output | |
| CLI + MCP together | Ship both public surfaces in the same phase | |
| MCP first | Reuse the existing graph-native agent-facing structured surface pattern | ✓ |

**User's choice:** Follow the recommended delivery surface.
**Notes:** Phase 66 should complete with one public surface. MCP is the baseline surface; CLI does not need to ship in the same phase.

---

## Cluster grain

| Option | Description | Selected |
|--------|-------------|----------|
| Module/file communities | Stable, interpretable baseline that maps directly to module boundaries | ✓ |
| Symbol-level communities | Finer-grained clusters with higher noise and interpretation cost | |
| Mixed module + symbol communities | Highest flexibility, highest baseline risk | |

**User's choice:** Follow the recommended cluster grain.
**Notes:** The baseline should reveal module boundaries first. Symbol or mixed-granularity clustering is explicitly deferred.

---

## Output interpretability and degradation

| Option | Description | Selected |
|--------|-------------|----------|
| Readable summaries + quality hints + explicit low-signal downgrade | Return clusters when possible, but downgrade confidence visibly on weak-signal graphs | ✓ |
| Weak-signal refusal | Suppress cluster output entirely below a quality threshold | |
| Always return clusters with only light warning | Keep output available, but avoid strong degradation semantics | |

**User's choice:** Follow the recommended degradation posture.
**Notes:** Low-signal graphs should not be overclaimed, but they also should not be treated as hard failure by default. The result should stay interpretable and visibly degraded when needed.

---

## the agent's Discretion

- Exact MCP tool naming and payload shape
- Exact weak-signal threshold heuristics
- Exact internal Louvain implementation choice, as long as it preserves a later Leiden-upgrade seam

## Deferred Ideas

- Symbol-level or hybrid community clustering
- Same-phase CLI rollout
- Multi-pass Leiden refinement for oversized communities
- Rich editable naming/configuration for community labels
