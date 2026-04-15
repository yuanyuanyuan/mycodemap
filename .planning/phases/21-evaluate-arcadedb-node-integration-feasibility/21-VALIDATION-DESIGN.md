# Phase 21 Validation Design

## Preconditions

- `ARCADEDB_HTTP_URL`
- `ARCADEDB_DATABASE`
- `ARCADEDB_USERNAME`
- `ARCADEDB_PASSWORD`
- A reachable ArcadeDB server for live smoke

## Smoke Checks

- `node --check scripts/experiments/arcadedb-http-smoke.mjs`
- `node scripts/experiments/arcadedb-http-smoke.mjs --help`
- `ARCADEDB_HTTP_URL=... ARCADEDB_DATABASE=... ARCADEDB_USERNAME=... ARCADEDB_PASSWORD=... node scripts/experiments/arcadedb-http-smoke.mjs`

## Benchmark Strategy

Benchmarking is allowed only after live smoke succeeds.

Track at least:

- `handshake latency`
- `query latency`
- `setup complexity`

The first two are timing metrics. `setup complexity` records qualitative friction such as number of required services, auth steps and doc/setup burden.

## Stop Conditions

- `HTTP path unstable`
- `requires public config surface changes before proving value`
- `operational cost too high for current local-first CLI`

## Notes

- No placeholder benchmark numbers are allowed.
- If live smoke cannot be run, the final report must remain `NO-GO` or `CONDITIONAL`.
