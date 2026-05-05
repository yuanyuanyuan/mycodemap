# Phase 55: Agent Bootstrap Assets - Research

**Researched:** 2026-05-02
**Status:** Complete

## Key Findings

### 1. InitAsset/InitReceipt Model

The reconciler (`src/cli/init/reconciler.ts`) defines a composable asset model:

- `InitAsset` carries `key`, `label`, `status` (7 states), `ownership` (tool-owned/team-owned/user-owned), `origin`, `details[]`, optional `hash`, `rollbackHint`, `manualAction`.
- `InitReceipt` aggregates all assets with `summary` counts, `notes`, `nextSteps`.
- `InitPlan` bundles receipt + action structs for each asset family.

**Pattern for adding a new asset family:** Create a `*Plan` interface with `assets: InitAsset[]` and `writes: FileWriteAction[]`, a `create*Plan()` function, and an `apply*Plan()` async function. Spread `plan.assets` into `createInitPlan()`'s asset array. Call `apply*Plan()` from `applyInitPlan()`.

Existing families: workspace, config, legacy-config, hooks, rules, profile, first-run-marker, status-ledger.

### 2. Team-Owned File Handling (aiContextAsset pattern)

`src/cli/init/rules.ts` lines 140-177 show the `aiContextAsset()` pattern:

- Check if `CLAUDE.md` or `AGENTS.md` already references `.mycodemap/rules/`.
- If yes: return `already-synced` asset.
- If no: return `manual-action-needed` asset with copy-paste snippet embedded in `details[]`.
- **Never** writes to team-owned files. The snippet is in the receipt output only.

**Phase 55 should replicate this pattern** for `claude-context.md` and `agents-context.md` content — embed the snippet in the receipt/details, don't auto-rewrite `CLAUDE.md`/`AGENTS.md`.

### 3. Profile Data Available for env-contract Seed

`src/cli/init/profile-plan.ts` provides `ProfilePlan` with `mergedConfigText` and `profileName`. The `loadProfile()` function returns a `BootstrapProfile` with:
- `parser.include[]` — file patterns
- `ignore[]` — ignore patterns
- `analysis_depth` — shallow/standard/deep
- `recommended_rules[]` — rule categories

For env-contract seed items, the profile provides: project type name, parser config, analysis depth. Manifest extraction (package.json scripts, etc.) is new code.

### 4. Commander Registration Gap

`src/cli/index.ts` line 125-130: init command registration has `--yes`, `--interactive`, `--profile` but **no `--json`**. The interface contract (`src/cli/interface-contract/commands/init.ts`) already declares `--json` in flags but the commander doesn't register it.

**Fix needed:** Add `--json` and `--assistant-profile` to commander registration.

### 5. Receipt Rendering — No JSON Mode

`src/cli/init/receipt.ts` always prints human text via `console.log(chalk.*)`. There's no JSON stdout path.

**Fix needed:** In `executeInitCommand()`, when `--json` is set, write `JSON.stringify(receipt)` to stdout and skip `renderInitPreview()`/`renderInitReceipt()`. Warnings/errors go to stderr.

### 6. Interface Contract Mismatch

The current interface contract output shape declares `{ converged, configPath, created[], warnings[] }` — this does NOT match the real `InitReceipt` shape. The contract needs updating to reflect the actual receipt structure.

### 7. Existing Test Patterns

Four test files:
- `init-command.test.ts` — fresh init, migration, legacy drift, idempotency, preview
- `init-hooks.test.ts` — hook payload, shim, gitignore, conflict detection
- `init-profile.test.ts` — profile detection, apply, preview, refusal
- `init-rules.test.ts` — no-auto-rewrite, manual AI context snippet

Tests use `createInitPlan()` directly with temp directories. Pattern: create temp dir, write fixture files, call `createInitPlan()`, assert on `plan.receipt.assets`.

### 8. Env-Contract Seed Schema

Based on D-05 through D-08, the seed contract shape:

```json
{
  "schemaVersion": "env-contract.seed.v1",
  "generatedAt": "ISO-8601",
  "projectProfile": { "name": "nodejs", "source": "package.json", "confidence": "high" },
  "items": [
    { "category": "execution", "key": "testCommand", "value": "npm test", "source": "package.json:scripts.test", "confidence": "high" },
    { "category": "execution", "key": "buildOutput", "status": "unknown", "source": "not-detected", "confidence": "none" }
  ]
}
```

Categories: `execution`, `commit`, `retrieval`, `validation`, `style` (from Phase 58). Phase 55 focuses on `execution` items from obvious manifests.

### 9. Manifest Extractors (D-07 bounded)

Simple extractors for obvious manifests:
- `package.json`: `scripts.test`, `scripts.build`, `scripts.lint`, `main`, `type`
- `pyproject.toml`: `[project]` name, `[tool.pytest]` if present
- `go.mod`: module name
- `Cargo.toml`: package name, `[dependencies]` count

These are read-only JSON/TOML parses, not deep inference. TOML requires `smol-toml` (already installed in Phase 54).

## Risks

1. **InitPlan interface change:** Adding `assistantPlan` and `envContractPlan` to `InitPlan.actions` is a breaking change to the internal type. All callers of `createInitPlan()` and `applyInitPlan()` must be updated. Low risk since these are internal-only.

2. **JSON stdout purity:** Must ensure no `console.log()` leaks to stdout in `--json` mode. The `executeInitCommand()` currently always prints before returning. Need to gate all stdout writes on `!options.json`.

3. **TOML parsing:** `smol-toml` was added in Phase 54 but only for `preview` command. Verify it's available for init's env-contract generator.

## Artifacts to Create

| File | Purpose |
|------|---------|
| `src/cli/init/assistant-plan.ts` | Assistant asset generation (4 files) |
| `src/cli/init/env-contract-plan.ts` | Env-contract seed generation |
| `src/cli/init/manifest-extractors.ts` | Simple manifest fact extraction |
| `src/cli/commands/__tests__/init-assistant.test.ts` | Assistant asset tests |
| `src/cli/commands/__tests__/init-env-contract.test.ts` | Env-contract tests |

## Artifacts to Modify

| File | Change |
|------|--------|
| `src/cli/index.ts` | Add `--json`, `--assistant-profile` to init command |
| `src/cli/commands/init.ts` | Add `json`, `assistantProfile` to options; gate stdout; wire new plans |
| `src/cli/init/reconciler.ts` | Add `assistantPlan`, `envContractPlan` to `InitPlan`; spread assets; call apply |
| `src/cli/init/receipt.ts` | Add JSON output mode (skip human rendering) |
| `src/cli/interface-contract/commands/init.ts` | Add `--assistant-profile` flag; update output shape to match real InitReceipt |

---

*Phase: 55-agent-bootstrap-assets*
*Research completed: 2026-05-02*
