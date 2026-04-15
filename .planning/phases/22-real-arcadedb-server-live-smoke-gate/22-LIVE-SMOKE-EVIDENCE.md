# Phase 22 Live Smoke Evidence

## Execution Context

- Execution date: 2026-03-30
- Node version: `v24.14.0`
- Script path: `scripts/experiments/arcadedb-http-smoke.mjs`
- Runbook used: `22-LIVE-SMOKE-RUNBOOK.md`
- Execution mode: local loopback smoke attempt after local Docker preflight

## Inputs

- `Live smoke command`: `ARCADEDB_HTTP_URL=http://127.0.0.1:2480 ARCADEDB_DATABASE=Imported ARCADEDB_USERNAME=root ARCADEDB_PASSWORD=<redacted> node scripts/experiments/arcadedb-http-smoke.mjs`
- `Sanitized endpoint`: `http://127.0.0.1:2480/api/v1/command/Imported`
- `Auth mode`: `Authorization: Basic`
- `TLS mode`: `none (local HTTP loopback only)`
- `Database`: `Imported`
- Local provisioning attempt: `docker run --rm --name phase22-arcadedb -p 2480:2480 -p 2424:2424 -e 'JAVA_OPTS=...rootPassword=<redacted>...defaultDatabases=Imported[...]' arcadedata/arcadedb:latest`

## Observed Outcome

Observed outcome: blocked

- Offline validation still passes: `node --check` and `--help` both succeed
- Real live smoke could not reach a running ArcadeDB server on `127.0.0.1:2480`
- The isolated seam itself was executed, but the required server precondition was not satisfiable in this environment

## Failure reason

- `No reachable server`
- Local Docker quick-start provisioning failed before the server became reachable
- Docker daemon attempted to resolve `docker.io/arcadedata/arcadedb:latest` through a proxy and timed out
- Direct smoke retry then failed with `ECONNREFUSED 127.0.0.1:2480`

## Raw output summary

### Docker provisioning attempt

- `docker: Error response from daemon: failed to resolve reference "docker.io/arcadedata/arcadedb:latest"`
- `proxyconnect tcp: dial tcp 192.168.3.74:7890: i/o timeout`

### Direct smoke attempt

- Exit code: `1`
- Node stderr summary: `TypeError: fetch failed`
- Root cause: `connect ECONNREFUSED 127.0.0.1:2480`

### Loopback preflight

- `curl http://127.0.0.1:2480/` exited with `7`
- Summary: `Failed to connect to 127.0.0.1 port 2480`

## 2026-03-31 Revalidation

- Revalidation date: 2026-03-31
- `ARCADEDB_*` environment variables are still absent from the current shell
- Docker daemon still advertises `HTTP Proxy` / `HTTPS Proxy` as `http://192.168.3.74:7890`
- `timeout 20s docker pull arcadedata/arcadedb:latest` exited with `124`, which means the pull did not complete within the timeout window
- No local ArcadeDB container became available during this revalidation, so the gate remains blocked on external provisioning / reachability

## Guardrail Check

- No shipped runtime/config changes were made during Phase 22 execution.
- No changes were made to `StorageType`, `StorageFactory`, CLI config schema, or public docs to make smoke pass.

## Sources

- `22-LIVE-SMOKE-RUNBOOK.md`
- `22-GATE-CHECKLIST.md`
- `scripts/experiments/arcadedb-http-smoke.mjs`
- `https://arcadedb.com/`
- `https://arcadedb.com/client-server.html`
