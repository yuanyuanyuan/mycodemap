# Phase 22 Live Smoke Runbook

## Preconditions

- `ARCADEDB_HTTP_URL` — ArcadeDB HTTP base URL, for example `http://127.0.0.1:2480`
- `ARCADEDB_DATABASE` — Database name used in `/api/v1/command/{database}`
- `ARCADEDB_USERNAME` — Basic auth username
- `ARCADEDB_PASSWORD` — Basic auth password
- A reachable ArcadeDB server is required
- Database must already exist before the live smoke command runs

## Command Contract

### Offline validation

```bash
node --check scripts/experiments/arcadedb-http-smoke.mjs
node scripts/experiments/arcadedb-http-smoke.mjs --help
```

### Live smoke execution

```bash
ARCADEDB_HTTP_URL=http://127.0.0.1:2480 \
ARCADEDB_DATABASE=Imported \
ARCADEDB_USERNAME=root \
ARCADEDB_PASSWORD='<redacted>' \
node scripts/experiments/arcadedb-http-smoke.mjs
```

### Optional local preflight via official Docker image

One acceptable way to satisfy the preconditions locally is to run the official ArcadeDB Docker image with a demo database and a known root password, then target the imported database from the smoke script.

```bash
docker run --rm --name phase22-arcadedb \
  -p 2480:2480 -p 2424:2424 \
  -e 'JAVA_OPTS=-Darcadedb.server.rootPassword=playwithdata -Darcadedb.server.defaultDatabases=Imported[root]{import:https://github.com/ArcadeData/arcadedb-datasets/raw/main/orientdb/OpenBeer.gz}' \
  arcadedata/arcadedb:latest
```

## Auth And TLS Notes

- The smoke script sends `Authorization: Basic` with `ARCADEDB_USERNAME` and `ARCADEDB_PASSWORD`.
- HTTP endpoint contract is `POST {ARCADEDB_HTTP_URL}/api/v1/command/{database}`.
- TLS preconditions must be recorded explicitly.
- If HTTPS is required, record certificate, trust store, hostname validation, and proxy assumptions in evidence.
- No insecure bypass is allowed as a hidden default.
- If auth mode or endpoint path differs from the documented contract, the result must not be written as `pass`.

## Isolation Guardrails

- No shipped runtime/config changes.
- Do not modify StorageType / StorageFactory / public schema to make smoke pass.
- Do not edit `src/interface/types/storage.ts`, `src/infrastructure/storage/StorageFactory.ts`, CLI config schema, or public docs to satisfy this gate.
- If the only way forward is to widen public surface, treat that as `fail`, not as “next small implementation step”.

## Sanitization Rules

- Evidence must not include plaintext passwords, bearer tokens, or reusable session secrets.
- Evidence must not include a full sensitive endpoint when it reveals non-local hostnames, customer domains, or internal network topology.
- Prefer sanitized forms such as `http://127.0.0.1:2480`, `https://<redacted-host>:2480`, or `root/<redacted>`.
- Raw output summaries may quote status codes and error classes, but must redact secret material.

## Sources

- `scripts/experiments/arcadedb-http-smoke.mjs`
- `.planning/phases/21-evaluate-arcadedb-node-integration-feasibility/21-VALIDATION-DESIGN.md`
- `https://arcadedb.com/`
- `https://arcadedb.com/client-server.html`
