# Phase 55: Agent Bootstrap Assets - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 55-agent-bootstrap-assets
**Areas discussed:** Assistant profile flag semantics, env-contract.json v1 content boundary, .mycodemap/assistants asset depth, init --json output contract

---

## Assistant Profile Flag Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| `--assistant-profile claude\|codex\|generic` | New flag for runtime adapter selection; preserves existing project `--profile` semantics. | ✓ |
| Reuse `--profile` | Use one flag for both project and assistant profile values. | |
| Namespace values under `--profile` | Use values such as `assistant:claude` or `project:nodejs`. | |

**User's choice:** Use `--assistant-profile claude|codex|generic`.
**Notes:** User selected the recommended option.

| Option | Description | Selected |
|--------|-------------|----------|
| Allow combination | `--profile` controls project bootstrap config; `--assistant-profile` controls assistant assets. | ✓ |
| Mutually exclusive error | Reject commands that pass both flags. | |
| Assistant profile overrides all profile behavior | Let `--assistant-profile` dominate profile behavior. | |

**User's choice:** Allow the two flags to be combined.
**Notes:** This supports natural usage such as Node.js project profile plus Codex assistant assets.

| Option | Description | Selected |
|--------|-------------|----------|
| Generate all | Omit `--assistant-profile` to generate Claude, Codex, and generic assets. | ✓ |
| Infer from environment | Detect `.claude/`, `.codex/`, or similar runtime markers. | |
| Generate generic only | Produce only generic assistant context by default. | |

**User's choice:** Generate all assistant assets by default.
**Notes:** Matches the roadmap and avoids unreliable runtime inference.

---

## env-contract.json v1 Content Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Typed seed contract | Include schema/version metadata, project profile, and typed items with source/confidence. | ✓ |
| Minimal flat JSON | Emit simple top-level fields such as projectType and testCommand. | |
| Full future contract now | Implement Phase 58-style filtering, conflict detection, probes, and validation metadata now. | |

**User's choice:** Use typed seed contract.
**Notes:** Keeps Phase 55 future-compatible without absorbing Phase 58 scope.

| Option | Description | Selected |
|--------|-------------|----------|
| Profile + obvious manifest only | Use bootstrap profile plus obvious manifests such as `package.json` scripts. | ✓ |
| Profile only | Only use Phase 53 profile values. | |
| Deep project scan | Inspect docs, CI, Makefile, README, and similar sources. | |

**User's choice:** Use profile plus obvious manifest only.
**Notes:** Deep discovery belongs to Phase 58.

| Option | Description | Selected |
|--------|-------------|----------|
| Write `status: "unknown"` item | Explicitly represent checked-but-unknown facts. | ✓ |
| Omit the item | Leave absent values out of the JSON. | |
| Fill profile default value | Invent defaults from profile assumptions. | |

**User's choice:** Write explicit unknown items.
**Notes:** Prevents downstream agents from mistaking guesses for facts.

---

## .mycodemap/assistants Asset Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Entry snippet + routing map | Short copy-paste snippets for entry docs that route to CodeMap assets. | ✓ |
| Full entry-file template | Full replacement templates for `CLAUDE.md` / `AGENTS.md`. | |
| Minimal include line | One or two include/reference lines only. | |

**User's choice:** Entry snippet plus routing map.
**Notes:** Avoids encouraging replacement of team-owned context files.

| Option | Description | Selected |
|--------|-------------|----------|
| Copyable examples, inactive by default | Provide JSON/TOML examples that users can copy into platform config. | ✓ |
| Automatically write platform config | Mutate `.claude/settings.json` or Codex agent config. | |
| Concept-only documentation | Describe the idea without structured example files. | |

**User's choice:** Copyable examples, inactive by default.
**Notes:** Keeps Phase 51's no-auto-rewrite safety boundary.

| Option | Description | Selected |
|--------|-------------|----------|
| Include short summary | Include project profile, paths, receipt, and unknown warnings. | ✓ |
| Completely generic template | Generate identical text for every project. | |
| Include full contract content | Inline the full env-contract JSON. | |

**User's choice:** Include short project-specific summary.
**Notes:** Do not inline the full env-contract content to avoid drift.

---

## init --json Output Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Complete `InitReceipt` | Emit the real receipt model with assets, summary, notes, and nextSteps. | ✓ |
| Compact adapter schema | Emit a smaller legacy shape such as converged/configPath/created/warnings. | |
| Human + JSON mixed output | Keep human text and append JSON. | |

**User's choice:** Output complete `InitReceipt`.
**Notes:** Matches the existing truth source in `src/cli/init/reconciler.ts`.

| Option | Description | Selected |
|--------|-------------|----------|
| stdout JSON only | Suppress human preview/receipt text from stdout in JSON mode. | ✓ |
| Human text to stderr, JSON to stdout | Preserve human commentary on stderr. | |
| Keep current human output and append JSON | Mix human text and JSON on stdout. | |

**User's choice:** stdout contains JSON only.
**Notes:** Ensures `mycodemap init --json` is script/agent parseable.

| Option | Description | Selected |
|--------|-------------|----------|
| Do not write; preview remains side-effect-free | Preview JSON returns receipt only; apply writes files. | ✓ |
| Write preview receipt | Persist preview receipt to `.mycodemap/status/init-last.json`. | |
| Add `--write-receipt` | Introduce another flag for preview persistence. | |

**User's choice:** Do not write preview receipts.
**Notes:** Preserves preview-by-default semantics from prior phases.

## Agent's Discretion

- Exact TypeScript module layout for assistant asset planning and writing.
- Exact field names in the typed env-contract seed, within the locked content boundary.
- Exact wording in generated assistant context files.
- Exact extractor list for obvious manifests.

## Deferred Ideas

- Full env-contract discovery, filtering, conflict detection, doctor checks, and `mycodemap env-contract` CLI.
- Automatic writes to platform-owned Claude/Codex config files.
- Runtime/session enforcement that subagents actually retrieve the contract.
