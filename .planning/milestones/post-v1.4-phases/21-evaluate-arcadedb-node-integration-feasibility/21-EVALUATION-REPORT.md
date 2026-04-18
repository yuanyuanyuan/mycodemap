# Phase 21 Evaluation Report

## Executive Summary

ArcadeDB has official Node-adjacent access paths, but they are server-backed paths rather than embedded Node runtime paths. That is enough for an isolated experiment, but not enough to justify treating ArcadeDB as a direct successor to KùzuDB inside the current local-first storage surface.

## Decision Matrix

| Dimension | Assessment | Notes |
|-----------|------------|-------|
| Official Support Fit | Partial | HTTP/JSON and Bolt are official, embedded is not a Node path |
| Runtime Model Fit | Weak for direct replacement | Current product assumes local-path-oriented storage setup |
| Config Blast Radius | High | Remote URI, auth and lifecycle fields are missing today |
| Docs Blast Radius | High | Current docs still reflect local storage assumptions and even contain existing `auto` drift |
| Operational Complexity | High | Server lifecycle, auth and connectivity become user-facing concerns |
| Benchmark Readiness | Limited | Validation design exists, but no live smoke success is recorded in this phase |

## Decision

Decision: NO-GO for direct replacement; CONDITIONAL for isolated server-backed follow-up

## Rationale

1. Embedded is not a valid Node runtime path for this repo, so the strongest “drop-in replacement” premise fails immediately.
2. HTTP/JSON is a real official path and worth preserving as the minimum experiment seam.
3. The current storage contract is local-path-oriented; first-class ArcadeDB would require new remote configuration and lifecycle semantics.
4. The existing runtime/docs drift around `auto` shows the storage baseline is already imperfect, so a new backend would amplify the current surface-management cost.
5. Phase 21 did not produce a successful live smoke against a real ArcadeDB server, so only a conditional follow-up can be justified.

## Risks

- Overstating official support by treating protocol support as product-surface fit
- Underestimating docs and setup cost because the current baseline already contains storage drift
- Letting a disposable experiment script become de facto product code
- Treating “no live smoke yet” as if it were a hidden success

## Benchmark Strategy

Use the validation design in `21-VALIDATION-DESIGN.md`.

Do not record performance numbers until live smoke is stable. The correct first benchmark dimensions are `handshake latency`, `query latency` and `setup complexity`.
