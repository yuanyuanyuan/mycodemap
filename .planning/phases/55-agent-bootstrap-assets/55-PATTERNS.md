# Phase 55: Agent Bootstrap Assets - Pattern Map

**Generated:** 2026-05-02

## Files to Create

### 1. `src/cli/init/assistant-plan.ts` (NEW)

**Role:** Generate per-runtime assistant bootstrap assets under `.mycodemap/assistants/`.
**Data flow:** Input: rootDir, assistantProfile filter → Output: `AssistantPlan { assets, writes }`

**Closest analog:** `src/cli/init/rules.ts` — `createRulesPlan()` pattern

**Code excerpt (rules.ts asset pattern):**
```typescript
export interface RulesPlan {
  assets: InitAsset[];
  writes: FileWriteAction[];
}

export function createRulesPlan(rootDir: string): RulesPlan {
  const writes: FileWriteAction[] = [];
  return {
    assets: [...ruleAssets(rootDir, writes), aiContextAsset(rootDir)],
    writes,
  };
}

export async function applyRulesPlan(plan: RulesPlan): Promise<void> {
  for (const writeAction of plan.writes) {
    await mkdir(path.dirname(writeAction.targetPath), { recursive: true });
    await writeFile(writeAction.targetPath, writeAction.content, 'utf8');
  }
}
```

**Key pattern:** `aiContextAsset()` in rules.ts lines 140-177 handles team-owned files by detecting existing references and returning `manual-action-needed` with copy-paste snippet. Assistant context files should follow this same pattern.

---

### 2. `src/cli/init/env-contract-plan.ts` (NEW)

**Role:** Generate `.mycodemap/env-contract.json` seed from profile + manifest facts.
**Data flow:** Input: rootDir, BootstrapProfile, manifest facts → Output: `EnvContractPlan { assets, writes }`

**Closest analog:** `src/cli/init/profile-plan.ts` — `createProfilePlan()` pattern

**Code excerpt (profile-plan.ts merged config pattern):**
```typescript
export interface ProfilePlan {
  assets: InitAsset[];
  writes: FileWriteAction[];
  mergedConfigText?: string;
  profileName?: string;
}

function buildMergedConfigText(profile: BootstrapProfile): string {
  const defaults = createDefaultCodemapConfigFile();
  const merged = {
    ...defaults,
    mode: mapAnalysisDepth(profile.analysis_depth),
    include: [...profile.parser.include],
    exclude: [...defaults.exclude, ...profile.ignore],
  };
  return JSON.stringify(merged, null, 2);
}
```

**Key difference:** env-contract-plan writes a JSON file (not config merge) and needs manifest extraction. Single write action for `.mycodemap/env-contract.json`.

---

### 3. `src/cli/init/manifest-extractors.ts` (NEW)

**Role:** Extract obvious project facts from package.json, pyproject.toml, go.mod, Cargo.toml.
**Data flow:** Input: rootDir → Output: `ManifestFacts { items[] }`

**Closest analog:** `src/cli/init/detect.ts` — marker file scanning

**Code excerpt (detect.ts marker scanning):**
```typescript
const MARKERS: Record<ProjectType, string[]> = {
  nodejs: ['package.json'],
  python: ['pyproject.toml', 'setup.py', 'requirements.txt'],
  go: ['go.mod'],
  rust: ['Cargo.toml'],
};
```

**Key pattern:** Simple `existsSync` + `readFileSync` + JSON.parse / TOML parse. Returns structured facts, not raw file content. Uses `smol-toml` for TOML parsing (already available from Phase 54).

---

## Files to Modify

### 4. `src/cli/init/reconciler.ts` (MODIFY)

**Role:** Aggregate all asset families into InitPlan.
**Change:** Add `assistantPlan` and `envContractPlan` to `InitPlan.actions`; spread their assets into `createInitPlan()`; call `applyAssistantPlan()` and `applyEnvContractPlan()` from `applyInitPlan()`.

**Code excerpt (current createInitPlan asset aggregation):**
```typescript
const assets: InitAsset[] = [
  buildWorkspaceAsset(scan),
  buildConfigAsset(scan),
  ...buildLegacyRootConfigAssets(scan),
  buildStatusLedgerAsset(scan, mode),
  ...hookPlan.assets,
  ...rulesPlan.assets,
  ...profilePlan.assets,
  buildFirstRunAsset(scan),
];
```

**Pattern:** Add `...assistantPlan.assets` and `...envContractPlan.assets` to this array.

**Code excerpt (current applyInitPlan):**
```typescript
export async function applyInitPlan(plan: InitPlan): Promise<InitReceipt> {
  const paths = receiptPaths(plan.receipt);
  await ensureWorkspaceDirectories(paths);
  await maybeWriteCanonicalConfig(paths, plan);
  await applyHookPlan(plan.actions.hookPlan);
  await applyRulesPlan(plan.actions.rulesPlan);
  await applyProfilePlan(plan.actions.profilePlan);
  return plan.receipt;
}
```

**Pattern:** Add `await applyAssistantPlan(plan.actions.assistantPlan)` and `await applyEnvContractPlan(plan.actions.envContractPlan)`.

---

### 5. `src/cli/commands/init.ts` (MODIFY)

**Role:** Commander options and stdout gating.
**Change:** Add `json` and `assistantProfile` to `InitCommandOptions`; gate `console.log` on `!options.json`; wire new plan parameters.

**Code excerpt (current options):**
```typescript
export interface InitCommandOptions {
  yes?: boolean;
  interactive?: boolean;
  cwd?: string;
  profile?: string;
}
```

**Pattern:** Add `json?: boolean` and `assistantProfile?: string`.

**Code excerpt (current stdout in executeInitCommand):**
```typescript
console.log(chalk.blue('🚀 初始化 CodeMap...'));
if (mode === 'preview') {
  renderInitPreview(plan.receipt);
  return plan.receipt;
}
const receipt = await applyInitPlan(plan);
await writeInitReceipt(receipt);
renderInitReceipt(receipt);
return receipt;
```

**Pattern:** Gate all `console.log` and `render*` calls on `!options.json`. In JSON mode, only `JSON.stringify(receipt)` goes to stdout.

---

### 6. `src/cli/index.ts` (MODIFY)

**Role:** Commander registration for init command.
**Change:** Add `--json` and `--assistant-profile` options.

**Code excerpt (current init registration):**
```typescript
program
  .command('init')
  .description('初始化并收敛 CodeMap 项目状态')
  .option('-y, --yes', '使用默认配置')
  .option('--interactive', '仅显示 reconciliation preview，不写入文件')
  .option('--profile <name>', '指定 bootstrap profile...')
  .action(initCommand);
```

**Pattern:** Add `.option('-j, --json', 'JSON 格式输出')` and `.option('--assistant-profile <runtime>', '指定 assistant runtime (claude|codex|generic)')`.

---

### 7. `src/cli/init/receipt.ts` (MODIFY)

**Role:** Receipt rendering.
**Change:** Minimal — the JSON bypass happens in `executeInitCommand()`, not in receipt.ts. But may need a `renderInitReceiptJson()` helper if we want to keep receipt.ts as the single rendering authority.

---

### 8. `src/cli/interface-contract/commands/init.ts` (MODIFY)

**Role:** Interface contract declaration.
**Change:** Add `--assistant-profile` flag. Update `outputShape` to match real `InitReceipt` structure (current shape is stale).

---

## Summary

| File | Action | Analog Pattern |
|------|--------|---------------|
| `src/cli/init/assistant-plan.ts` | CREATE | rules.ts (RulesPlan + aiContextAsset) |
| `src/cli/init/env-contract-plan.ts` | CREATE | profile-plan.ts (ProfilePlan) |
| `src/cli/init/manifest-extractors.ts` | CREATE | detect.ts (marker scanning) |
| `src/cli/init/reconciler.ts` | MODIFY | Add 2 plan families to InitPlan |
| `src/cli/commands/init.ts` | MODIFY | Add options, gate stdout |
| `src/cli/index.ts` | MODIFY | Add commander options |
| `src/cli/init/receipt.ts` | MODIFY | JSON output mode |
| `src/cli/interface-contract/commands/init.ts` | MODIFY | Add flag, update output shape |

---

*Phase: 55-agent-bootstrap-assets*
*Pattern map completed: 2026-05-02*
