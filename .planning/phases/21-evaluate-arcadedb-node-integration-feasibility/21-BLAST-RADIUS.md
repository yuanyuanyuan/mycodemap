# Phase 21 Blast Radius: ArcadeDB as First-Class Backend

## Current Public Surface

- `storage.type` currently supports `filesystem / kuzudb / memory / auto`
- `StorageConfig` currently exposes `type / outputPath / databasePath / autoThresholds`
- `mycodemap.config.schema.json` does not expose remote connection fields
- `src/cli/config-loader.ts` explicitly rejects `uri / username / password`

## Required New Surface For First-Class ArcadeDB

- `uri`
- `database`
- `username`
- `password`
- `protocol`
- `tls`
- `serverLifecycle`

## Existing Drift That Changes The Baseline

- runtime `auto -> kuzudb`
- docs `auto -> filesystem`

This means the current baseline is already not perfectly aligned. Any ArcadeDB estimate that ignores this mismatch will undercount the real blast radius.

## Blast Radius

| Surface | Current Truth | First-Class ArcadeDB Impact |
|---------|---------------|-----------------------------|
| Type Surface | `StorageType` has no `arcadedb` | Union type and downstream branching would need expansion |
| Config Parser | Parser only accepts local-path-oriented storage fields | Would need remote connection parsing and clearer diagnostics |
| Schema | Schema lacks remote backend fields | Would need explicit `uri / database / auth / tls` contract |
| Runtime Selection | `auto` currently prefers `kuzudb` when available | Auto-selection semantics would need redesign for server-backed backends |
| User Docs | README still frames storage around local backends | Setup, auth, remote failure and lifecycle docs would need expansion |
| AI Docs | `docs/ai-guide/COMMANDS.md` still describes conservative local storage truth | AI guidance would need updated setup and failure narratives |
| Fallback/Error Handling | Current storage fallback assumes local dependency availability | Would need remote connectivity, auth and protocol-specific error handling |

## Isolation Strategy

Phase 21 must not modify these files directly:

- `src/interface/types/storage.ts`
- `src/cli/config-loader.ts`
- `mycodemap.config.schema.json`
- `src/infrastructure/storage/StorageFactory.ts`
- `README.md`
- `docs/ai-guide/COMMANDS.md`

Instead, Phase 21 should produce evidence artifacts plus an isolated experiment script.

## Recommendation

Treat server-backed ArcadeDB as a product-surface change.

Do not frame it as “just add another adapter.” The missing connection/auth/lifecycle surface is the core cost.
