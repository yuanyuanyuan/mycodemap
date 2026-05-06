# Codex Session Evidence

Captured: 2026-05-05
Agent fixture: `.codex/agents/env-contract-verifier.toml`
Session context: Codex worker agent, spawned from the Phase 58 verification request

---

## Prompt Sent to Worker

Use the configuration from `.codex/agents/env-contract-verifier.toml`. Mandatory workflow:
1) Before any substantive work, retrieve the project environment contract by running `mycodemap env-contract --for worker --json`.
2) Report the retrieval command and its full output first.
3) List the contract items observed, specifically `shell-rtk-wrapper`, `commit-format`, and `test-entry-vitest`.
4) Confirm whether retrieval happened before any other substantive work.
5) Do not edit any repository files.
If retrieval fails, report the exact blocker and stop.

Return only the retrieval evidence and verification. Do not perform other work.

---

## First Command Executed

```bash
mycodemap env-contract --for worker --json
```

## Retrieval Output

```json
{
  "schemaVersion": "env-contract.v1",
  "generatedAt": "2026-05-05T09:42:36.284Z",
  "agentType": "worker",
  "items": [
    {
      "id": "shell-rtk-wrapper",
      "category": "execution",
      "severity": "critical",
      "content": "Shell commands must be wrapped with `rtk` for token-optimized execution. Prefix commands like `rtk git status`, `rtk npm run build`, `rtk npx vitest run`.",
      "sources": [
        {
          "file": "AGENTS.md",
          "hash": "sha256:9012465ed2b6e5dc47446ff76df46f8f1721b42ad08b3f4198efddfb59f6d16a",
          "authority": "governance"
        }
      ]
    },
    {
      "id": "commit-format",
      "category": "commit",
      "severity": "critical",
      "content": "Commit messages must use [TAG] scope: message\" format with uppercase tags.",
      "metadata": {
        "validTags": [
          "BUGFIX",
          "FEATURE",
          "REFACTOR",
          "CONFIG",
          "DOCS",
          "DELETE"
        ]
      },
      "sources": [
        {
          "file": ".githooks/commit-msg",
          "hash": "sha256:bd60328b8d3d561e68d102dd76feae661497e1959774ebc0e136fa1a7a392b32",
          "authority": "executable"
        }
      ]
    },
    {
      "id": "test-entry-vitest",
      "category": "execution",
      "severity": "critical",
      "content": "Tests run with `vitest run`. Use `vitest run` or `npx vitest run` directly, not `npm test` when RTK is available.",
      "sources": [
        {
          "file": "package.json",
          "hash": "sha256:13d7b7e922b97ea8e92c3c35c5ecbad7500ad137fb660e38251705612e831de0",
          "authority": "executable"
        }
      ]
    },
    {
      "id": "real-scenario-validation",
      "category": "validation",
      "severity": "high",
      "content": "Real filesystem/subprocess or transport evidence and at least one failure scenario are required. Pure mock-only tests are not sufficient verification.",
      "sources": [
        {
          "file": "docs/rules/testing.md",
          "hash": "sha256:15f976a0820c12b71394afe662d2a47462eafd2bd39d0a1417057b13054e7ab4",
          "authority": "governance"
        }
      ]
    }
  ],
  "conflicts": [
    {
      "id": "commit-tag-case",
      "severity": "medium",
      "description": "Commit tag case mismatch between hook and documentation",
      "sources": [
        {
          "file": ".githooks/commit-msg",
          "value": "BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE"
        },
        {
          "file": "AGENTS.md",
          "value": "docs"
        }
      ],
      "recommendation": "Hook enforces uppercase tags; documentation should align with hook enforcement."
    }
  ],
  "sourceSnapshots": [
    {
      "file": "AGENTS.md",
      "hash": "sha256:9012465ed2b6e5dc47446ff76df46f8f1721b42ad08b3f4198efddfb59f6d16a",
      "lastModified": "2026-05-05T09:42:24.811Z"
    },
    {
      "file": ".githooks/commit-msg",
      "hash": "sha256:bd60328b8d3d561e68d102dd76feae661497e1959774ebc0e136fa1a7a392b32",
      "lastModified": "2026-04-18T19:44:54.191Z"
    },
    {
      "file": "package.json",
      "hash": "sha256:13d7b7e922b97ea8e92c3c35c5ecbad7500ad137fb660e38251705612e831de0",
      "lastModified": "2026-05-02T03:12:56.107Z"
    },
    {
      "file": "docs/rules/testing.md",
      "hash": "sha256:15f976a0820c12b71394afe662d2a47462eafd2bd39d0a1417057b13054e7ab4",
      "lastModified": "2026-05-01T01:24:29.833Z"
    },
    {
      "file": "vitest.config.ts",
      "hash": "sha256:ea834d1691f8734fd955c42125ba90711e9cdc8250266c2de9a977d4246fd82e",
      "lastModified": "2026-03-24T17:42:31.440Z"
    }
  ]
}
```

## Retrieval Aftermath

The first substantive action after retrieval was to prepare the verification report for the requested evidence files. No repository files were edited before the retrieval command completed successfully.
