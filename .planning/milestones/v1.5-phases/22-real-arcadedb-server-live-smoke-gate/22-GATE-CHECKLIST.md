# Phase 22 Gate Checklist

## Pass Criteria

Write `Gate outcome: pass` only when **all** of the following are true:

- A real ArcadeDB server live smoke succeeds through the isolated experiment seam.
- `ARCADEDB_*` env contract, database name, auth mode, and TLS preconditions are recorded explicitly.
- The observed request matches the documented endpoint/auth contract.
- No `public-surface change required` condition is discovered.
- No shipped runtime/config changes were needed to make the command complete.

## Blocked Criteria

Write `Gate outcome: blocked` when execution cannot fairly prove or disprove the seam because a prerequisite is missing, including:

- `No reachable server`
- `Missing credentials`
- `TLS preconditions unresolved`
- Database not provisioned yet
- Required network path is unavailable to the executor

## Fail Criteria

Write `Gate outcome: fail` when the seam is exercised but contradicts the documented contract or the milestone boundary, including:

- `public-surface change required`
- `endpoint/auth contract mismatch`
- `script cannot complete the documented command`
- Live smoke only works after changing shipped runtime/config behavior
- Server responds, but the documented HTTP path or auth mode is incompatible with the current smoke contract

## Required Evidence Fields

- `Live smoke command`
- `Observed outcome`
- `Sanitized endpoint`
- `Auth mode`
- `TLS mode`
- `Failure reason`
- Execution date
- Script path

## Stop Rule

Phase 23 remains locked unless Gate outcome: pass.

## Failure Rehearsal

- If the only executable path requires widening `StorageType`, `StorageFactory`, config schema, or public docs first, classify it as `fail`.
- If the command cannot run because server / credentials / TLS are absent, classify it as `blocked`.
- If offline checks pass but real live smoke still does not, do not treat the offline checks as substitute proof.

## Review Reminder

- `blocked` is acceptable for this phase when external prerequisites are missing.
- `fail` is acceptable for this phase when the isolated seam proves insufficient.
- Only `pass` unlocks benchmark / latency work in `Phase 23`.
