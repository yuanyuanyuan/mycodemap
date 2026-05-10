# Project Research Summary

**Project:** CodeMap
**Domain:** v2.5 deep-analysis-hooks
**Researched:** 2026-05-10
**Confidence:** HIGH

## Executive Summary

`v2.5 deep-analysis-hooks` is not a greenfield milestone. It is a directed extension of two already-closed baselines:

- `v2.4` closed Python AST / type depth and the shared parser contract
- `v2.3` closed graph-native storage, impact traversal, and community baseline

That means the right move is not to add new side channels. The milestone should convert already-reserved parser hooks (`callGraph`, `complexity`) and backlog-defined graph follow-ups (`hub/bridge`, `dedup`, `first-remind-then-silent`) into stable shared truth.

The research conclusion is straightforward:

1. `PY-07` and `PY-08` should extend the existing parser/result contract
2. `HOOK-01` should build on persisted graph/community truth, not on ad-hoc calculations
3. `HOOK-03` is a trust prerequisite for `HOOK-01`
4. `HOOK-02` must reuse Phase 58 `env-contract`, not replace it

## Key Findings

### Stack Additions

No major third-party stack change is required for `v2.5`.

- Python AST main path already exists through `PythonTreeSitterParser`
- cross-file resolution seam already exists through `GlobalSymbolIndexBuilder`
- complexity analysis seam already exists through `ast-complexity-analyzer.ts`
- hook retrieval contract already exists through Phase 58 `env-contract`

The milestone is primarily about integration and persistence, not dependency expansion.

### Table Stakes

- Python call-graph extraction and edge generation
- Python complexity metrics persisted into shared truth
- hub / bridge detection over graph-native data
- node dedup across file / writeback / cache layers
- first-remind-then-silent hook guidance pointing to env-contract retrieval

### Watch Outs

- unresolved Python calls must remain explicit; they cannot quietly look complete
- complexity cannot ship as a one-off CLI output while shared truth stays empty
- hub/bridge scoring before dedup will generate misleading topology signals
- hook reminder cannot become a second hidden rules surface
- complexity unification is adjacent, but belongs to `v2.6`, not this milestone

## Suggested Roadmap

### Phase 70: Python Call-graph Extraction

Deliver `PY-07` by extending the shared parser/result contract and cross-file resolution path.

### Phase 72: Python Complexity Truth

Deliver `PY-08` by persisting Python complexity into shared symbol/module truth and proving downstream consumption.

### Phase 73: Graph Topology Signals and Dedup

Deliver `HOOK-01` and `HOOK-03` together so topology scoring is not built on duplicate graph artifacts.

### Phase 74: Env-contract Reminder Hook

Deliver `HOOK-02` as a retrieval-led reminder behavior that points back to Phase 58 surfaces.

## Why This Phase Order

- `70` first: call-graph is the highest-value deep-analysis gap carried from `v2.4`
- `72` second: complexity belongs to the same parser family, but is independently verifiable
- `73` third: topology signals are only useful after richer graph truth and dedup protection exist
- `74` fourth: hook reminder is behaviorally isolated and should stay small

## Ready-for-Roadmap Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | existing repo seams cover the milestone |
| Features | HIGH | user scope matches existing active candidates and backlog |
| Architecture | HIGH | parser/graph/hook seams are already visible in code |
| Pitfalls | HIGH | main failure modes are explicit and testable |

**Overall:** ready for requirements and roadmap generation.

## Sources

- [.planning/research/STACK.md](/data/codemap/.planning/research/STACK.md:1)
- [.planning/research/FEATURES.md](/data/codemap/.planning/research/FEATURES.md:1)
- [.planning/research/ARCHITECTURE.md](/data/codemap/.planning/research/ARCHITECTURE.md:1)
- [.planning/research/PITFALLS.md](/data/codemap/.planning/research/PITFALLS.md:1)

---
*Research completed: 2026-05-10*
*Ready for roadmap: yes*
