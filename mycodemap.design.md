# mycodemap design contract

## Goal

- Keep the public CLI, documentation, and architecture guardrails aligned while the project continues its layered MVP3 transition.

## Constraints

- Public CLI changes must keep documentation and machine-readable contracts in sync.
- Layering rules should remain explicit even when legacy folders are still referenced in historical design tooling.

## Acceptance Criteria

- Public docs, AI docs, and validation scripts agree on the current CLI surface.
- Contract-oriented design commands have a repo-root input file to validate against.
- Guardrails catch obvious layer-direction drift before release.

## Non-Goals

- This file is not a full product PRD.
- This file does not replace deeper architecture or implementation plans.

## Rules

```yaml
rules:
  - type: layer_direction
    from: "src/core/**"
    to: "src/cli/**"
    rationale: "Legacy design tooling still validates that lower-level code must not depend on CLI entrypoints."
```
