# Phase 56 Research: Init Receipt + Next Steps

## Research Summary

Phase 56 enhances the init receipt with two-section layout (Main Agent vs Subagent), personalized next steps, already-synced detection for team-owned files, and doc synchronization.

## Key Findings

### 1. Current `buildNextSteps()` (reconciler.ts:513-534)

**Location:** `src/cli/init/reconciler.ts:513`

Current logic is simple priority cascade:
1. If any asset has `manual-action-needed` → return those `manualAction` strings
2. If any asset has `conflict` → return those `manualAction` strings
3. Fallback: fixed two-step welcome (`mycodemap generate`, `mycodemap --help`)

**Gap:** Does not distinguish Main Agent vs Subagent assets. Does not generate personalized guidance per installed asset. No already-synced detection for team files.

### 2. Current `renderInitReceipt()` (receipt.ts:129-139)

**Location:** `src/cli/init/receipt.ts:129`

Renders flat sections: "已完成 / 已同步", "仍需人工处理", "冲突 / 阻塞", "已跳过". Each asset rendered with status icon, label, path, details, rollback hint.

**Gap:** No two-section layout (Main Agent vs Subagent). Assets not grouped by runtime/purpose.

### 3. `InitReceipt` Model (reconciler.ts:45-56)

```typescript
interface InitReceipt {
  version: 1;
  generatedAt: string;
  mode: 'preview' | 'apply';
  rootDir: string;
  receiptPath: string;
  canonicalConfigPath: string;
  assets: InitAsset[];
  summary: Record<InitAssetStatus, number>;
  notes: string[];
  nextSteps: string[];
}
```

**Key insight:** `nextSteps: string[]` is already a field. Enhancing `buildNextSteps()` is the primary change point.

### 4. `InitAsset` Model (reconciler.ts:31-43)

```typescript
interface InitAsset {
  key: string;           // e.g. 'assistant:claude-context', 'hooks:pre-commit'
  label: string;
  status: InitAssetStatus;
  ownership: InitAssetOwnership;  // 'tool-owned' | 'team-owned' | 'user-owned'
  origin: string;        // e.g. 'assistant-bootstrap', 'hooks', 'rules'
  path?: string;
  details: string[];
  hash?: string;
  manualAction?: string;
  // ...
}
```

**Key insight:** `origin` field already distinguishes asset sources. `ownership` distinguishes tool-owned vs team-owned. These can be used to group assets into Main Agent vs Subagent sections.

### 5. Assistant Assets from Phase 55 (assistant-plan.ts)

Phase 55 generates 4 assistant assets via `createAssistantPlan()`:
- `assistant:claude-context` — `claude-context.md` (Main Agent)
- `assistant:agents-context` — `agents-context.md` (Main Agent)
- `assistant:claude-hook-example` — `claude-hook-example.json` (Subagent)
- `assistant:codex-agent-example` — `codex-agent-example.toml` (Subagent)

All have `origin: 'assistant-bootstrap'` and `ownership: 'tool-owned'`.

**Key insight:** The `key` prefix `assistant:` and the filename pattern already allow classification into Main Agent (context files) vs Subagent (hook/agent examples).

### 6. Asset Classification Logic

Main Agent assets:
- `key` starts with `assistant:` AND filename contains `context` → merge into CLAUDE.md/AGENTS.md
- `origin === 'rules'` → rules snippets

Subagent assets:
- `key` starts with `assistant:` AND filename contains `hook` OR `agent` → platform config examples
- `origin === 'hooks'` → hook payloads

Infrastructure assets (neither section):
- `origin` related to workspace, config, storage, migration → infrastructure

### 7. Already-Synced Detection for Team Files

**Target files:** `CLAUDE.md`, `AGENTS.md` at project root.

**Detection logic (from CONTEXT.md D-09 to D-12):**
- Read file content, check for `.mycodemap/` path references (case-insensitive)
- If found → `already-synced`
- If not found → `manual-action-needed` with copy-paste snippet
- If file doesn't exist → `manual-action-needed` with creation guidance

**Implementation approach:** New function in `reconciler.ts` or `receipt.ts` that reads team files and checks for `.mycodemap/` references. Returns status per file. This is separate from `InitAsset` — it's receipt-level enrichment.

### 8. Doc Sync Requirements (D-13 to D-15)

Three docs need updating:
1. **README.md** — Quick start: install → init → preview → connect agent
2. **docs/SETUP_GUIDE.md** — Detailed setup with receipt explanation (currently at line 79+)
3. **docs/AI_ASSISTANT_SETUP.md** — Agent connection guide with main-agent/subagent sections

Current SETUP_GUIDE.md already mentions init at line 79-97. Needs enhancement to describe two-section receipt.

Current AI_ASSISTANT_SETUP.md has per-platform sections. Needs a new "init receipt" section explaining what each receipt section means.

### 9. Test Patterns

Existing tests in `src/cli/commands/__tests__/init-command.test.ts`:
- Use `mkdtempSync` for isolated temp dirs
- Call `executeInitCommand(rootDir, { yes: true })` for apply mode
- Read receipt JSON from `.mycodemap/status/init-last.json`
- Assert on `receipt.assets`, `receipt.nextSteps`, `receipt.mode`

Pattern for new tests: same approach, add assertions for two-section grouping, personalized next steps, and already-synced detection.

### 10. Integration Points

| Change | File | What |
|--------|------|------|
| Enhance `buildNextSteps()` | `reconciler.ts:513` | Priority-based personalized steps per D-05 to D-08 |
| Add asset classification | `receipt.ts` or new util | Group assets into Main Agent / Subagent / Infrastructure |
| Enhance `renderInitReceipt()` | `receipt.ts:129` | Two-section layout with classification |
| Add team-file detection | New function | Check CLAUDE.md/AGENTS.md for `.mycodemap/` refs |
| Update README.md | Root | Quick start flow |
| Update SETUP_GUIDE.md | `docs/` | Receipt explanation |
| Update AI_ASSISTANT_SETUP.md | `docs/` | Main-agent/subagent sections |
| New tests | `__tests__/` | Personalized steps, two-section receipt, sync detection |

## Risks

1. **Asset classification ambiguity:** Some assets (e.g., hooks) could be seen as either main-agent or subagent. Mitigation: use explicit classification based on `origin` and `key` patterns.
2. **Team file detection false positives:** A CLAUDE.md might mention `.mycodemap/` in a comment or documentation context without actually being synced. Mitigation: check for specific path patterns like `.mycodemap/assistants/` or `.mycodemap/env-contract.json`.
3. **Doc update scope creep:** Three docs is a lot of surface area. Mitigation: keep changes minimal — add receipt explanation sections, don't rewrite entire docs.

## Patterns from Prior Phases

- Phase 53 established `InitReceipt` and `InitAssetStatus` models
- Phase 54 separated preview from apply mode
- Phase 55 added assistant assets with `origin: 'assistant-bootstrap'`
- All phases follow: preview default, apply requires `-y`, tool-owned files writable, team-owned files never silently rewritten
