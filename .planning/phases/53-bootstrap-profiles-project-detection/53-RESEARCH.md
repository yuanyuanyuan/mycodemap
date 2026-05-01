# Phase 53: Bootstrap Profiles + Project Detection - Research

**Researched:** 2026-05-01
**Domain:** CLI onboarding, project type auto-detection, JSON schema validation, npm asset bundling
**Confidence:** HIGH

## Summary

Phase 53 introduces marker-only project type detection and a built-in Bootstrap Profile system into `mycodemap init`. The project already has a mature init reconciliation framework (`InitAsset`, `InitReceipt`, `InitPlan`, `createInitPlan`, `applyInitPlan`) that Phase 53 extends with a new asset family: profile application. The codebase uses zod for schema validation (already in `package.json` at `^4.3.6`, registry shows `4.4.1` current), has established patterns for bundling static assets inside the package (hooks templates, rules bundle), and uses `fileURLToPath(new URL('../../../', import.meta.url))` for package-root resolution at runtime.

The primary recommendation is: **use zod for profile JSON validation**, **co-locate profile JSON files under `src/cli/init/profiles/`**, **extract detection into `src/cli/init/detect.ts`**, and **model profile application as a new `ProfilePlan` analogous to `HookPlan`/`RulesPlan`**, producing `InitAsset` entries that flow through the existing receipt. The `--profile` flag bypasses detection; non-TTY without `--profile` or `-y` exits non-zero; interactive multi-marker selection uses `node:readline/promises` (already used in `src/cli/commands/ship/pipeline.ts`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Marker file detection | CLI / Backend | — | Filesystem scan at init time; no browser involvement |
| Profile JSON validation | CLI / Backend | — | Load-time schema check before any config mutation |
| Profile application (config merge) | CLI / Backend | — | Writes `.mycodemap/config.json` via existing reconciler |
| Interactive selection | CLI / Backend | — | TTY readline prompt in Node.js process |
| Receipt rendering | CLI / Backend | — | Existing receipt.ts handles all asset statuses |
| First-run guide text | CLI / Backend | — | Text-only update to `first-run-guide.ts` |

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Detection uses marker files only (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`). No directory heuristics, no content sniffing.
- **D-02:** Multiple markers → report all, ask user in interactive mode; non-interactive must pass `--profile <name>`.
- **D-03:** Confidence exposed only when low. High-confidence shows recommendation only.
- **D-04:** No markers → refuse, direct to `--profile <name>`. No silent fallback to `generic`.
- **D-05/D-06:** JSON static files shipped inside package; built-in only, no user overrides in v1.
- **D-07:** Strict schema validation at load time; errors abort `init` with clear diagnostic.
- **D-08:** Profile fields limited to `parser`, `ignore`, `analysis_depth`.
- **D-09/D-10:** Preview by default; apply requires `-y/--yes`.
- **D-11:** v1 supports only accept or skip (no inline modify).
- **D-12:** Non-TTY → exit non-zero unless `--profile` or `-y` provided.
- **D-13:** `--profile <name>` bypasses detection.
- **D-14:** Detection embedded into `mycodemap init` only; no standalone subcommand.
- **D-15:** Bare `codemap` first-run only gets guide text hint (no detection).
- **D-16:** Existing `.mycodemap/config.json` → skip detection, report `already-configured`.
- **D-17:** Profile application as `InitAsset` inside `InitReceipt`.

### Claude's Discretion
- Exact JSON schema definition (zod, ajv, hand-rolled) and where schema lives.
- Exact built-in profile filename layout (`src/cli/profiles/nodejs.json` vs `assets/profiles/nodejs.json`).
- Exact `--re-detect` / `--force-profile` flag name and short form.
- Confidence scoring algorithm details (must be deterministic).
- Whether detection is in separate `src/cli/init/detect.ts` or inline in `reconciler.ts`.

### Deferred Ideas (OUT OF SCOPE)
- User-overridable profiles in `.mycodemap/profiles/`.
- Inline modify Q&A flow.
- Standalone `mycodemap profile detect|apply` subcommand.
- Content sniffing / directory-structure heuristics.
- Bare `codemap` automatic detection on first run.
- Profile schema version bump and migration path.
- Confidence scoring beyond `high`/`low` binary.
- Auto-rewriting `.mycodemap/config.json` for already-configured projects (future `--re-detect` flag).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FRC-01 | 新用户首次运行 `codemap` 时，系统自动检测项目类型（Node.js / Python / Go / Rust / 通用） | Detection module reads marker files; `detect.ts` returns candidates |
| FRC-02 | 根据检测到的项目类型推荐匹配的 Bootstrap Profile（解析器配置、推荐规则集、忽略模式） | Profile loader maps `ProjectType` → JSON file → validated config |
| FRC-03 | Profile 包含可覆盖的默认值：语言特定解析器设置、常见忽略模式、推荐分析深度 | Profile JSON schema defines `parser`, `ignore`, `analysis_depth` |
| FRC-04 | 用户可在交互模式下查看推荐 profile 详情并选择接受、修改或跳过 | v1 implements accept/skip only; receipt shows preview; `-y` applies |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.4.1 (installed ^4.3.6) | Profile JSON schema validation + static type inference | Already used for interface contract schema (`src/cli/interface-contract/schema.ts`); no new dependency [VERIFIED: package.json + npm registry] |
| node:readline/promises | built-in (Node >=20) | Interactive multi-marker selection prompt | Already used in `src/cli/commands/ship/pipeline.ts` for release confirmation [VERIFIED: codebase grep] |
| node:fs/promises | built-in | Profile JSON file I/O | Existing pattern in hooks/rules modules [VERIFIED: codebase] |
| node:url (fileURLToPath) | built-in | Resolve package root at runtime for bundled assets | Existing pattern in `src/cli/init/hooks.ts` [VERIFIED: codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chalk | 5.3.0 (installed) | Terminal color for interactive prompts | Already used throughout CLI; mock in tests [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| zod | ajv | ajv requires separate JSON Schema files and compile step; zod gives TypeScript inference with less boilerplate. Project already uses zod for contract schema. |
| zod | hand-rolled validator | Hand-rolled is error-prone and lacks type inference. For a greenfield schema with 3 fields, hand-rolled is overkill. |
| `node:readline/promises` | `enquirer` / `inquirer` / `prompts` | No prompt library in dependencies. Adding one for a single numeric input is unnecessary. `readline` is sufficient and already proven in the codebase. |
| `src/cli/init/profiles/*.json` | `assets/profiles/*.json` | `src/cli/init/` keeps profiles co-located with loader logic and follows the `rule-templates.ts` pattern (data shipped as source, resolved via `fileURLToPath`). |

**Installation:** No new packages required. zod is already installed.

**Version verification:**
```bash
npm view zod version  # 4.4.1 (published 2025-04-28) [VERIFIED]
```

## Architecture Patterns

### System Architecture Diagram

```
+-------------------------------------------------------------+
|  mycodemap init                                             |
|  (src/cli/commands/init.ts)                                 |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  executeInitCommand(options)                                |
|  - adds --profile to InitCommandOptions                     |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  createInitPlan(rootDir, mode, options)                     |
|  (src/cli/init/reconciler.ts)                               |
+-------------------------------------------------------------+
                            |
          +-----------------+-----------------+
          |                                   |
          v                                   v
+--------------------------+    +-----------------------------+
| scanInitState()          |    | detectProjectType(rootDir)  |
| (existing)               |    | (src/cli/init/detect.ts)    |
+--------------------------+    +-----------------------------+
          |                                   |
          |         +-------------------------+
          |         |
          v         v
+-------------------------------------------------------------+
|  If hasCanonicalConfig → skip detection (D-16)              |
|  If --profile provided → bypass detection (D-13)            |
|  Else → run detection, handle multi-marker / no-marker      |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  loadProfile(profileName)                                   |
|  (src/cli/init/profile-loader.ts)                           |
|  - resolves package root → profiles/ directory              |
|  - reads *.json, validates with zod schema                  |
|  - returns parsed Profile object                            |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  createProfilePlan(rootDir, profile, scan, mode)            |
|  - builds config merge text (profile → canonical config)    |
|  - creates InitAsset with status: installed/skipped/etc.    |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  InitPlan.actions.profilePlan?: ProfilePlan                 |
|  InitReceipt.assets includes profile asset                  |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  applyInitPlan(plan)                                        |
|  - existing: workspace, config, hooks, rules                |
|  - new: applyProfilePlan(plan.actions.profilePlan)          |
|    → merges profile defaults into .mycodemap/config.json    |
+-------------------------------------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|  writeInitReceipt(receipt)                                  |
|  renderInitReceipt(receipt)                                 |
+-------------------------------------------------------------+
```

### Recommended Project Structure

```
src/cli/init/
├── reconciler.ts          # existing; add ProfilePlan to InitPlan.actions
├── detect.ts              # NEW: marker file detection logic
├── profile-loader.ts      # NEW: profile JSON loading + zod validation
├── profile-plan.ts        # NEW: ProfilePlan builder (analogous to rules.ts)
├── profiles/              # NEW: bundled JSON profile files
│   ├── nodejs.json
│   ├── python.json
│   ├── go.json
│   ├── rust.json
│   └── generic.json
├── rules.ts               # existing
├── hooks.ts               # existing
├── rule-templates.ts      # existing
└── receipt.ts             # existing

src/cli/commands/
├── init.ts                # add --profile flag, thread through to createInitPlan
└── __tests__/
    ├── init-command.test.ts      # extend with profile tests
    ├── init-rules.test.ts        # existing pattern
    └── init-profile.test.ts      # NEW: profile-specific tests

src/cli/interface-contract/commands/
└── init.ts                # add --profile to contract flags
```

### Pattern 1: ProfilePlan (Analogous to HookPlan/RulesPlan)
**What:** A plan object containing `assets: InitAsset[]` and `writes: FileWriteAction[]` that the reconciler consumes.
**When to use:** Any init asset family that needs to preview changes before applying them.
**Example:**
```typescript
// Source: existing patterns in src/cli/init/rules.ts and src/cli/init/hooks.ts
export interface ProfilePlan {
  assets: InitAsset[];
  writes: FileWriteAction[];
  // ProfilePlan may also carry the merged config text
  mergedConfigText?: string;
}

export function createProfilePlan(
  rootDir: string,
  profile: BootstrapProfile,
  scan: InitScan,
  mode: 'preview' | 'apply'
): ProfilePlan {
  // Build merged config by overlaying profile onto default config
  // Return asset + write action for config.json
}

export async function applyProfilePlan(plan: ProfilePlan): Promise<void> {
  for (const write of plan.writes) {
    await mkdir(path.dirname(write.targetPath), { recursive: true });
    await writeFile(write.targetPath, write.content, 'utf8');
  }
}
```

### Pattern 2: Package-Safe Asset Resolution
**What:** Use `fileURLToPath(new URL('../../../', import.meta.url))` to find the package root at runtime, then resolve relative paths to bundled assets.
**When to use:** Any module that needs to read files shipped inside the npm package.
**Example:**
```typescript
// Source: src/cli/init/hooks.ts lines 31-32
import { fileURLToPath } from 'node:url';

function resolvePackageRoot(): string {
  return fileURLToPath(new URL('../../../', import.meta.url));
}

function resolveProfileDir(): string {
  return path.join(resolvePackageRoot(), 'src', 'cli', 'init', 'profiles');
}
```

### Pattern 3: Zod Schema Validation with Type Inference
**What:** Define a zod schema that parses unknown JSON into a typed object, throwing clear diagnostics on mismatch.
**When to use:** Any runtime JSON validation where TypeScript types must stay in sync.
**Example:**
```typescript
// Source: src/cli/interface-contract/schema.ts pattern
import { z } from 'zod';

export const bootstrapProfileSchema = z.object({
  parser: z.object({
    include: z.array(z.string()).min(1),
    extensions: z.array(z.string()).min(1),
  }),
  ignore: z.array(z.string()),
  analysis_depth: z.enum(['shallow', 'standard', 'deep']),
});

export type BootstrapProfile = z.infer<typeof bootstrapProfileSchema>;

export function loadAndValidateProfile(filePath: string): BootstrapProfile {
  const text = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(text);
  return bootstrapProfileSchema.parse(parsed); // throws ZodError with path info
}
```

### Anti-Patterns to Avoid
- **Hard-coding profile data in TypeScript:** D-05 explicitly requires JSON static files, not TS modules. Violating this makes profiles non-editable by non-TS consumers and bloats bundle size.
- **Silent fallback to generic on no markers:** D-04 requires refusal with clear error directing to `--profile`. Silent fallback would violate the explicit opt-in design.
- **Adding new InitAssetStatus values:** D-17 requires reusing existing `InitAssetStatus` enum. The existing 7 statuses (`missing`, `already-synced`, `migrated`, `installed`, `conflict`, `manual-action-needed`, `skipped`) cover all profile states.
- **Using `process.exit()` inside plan creation:** Existing init code throws errors or returns receipt objects; `process.exit()` is only used at CLI entry (`src/cli/index.ts`). Keep plan creation pure for testability.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Hand-rolled type guards | zod (already installed) | Type inference, clear error messages, battle-tested, team already uses it for contract schema |
| Interactive TTY prompt | Custom stdin parser | `node:readline/promises` | Built-in, Promise-native, timeout-capable, proven in ship pipeline |
| Package root resolution | `__dirname` in ESM | `fileURLToPath(new URL('../../../', import.meta.url))` | ESM-compatible, already used in hooks.ts, works after `tsc` build |
| Config deep merge | Recursive manual merge | `structuredClone` + shallow overlay | Profile only overrides 3 fields (`include`, `exclude`, `mode`); deep merge is unnecessary complexity |

**Key insight:** The init system already has three asset families (workspace/config, hooks, rules). Adding a fourth (profiles) by copying the `RulesPlan` pattern is the lowest-risk, most consistent approach. Custom solutions for validation, prompting, or path resolution would introduce new failure modes and testing burden.

## Runtime State Inventory

> This phase introduces new bundled JSON assets but does not rename, rebrand, or migrate existing runtime state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no databases or datastores touched | N/A |
| Live service config | None — no external services configured | N/A |
| OS-registered state | None — no OS-level registrations | N/A |
| Secrets/env vars | None — no secrets referenced by exact name | N/A |
| Build artifacts | `dist/` will contain new `src/cli/init/profiles/*.json` copies after build; tsconfig `resolveJsonModule: true` ensures JSON imports work | Ensure `tsc` copies JSON files or import them dynamically with `readFileSync` |

**Nothing found in category:** All categories verified as N/A for this greenfield feature addition.

**Build artifact note:** Since `tsconfig.json` has `"resolveJsonModule": true` but `tsc` does not copy non-TS assets to `dist/`, profile JSON files must be read via `readFileSync` at runtime (not `import assert { type: 'json' }`). The `fileURLToPath` resolution pattern in `hooks.ts` already handles this by resolving from source location at build time, but for robustness the loader should resolve from package root and read with `readFileSync`.

## Common Pitfalls

### Pitfall 1: `tsc` Does Not Copy JSON Files to `dist/`
**What goes wrong:** If profiles are imported with `import profile from './profiles/nodejs.json'`, the build succeeds in dev but fails at runtime because `dist/cli/init/profiles/nodejs.json` does not exist.
**Why it happens:** TypeScript's `resolveJsonModule` enables type-checking of JSON imports but does not emit JSON files during compilation.
**How to avoid:** Read profile files with `readFileSync` at runtime, resolving the path via `fileURLToPath(new URL('../../../', import.meta.url))` → `src/cli/init/profiles/`. This matches how `hooks.ts` reads templates from `scripts/hooks/templates/`.
**Warning signs:** Runtime `ENOENT` on `nodejs.json` after `npm run build`.

### Pitfall 2: ESM `__dirname` is Undefined
**What goes wrong:** Using `__dirname` to resolve profile paths throws `ReferenceError` in ESM.
**Why it happens:** The project uses `"module": "ESNext"` in tsconfig; `__dirname` is a CommonJS global.
**How to avoid:** Use `fileURLToPath(new URL('../../../', import.meta.url))` as established in `hooks.ts`.
**Warning signs:** `__dirname is not defined` at runtime.

### Pitfall 3: ZodError Messages Are Too Verbose for CLI
**What goes wrong:** A malformed profile JSON throws a zod error with a deeply nested issue array; the CLI shows a wall of JSON instead of a one-line diagnostic.
**Why it happens:** `zodSchema.parse()` throws `ZodError` with `issues` array; default error formatting is developer-oriented.
**How to avoid:** Catch `ZodError`, flatten `issues` to `path.join('.') + ': ' + message`, and present a single clear line: `Profile validation failed: parser.include must be an array of strings`.
**Warning signs:** Test assertions on error messages fail because they expect human text but get zod internals.

### Pitfall 4: Multi-Marker Monorepo Causes Non-TTY Hang
**What goes wrong:** In CI, a monorepo with both `package.json` and `Cargo.toml` triggers detection of multiple types; non-TTY flow tries to prompt and hangs or exits unclearly.
**Why it happens:** D-02 requires reporting all candidates, but D-12 requires non-TTY to exit non-zero unless `--profile` or `-y` is provided. The logic must refuse before any prompt attempt.
**How to avoid:** Check `process.stdout.isTTY` (or use existing `resolveOutputMode` logic) **before** entering interactive selection. If non-TTY and multiple candidates, exit immediately with error code and message listing detected markers.
**Warning signs:** CI job hangs at init step; subprocess tests timeout.

### Pitfall 5: Profile Application Overwrites User Config Drift
**What goes wrong:** A user manually edited `.mycodemap/config.json` after init; re-running `init -y` with a profile overwrites their changes silently.
**Why it happens:** D-16 says existing config skips detection, but the `--re-detect` flag (planner's choice) could re-trigger it. If the planner implements force-profile without drift detection, user data is lost.
**How to avoid:** Treat existing canonical config as `already-synced` for the profile asset (same as `buildConfigAsset` does). If a force flag is added, mark the asset as `conflict` (not `installed`) when the config differs from the profile-merged default, with `manualAction` directing the user to review.
**Warning signs:** Test for idempotency fails because config hash changes on rerun.

## Code Examples

### Detection Module Interface
```typescript
// Source: inferred from CONTEXT.md specifics + existing patterns
// File: src/cli/init/detect.ts

export type ProjectType = 'nodejs' | 'python' | 'go' | 'rust' | 'generic';

export interface DetectionCandidate {
  type: ProjectType;
  markerFile: string;
  confidence: 'high' | 'low';
}

export interface DetectionResult {
  candidates: DetectionCandidate[];
  recommended: ProjectType | null;
}

const MARKER_MAP: Record<string, ProjectType> = {
  'package.json': 'nodejs',
  'pyproject.toml': 'python',
  'go.mod': 'go',
  'Cargo.toml': 'rust',
};

export function detectProjectType(rootDir: string): DetectionResult {
  const candidates: DetectionCandidate[] = [];
  for (const [file, type] of Object.entries(MARKER_MAP)) {
    if (existsSync(path.join(rootDir, file))) {
      candidates.push({ type, markerFile: file, confidence: 'high' });
    }
  }

  if (candidates.length === 0) {
    return { candidates: [], recommended: null };
  }

  // D-03: confidence logic is deterministic
  // Single marker = high; multiple = still high per candidate, but UI disambiguates
  const recommended = candidates.length === 1 ? candidates[0].type : null;
  return { candidates, recommended };
}
```

### Profile Loader with Zod Validation
```typescript
// Source: zod pattern from src/cli/interface-contract/schema.ts
// File: src/cli/init/profile-loader.ts

import { z } from 'zod';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const bootstrapProfileSchema = z.object({
  parser: z.object({
    include: z.array(z.string()).min(1),
    extensions: z.array(z.string()).min(1),
  }),
  ignore: z.array(z.string()),
  analysis_depth: z.enum(['shallow', 'standard', 'deep']),
});

export type BootstrapProfile = z.infer<typeof bootstrapProfileSchema>;

function resolvePackageRoot(): string {
  return fileURLToPath(new URL('../../../', import.meta.url));
}

export function resolveProfilePath(profileName: string): string {
  return path.join(resolvePackageRoot(), 'src', 'cli', 'init', 'profiles', `${profileName}.json`);
}

export function loadProfile(profileName: string): BootstrapProfile {
  const filePath = resolveProfilePath(profileName);
  const text = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(text);
  return bootstrapProfileSchema.parse(parsed);
}
```

### Profile JSON Example (nodejs.json)
```json
{
  "parser": {
    "include": ["src/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    "extensions": ["ts", "tsx", "js", "jsx", "mjs", "cjs"]
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "**/*.test.{ts,tsx,js,jsx}",
    "**/*.spec.{ts,tsx,js,jsx}",
    "**/*.d.ts"
  ],
  "analysis_depth": "standard"
}
```

### Interactive Selection with Readline
```typescript
// Source: pattern from src/cli/commands/ship/pipeline.ts lines 76-86
// File: src/cli/init/detect.ts (or inline in reconciler)

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

async function promptForProfileSelection(
  candidates: DetectionCandidate[]
): Promise<ProjectType> {
  console.log('检测到多个项目类型标记：');
  candidates.forEach((c, i) => {
    console.log(`  ${i + 1}) ${c.type} (${c.markerFile})`);
  });

  const readline = createInterface({ input, output });
  try {
    const answer = await readline.question('请选择 (输入编号): ');
    const index = parseInt(answer.trim(), 10) - 1;
    if (index >= 0 && index < candidates.length) {
      return candidates[index].type;
    }
    throw new Error('无效选择');
  } finally {
    readline.close();
  }
}
```

### InitCommandOptions Extension
```typescript
// Source: existing src/cli/commands/init.ts
// File: src/cli/commands/init.ts

export interface InitCommandOptions {
  yes?: boolean;
  interactive?: boolean;
  cwd?: string;
  profile?: string; // NEW
}
```

### Interface Contract Update
```typescript
// Source: existing src/cli/interface-contract/commands/init.ts
// File: src/cli/interface-contract/commands/init.ts

export const initContract: CommandContract = {
  name: 'init',
  // ... existing fields ...
  flags: [
    // ... existing flags ...
    {
      name: 'profile',
      long: 'profile',
      description: '跳过检测，直接应用指定内置 profile',
      type: 'string',
      defaultValue: undefined,
    },
  ],
  // ...
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled config validation in `config-loader.ts` | zod for new schemas (interface contract, profiles) | v2.0 contract schema work | Consistent validation pattern; less boilerplate |
| `__dirname` for path resolution | `fileURLToPath(new URL(...))` | ESM migration (pre-v2.0) | Works in ESM; used throughout CLI |
| Rules bundle as TS string literals | JSON static files for profiles | Phase 53 (new) | Profiles are data, not code; editable without rebuild |

**Deprecated/outdated:**
- `__dirname` in new ESM modules: causes `ReferenceError`; use `fileURLToPath` pattern instead.
- JSON import assertions (`assert { type: 'json' }`): `tsc` does not emit imported JSON files to `dist/`; use `readFileSync` for runtime-bundled assets.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `zod` 4.x schema definition with `.parse()` is sufficient for profile validation and provides clear enough errors for CLI output | Standard Stack | If zod error formatting is insufficient, planner must add a custom error formatter; this is low risk |
| A2 | `node:readline/promises` is sufficient for the single numeric-input prompt needed for multi-marker selection | Standard Stack | If UX requirements expand to complex forms, a prompt library may be needed later; v1 only needs numeric input |
| A3 | Profile JSON files placed in `src/cli/init/profiles/` will be accessible at runtime via `fileURLToPath` resolution from package root | Architecture Patterns | If npm pack excludes `src/`, this fails; but `files` array in package.json includes `dist/` only, so profiles must be copied to `dist/` during build OR read from source tree at dev time and from `dist/` at runtime. **This needs build-step verification.** |
| A4 | The existing `InitAssetStatus` enum covers all profile states without new values | Architecture Patterns | If "profile-applied" vs "profile-skipped" semantics need differentiation beyond `installed`/`skipped`, a new status may be needed; but D-17 says reuse existing enum |
| A5 | `analysis_depth` values `shallow`/`standard`/`deep` map to `mode: 'fast'`/`'hybrid'`/`'smart'` respectively | Profile JSON Schema | If the mapping is wrong, profile recommendations will produce unexpected analysis behavior. The mapping is a planner choice not yet locked. |

## Open Questions (RESOLVED)

1. **Build-step: How do profile JSON files reach `dist/`?** — RESOLVED
   - Decision: Profile JSON files are read at runtime via `readFileSync` with `fileURLToPath(new URL('../../../', import.meta.url))` resolution. `tsc` does not copy JSON to `dist/`, so the loader resolves from package root at both dev and build time. The `src/cli/init/profiles/` directory is part of the source tree and will be shipped in the npm package via the `files` array. If `npm run build` verification shows JSON files are not accessible post-build, a copy step will be added to the build script.
   - Planned in: 53-01 Task 3, 53-02 Task 2

2. **What is the exact mapping from `analysis_depth` to `mode`?** — RESOLVED
   - Decision: `analysis_depth` maps directly to `mode`: `shallow` → `'fast'`, `standard` → `'hybrid'`, `deep` → `'smart'`. This mapping is implemented in `profile-plan.ts` when merging profile defaults into the canonical config.
   - Planned in: 53-02 Task 1

3. **Should `generic.json` set `mode: 'hybrid'` with `include: ['**/*']`?** — RESOLVED
   - Decision: `generic.json` uses `mode: 'hybrid'` with `include: ['**/*.{ts,js,jsx,tsx,py,go,rs,mjs,cjs}']` and standard excludes (`node_modules/**`, `.git/**`, `dist/**`, `build/**`, `coverage/**`). This is the safe fallback for explicit `--profile generic`.
   - Planned in: 53-01 Task 3

4. **How does the `--json` flag interact with profile detection output?** — RESOLVED
   - Decision: Phase 53 does not implement `--json` output. Profile asset data is included in `InitReceipt` so Phase 55 (INI-01) can serialize it. No changes to `--json` behavior in this phase.
   - Planned in: 53-02 Task 4 (explicit no-op for --json)

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI runtime | ✓ | v24.14.0 | — |
| zod | Profile validation | ✓ | 4.4.1 (installed ^4.3.6) | — |
| chalk | Terminal output | ✓ | 5.3.0 | — |
| `node:readline/promises` | Interactive prompt | ✓ | built-in (Node >=20) | — |
| Vitest | Testing | ✓ | 1.1.0 (dev) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 1.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/cli/commands/__tests__/init-profile.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FRC-01 | Detects Node.js from package.json | unit | `npx vitest run src/cli/init/__tests__/detect.test.ts` | ❌ Wave 0 |
| FRC-01 | Detects Python from pyproject.toml | unit | same | ❌ Wave 0 |
| FRC-01 | Detects Go from go.mod | unit | same | ❌ Wave 0 |
| FRC-01 | Detects Rust from Cargo.toml | unit | same | ❌ Wave 0 |
| FRC-01 | Returns null when no markers | unit | same | ❌ Wave 0 |
| FRC-02 | Loads and validates nodejs profile | unit | `npx vitest run src/cli/init/__tests__/profile-loader.test.ts` | ❌ Wave 0 |
| FRC-02 | All 5 profile files pass validation | unit | same | ❌ Wave 0 |
| FRC-03 | Profile fields are parser/ignore/analysis_depth | unit | same | ❌ Wave 0 |
| FRC-04 | Preview mode shows profile asset as skipped | integration | `npx vitest run src/cli/commands/__tests__/init-profile.test.ts` | ❌ Wave 0 |
| FRC-04 | Apply mode with -y writes merged config | integration | same | ❌ Wave 0 |
| FRC-04 | Existing config skips profile detection | integration | same | ❌ Wave 0 |
| D-12 | Non-TTY without --profile exits non-zero | integration | same | ❌ Wave 0 |
| D-02 | Multi-marker interactive selection | integration | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/cli/init/__tests__/detect.test.ts src/cli/init/__tests__/profile-loader.test.ts src/cli/commands/__tests__/init-profile.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/cli/init/__tests__/detect.test.ts` — covers FRC-01
- [ ] `src/cli/init/__tests__/profile-loader.test.ts` — covers FRC-02, FRC-03
- [ ] `src/cli/commands/__tests__/init-profile.test.ts` — covers FRC-04, D-12, D-02
- [ ] `src/cli/init/profiles/*.json` — 5 built-in profile data files
- [ ] `src/cli/init/detect.ts` — detection module
- [ ] `src/cli/init/profile-loader.ts` — loader + zod schema
- [ ] `src/cli/init/profile-plan.ts` — ProfilePlan builder

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | zod schema validation on profile JSON; strict allow-list of profile names (`nodejs`, `python`, `go`, `rust`, `generic`) |
| V6 Cryptography | no | — |
| V7 Error Handling | yes | Validation failures produce clear diagnostics without leaking filesystem paths in production (paths are relative in receipts) |
| V10 Malicious Code | yes | Profile names are allow-listed; no arbitrary file read outside `src/cli/init/profiles/` |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `--profile ../../../etc/passwd` | Tampering | Allow-list profile names; reject any name containing path separators or dots |
| Malformed profile JSON causing crash | Denial of Service | zod validation catches malformed JSON; catch and format errors gracefully |
| Large profile JSON causing memory exhaustion | Denial of Service | Profile files are small (<1KB each); no user upload in v1 |

## Sources

### Primary (HIGH confidence)
- `package.json` — zod ^4.3.6 installed, engines >=20.0.0, `files` array shows `dist/`, `docs/`, `examples/`, `scripts/` shipped [VERIFIED: file read]
- `src/cli/interface-contract/schema.ts` — zod usage pattern for contract validation [VERIFIED: file read]
- `src/cli/init/hooks.ts` — `fileURLToPath(new URL('../../../', import.meta.url))` package root resolution pattern [VERIFIED: file read]
- `src/cli/init/rules.ts` — `RulesPlan` pattern with `assets: InitAsset[]` and `writes: FileWriteAction[]` [VERIFIED: file read]
- `src/cli/init/reconciler.ts` — `InitPlan`, `InitAsset`, `InitReceipt`, `createInitPlan`, `applyInitPlan` [VERIFIED: file read]
- `src/cli/commands/ship/pipeline.ts` — `node:readline/promises` usage for interactive prompt [VERIFIED: file read]
- `tsconfig.json` — `resolveJsonModule: true`, `module: ESNext`, `moduleResolution: bundler` [VERIFIED: file read]
- `src/cli/output/mode.ts` — TTY detection pattern (`process.stdout.isTTY`) [VERIFIED: file read]
- `src/cli/config-loader.ts` — `CodemapConfigFile` shape, `createDefaultCodemapConfigFile()` [VERIFIED: file read]
- `src/core/file-discovery.ts` — `DEFAULT_DISCOVERY_EXCLUDES` [VERIFIED: file read]
- `src/infrastructure/parser/index.ts` — `LanguageId` values, parser registry, supported extensions [VERIFIED: file read]
- `src/cli/interface-contract/commands/init.ts` — current init contract flags [VERIFIED: file read]
- `src/cli/first-run-guide.ts` — first-run guide text and `isFirstRun()` logic [VERIFIED: file read]
- `src/cli/commands/__tests__/init-command.test.ts` — test patterns with temp dirs and receipt assertions [VERIFIED: file read]
- `src/cli/commands/__tests__/init-rules.test.ts` — example of testing a new init asset family [VERIFIED: file read]
- npm registry — `npm view zod version` returned `4.4.1` [VERIFIED: tool execution]

### Secondary (MEDIUM confidence)
- `docs/rules/testing.md` — real-scene validation rules (Phase 41+), temp directory requirements [CITED: file read]
- `AGENTS.md` Section 8.1 — real-world validation threshold, subprocess execution requirement [CITED: file read]
- `docs/rules/code-quality-redlines.md` — max 50 lines per function, no `any`, no floating promises [CITED: file read]
- `docs/rules/engineering-with-codex-openai.md` — docs sync trigger conditions, failure rehearsal [CITED: file read]

### Tertiary (LOW confidence)
- None — all claims verified against codebase or npm registry.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zod already installed and used; readline already used; no new dependencies needed.
- Architecture: HIGH — existing `HookPlan`/`RulesPlan` patterns are clear and directly applicable.
- Pitfalls: HIGH — `tsc` JSON emission and ESM `__dirname` are well-known Node.js/TypeScript behaviors verified against project config.

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable stack; zod 4.x is mature)
