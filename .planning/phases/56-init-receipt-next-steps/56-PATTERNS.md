# Phase 56 Pattern Map: Init Receipt + Next Steps

## Files to Modify

### 1. `src/cli/init/reconciler.ts` — Personalized Next Steps

**Role:** Core logic for building receipt next steps from asset state
**Data flow:** `InitAsset[]` → `buildNextSteps()` → `string[]`

**Current analog:** `buildNextSteps()` at line 513-534
```typescript
function buildNextSteps(assets: InitAsset[]): string[] {
  const manualSteps = assets
    .filter((asset) => asset.status === 'manual-action-needed' && asset.manualAction)
    .map((asset) => asset.manualAction as string);
  if (manualSteps.length > 0) return manualSteps;
  const conflictSteps = assets
    .filter((asset) => asset.status === 'conflict' && asset.manualAction)
    .map((asset) => asset.manualAction as string);
  if (conflictSteps.length > 0) return conflictSteps;
  return ['运行 `mycodemap generate` 生成代码地图', '运行 `mycodemap --help` 查看更多命令'];
}
```

**Pattern:** Replace with priority-based personalized logic per D-05 to D-08. Classify assets by `origin` and `key` prefix to determine section, then generate specific steps per asset status.

### 2. `src/cli/init/receipt.ts` — Two-Section Receipt Layout

**Role:** Terminal rendering of init receipt
**Data flow:** `InitReceipt` → `renderInitReceipt()` → console output

**Current analog:** `renderInitReceipt()` at line 129-139
```typescript
export function renderInitReceipt(receipt: InitReceipt): void {
  console.log(chalk.blue('🧭 CodeMap init 收敛结果'));
  console.log(chalk.gray(`状态台账: ${relativePath(receipt.rootDir, receipt.receiptPath)}`));
  renderSection(receipt, '已完成 / 已同步', doneAssets(receipt));
  renderSection(receipt, '仍需人工处理', manualAssets(receipt));
  renderSection(receipt, '冲突 / 阻塞', conflictAssets(receipt));
  renderSection(receipt, '已跳过', skippedAssets(receipt));
  renderNotes(receipt);
  renderNextSteps(receipt);
}
```

**Pattern:** Add asset classification functions (`mainAgentAssets()`, `subagentAssets()`, `infrastructureAssets()`). Replace flat sections with two-group layout: "Main Agent" section and "Subagent" section, plus infrastructure group.

**Classification heuristic:**
- Main Agent: `key` starts with `assistant:` AND (`label` contains `context` OR `origin` is `rules`)
- Subagent: `key` starts with `assistant:` AND (`label` contains `hook` OR `label` contains `agent-example`)
- Infrastructure: everything else (workspace, config, hooks, storage, migration)

### 3. `src/cli/init/receipt.ts` — Team-File Sync Detection

**Role:** Detect if CLAUDE.md/AGENTS.md already reference `.mycodemap/`
**Data flow:** file path → read content → regex check → status

**New function pattern:**
```typescript
function detectTeamFileSync(rootDir: string, fileName: string): 'already-synced' | 'manual-action-needed' {
  const filePath = path.join(rootDir, fileName);
  if (!existsSync(filePath)) return 'manual-action-needed';
  const content = readFileSync(filePath, 'utf8');
  return /\.mycodemap\//i.test(content) ? 'already-synced' : 'manual-action-needed';
}
```

**Analog:** Similar to `safeReadText()` pattern in `assistant-plan.ts:32-37` and hash comparison at line 181.

### 4. `src/cli/commands/__tests__/init-command.test.ts` — New Tests

**Role:** Verify personalized next steps, two-section layout, sync detection
**Data flow:** temp dir → `executeInitCommand()` → read receipt → assert

**Current test pattern (line 57-66):**
```typescript
it('creates canonical config and receipt on a new project with --yes', async () => {
  // ...
  const receipt = JSON.parse(readFileSync(path.join(rootDir, '.mycodemap', 'status', 'init-last.json'), 'utf8'));
  expect(receipt.mode).toBe('apply');
  expect(receipt.assets).toEqual(expect.arrayContaining([...]));
  expect(receipt.nextSteps.join('\n')).toContain('...');
});
```

**Pattern:** Add test cases:
- `it('groups assistant assets into Main Agent and Subagent sections in receipt')`
- `it('generates personalized next steps based on installed assets')`
- `it('detects already-synced CLAUDE.md with .mycodemap/ references')`
- `it('reports manual-action-needed for CLAUDE.md without .mycodemap/ references')`

### 5. `README.md` — Quick Start Update

**Role:** Project landing page with installation and quick start
**Current:** Has installation section, features section, no init receipt explanation
**Pattern:** Add brief init receipt mention in quick start: install → init → review receipt → connect agent

### 6. `docs/SETUP_GUIDE.md` — Receipt Explanation

**Role:** Detailed setup guide
**Current:** Lines 79-97 describe init but don't explain receipt sections
**Pattern:** Add subsection explaining two-section receipt layout and what each section means

### 7. `docs/AI_ASSISTANT_SETUP.md` — Main-Agent/Subagent Sections

**Role:** Per-platform agent configuration guide
**Current:** Has per-platform sections (Kimi, Claude, Codex, Copilot)
**Pattern:** Add "Understanding Your Init Receipt" section explaining main-agent vs subagent distinction, and how each receipt section maps to platform configuration steps

## Cross-Cutting Patterns

- **No auto-rewrite:** All team-owned file interactions produce copy-paste snippets, never silent writes (established Phase 53-55)
- **Status-driven rendering:** Receipt sections determined by `InitAsset.status` and `InitAsset.origin` fields
- **Preview/apply parity:** Both `renderInitPreview` and `renderInitReceipt` should use the same classification logic
