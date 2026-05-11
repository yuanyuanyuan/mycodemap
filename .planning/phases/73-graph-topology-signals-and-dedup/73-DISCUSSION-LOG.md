# Phase 73: Graph Topology Signals and Dedup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 73-graph-topology-signals-and-dedup
**Areas discussed:** Topology signal granularity, Dedup boundary

---

## Topology signal granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Module-level first | Reuse the existing module/community projection and ship interpretable hub / bridge signals first | ✓ |
| Symbol-level first | Introduce a finer-grained topology truth layer before first release | |

**User's choice:** Module-level first
**Notes:** Keep the first release aligned with persisted graph/community truth. Do not reopen parser or deep-analysis seams already settled by earlier phases.

---

## Dedup boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Single-layer dedup | Rely on one stage to suppress duplicate graph artifacts | |
| Build + persistence + read | Defend topology truth across graph build, writeback, and read/projection stages | ✓ |

**User's choice:** Build + persistence + read
**Notes:** `HOOK-03` remains a prerequisite for trustworthy topology scoring. Hub / bridge output should only be computed on dedup-protected graph truth.

---

## the agent's Discretion

- Exact scoring algorithm and thresholds for module-level hub / bridge signals
- Exact canonicalization keys and helper seams used to enforce the three dedup layers
- Whether the first topology output extends an existing surface or ships on a dedicated surface, as long as it stays on the persisted-truth path

## Deferred Ideas

- Symbol-level topology truth can be reconsidered in a later phase if module-level signals prove insufficient
- Hook reminder behavior remains in Phase 74, not Phase 73
