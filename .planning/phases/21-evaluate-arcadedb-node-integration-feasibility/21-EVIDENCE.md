# Phase 21 Evidence Pack: ArcadeDB Node Support

## Official Support Matrix

| Mode | Official Scope | Node Fit | Phase 21 Interpretation |
|------|----------------|----------|-------------------------|
| Embedded | JVM only | Java API | Reject as Node runtime path |
| HTTP/JSON | Client/server | Preferred Node experiment path | Official server-backed route |
| Bolt | Client/server | Secondary Node validation path | Do not equate to restored Neo4j product surface |

## Invalid Assumptions Removed

- No Node embedded SDK assumption
- No drop-in replacement claim
- No public surface mutation in Phase 21

## Source Links

- https://arcadedb.com/embedded.html
- https://arcadedb.com/client-server.html

## Node Fit Summary

- Embedded uses a JVM/Java API model and is not a direct Node runtime path.
- HTTP/JSON is the least-assumptive official path for a Node-local experiment because Node 18+ already provides `fetch`.
- Bolt remains useful as a secondary check, but not as the main productization narrative.

## Decision Posture

- Embedded = NO-GO
- HTTP/JSON = primary
- Bolt = secondary

## Notes

- Phase 21 evaluates whether ArcadeDB is worth a future server-backed follow-up.
- Phase 21 does not introduce `storage.type = "arcadedb"` or any new public config field.
