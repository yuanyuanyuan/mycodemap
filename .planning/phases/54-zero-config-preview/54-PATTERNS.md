# Phase 54: Zero-Config Preview - Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 10 (new/modified)
**Analogs found:** 9 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/cli/commands/preview.ts` | controller | request-response | `src/cli/commands/doctor.ts` | exact |
| `src/cli/preview/dependency-extractor.ts` | service | file-I/O | `src/cli/init/detect.ts` | role-match |
| `src/cli/preview/complexity-scanner.ts` | service | transform | (no analog — new analysis path) | none |
| `src/cli/interface-contract/commands/preview.ts` | config | request-response | `src/cli/interface-contract/commands/init.ts` | exact |
| `src/cli/interface-contract/commands/index.ts` | config | request-response | (self — add entry to existing registry) | self-modify |
| `src/cli/index.ts` | controller | request-response | (self — add command registration) | self-modify |
| `src/cli/first-run-guide.ts` | utility | request-response | (self — add preview mention) | self-modify |
| `src/cli/commands/__tests__/preview-command.test.ts` | test | request-response | `src/cli/commands/__tests__/init-command.test.ts` | exact |
| `src/cli/preview/__tests__/dependency-extractor.test.ts` | test | file-I/O | `src/cli/commands/__tests__/init-profile.test.ts` | role-match |
| `src/cli/preview/__tests__/complexity-scanner.test.ts` | test | transform | `src/cli/commands/__tests__/init-profile.test.ts` | role-match |

## Pattern Assignments

### `src/cli/commands/preview.ts` (controller, request-response)

**Analog:** `src/cli/commands/doctor.ts` — same role (top-level CLI command using shared output infrastructure with `--json`/`--human` flags)

**Imports pattern** (lines 1-7):
```typescript
import { Command } from 'commander';
import { runDoctor } from '../doctor/orchestrator.js';
import { formatDoctorJsonData, formatDoctorReport } from '../doctor/formatter.js';
import { resolveOutputMode, formatError } from '../output/index.js';
```

Preview should follow this import shape:
```typescript
import { Command } from 'commander';
import { detectProjectType } from '../init/detect.js';
import { loadProfile } from '../init/profile-loader.js';
import { resolveOutputMode, formatError, renderOutput } from '../output/index.js';
import { discoverProjectFiles } from '../../core/file-discovery.js';
import { extractDependencies } from '../preview/dependency-extractor.js';
import { scanComplexity } from '../preview/complexity-scanner.js';
```

**Command registration pattern** (lines 38-42):
```typescript
export const doctorCommand = new Command('doctor')
  .description('Diagnose CodeMap ecosystem health')
  .option('-j, --json', 'Output diagnostics as JSON')
  .option('--human', 'Force human-readable output')
  .action(doctorAction);
```

Preview should follow:
```typescript
export const previewCommand = new Command('preview')
  .description('Zero-config project preview')
  .option('--save', 'Save profile config and run full generate')
  .option('-j, --json', 'JSON output')
  .option('--human', 'Force human-readable output')
  .option('--profile <name>', 'Use specified profile (nodejs|python|go|rust|generic)')
  .action(previewAction);
```

**Core pattern — resolve output mode then branch** (lines 14-36):
```typescript
async function doctorAction(options: DoctorCommandOptions): Promise<void> {
  try {
    const report = await runDoctor({ json: options.json, cwd: process.cwd() });
    const mode = resolveOutputMode({ json: options.json, human: options.human });

    if (mode === 'json') {
      const data = formatDoctorJsonData(report.results);
      process.stdout.write(JSON.stringify(data) + '\n');
    } else {
      process.stdout.write(formatDoctorReport(report.results) + '\n');
    }

    process.exitCode = report.exitCode;
  } catch (error) {
    const mode = resolveOutputMode({ json: options.json, human: options.human });
    process.stdout.write(formatError(error, mode) + '\n');
    process.exitCode = 1;
  }
}
```

**Error handling pattern** (lines 31-35):
```typescript
  } catch (error) {
    const mode = resolveOutputMode({ json: options.json, human: options.human });
    process.stdout.write(formatError(error, mode) + '\n');
    process.exitCode = 1;
  }
```

Key differences from doctor: preview also needs `--save` flag handling (after output, write config + invoke generate), and profile detection when no config exists. The `renderOutput()` function from `src/cli/output/render.ts` should be used for dual-mode output instead of manual if/else.

---

### `src/cli/preview/dependency-extractor.ts` (service, file-I/O)

**Analog:** `src/cli/init/detect.ts` — same role (synchronous, marker-file-based project inspection) and data flow (file-I/O with existsSync/readFileSync)

**Imports pattern** (lines 6-9):
```typescript
import { existsSync } from 'node:fs';
import path from 'node:path';
```

**Core pattern — pure function, sync file reads, graceful fallback** (lines 40-57):
```typescript
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

  if (candidates.length === 1) {
    return { candidates, recommended: candidates[0].type };
  }

  return { candidates, recommended: null };
}
```

Dependency extractor should follow this pattern: pure functions, sync file I/O, try-catch returning empty arrays on failure, no `process.exit`:

```typescript
// Pattern: marker-file scanning with graceful fallback
export function extractNodeDeps(rootDir: string): string[] {
  try {
    const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    return [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
  } catch { return []; }
}
```

**Marker-file constant map** (lines 24-29):
```typescript
const MARKER_MAP: Record<string, ProjectType> = Object.freeze({
  'package.json': 'nodejs',
  'pyproject.toml': 'python',
  'go.mod': 'go',
  'Cargo.toml': 'rust',
});
```

The dependency extractor uses the same marker files but reads their content instead of just checking existence. The `MARKER_MAP` keys tell you which files to scan.

---

### `src/cli/preview/complexity-scanner.ts` (service, transform)

**No analog exists** — this is a genuinely new analysis path. The project has `src/cli/commands/complexity.ts` but it uses tree-sitter-based AST analysis (heavy). Preview must use `typhonjs-escomplex` instead (lightweight, Babel-based, no native deps).

**Closest partial analog for the "per-file analysis with graceful skip" pattern:** `src/cli/init/profile-loader.ts` lines 83-115 — shows the pattern of: try a file read, catch and rethrow with context, validate output shape.

**Pattern to follow for per-file scanning:**
```typescript
// Per-file try-catch with null return on failure (per RESEARCH.md Pitfall 6 + Claude's Discretion)
// Do NOT abort entire scan on single file failure
function scanFileComplexity(filePath: string, rootDir: string): ComplexityHotspot | null {
  try {
    const source = readFileSync(filePath, 'utf8');
    const report = escomplex.analyzeModule(source);
    return {
      file: path.relative(rootDir, filePath),
      score: report.aggregate.cyclomatic,
      functions: report.methods.length,
    };
  } catch {
    // Skip individual file failures — do NOT throw
    return null;
  }
}
```

**Extension filter pattern** (from RESEARCH.md Pitfall 6): Only feed `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` files to escomplex. The `BootstrapProfile.parser.extensions` field tells you which extensions exist, but only pass JS/TS ones.

---

### `src/cli/interface-contract/commands/preview.ts` (config, request-response)

**Analog:** `src/cli/interface-contract/commands/init.ts` — exact same role (interface contract definition for a CLI command)

**Full pattern** (lines 6-97):
```typescript
import type { CommandContract } from '../types.js';

export const initContract: CommandContract = {
  name: 'init',
  description: '初始化并收敛 CodeMap 项目状态',
  args: [],
  flags: [
    {
      name: 'yes',
      short: 'y',
      long: 'yes',
      description: '使用默认配置，不询问',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'interactive',
      long: 'interactive',
      description: '仅显示 reconciliation preview，不写入文件',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'json',
      short: 'j',
      long: 'json',
      description: 'JSON 格式输出收据',
      type: 'boolean',
      defaultValue: false,
    },
    {
      name: 'profile',
      long: 'profile',
      description: '跳过检测，直接应用指定内置 profile',
      type: 'string',
      defaultValue: undefined,
    },
  ],
  outputShape: {
    description: '初始化结果收据',
    type: 'object',
    properties: [
      { name: 'converged', type: 'boolean', description: '是否已收敛' },
      { name: 'configPath', type: 'string', nullable: true, description: '配置文件路径' },
      { name: 'created', type: 'array', description: '创建的文件列表', items: { name: 'file', type: 'object', properties: [ { name: 'path', type: 'string' }, { name: 'type', type: 'string', description: 'config | hook | rule | receipt' } ] } },
      { name: 'warnings', type: 'array', nullable: true, description: '警告信息', items: { name: 'warning', type: 'object', properties: [ { name: 'message', type: 'string' }, { name: 'severity', type: 'string' } ] } },
    ],
  },
  errorCodes: [
    { code: 'INIT_ALREADY_INITIALIZED', description: '项目已初始化' },
    { code: 'INIT_CWD_NOT_FOUND', description: '当前目录不存在' },
  ],
  examples: [
    'codemap init',
    'codemap init -y',
    'codemap init --interactive',
    'codemap init --json',
    'codemap init --profile nodejs',
  ],
};
```

Preview contract should mirror this structure with `--save`, `--json`, `--human`, `--profile` flags and a four-section output shape (files, modules, dependencies, complexity).

---

### `src/cli/interface-contract/commands/index.ts` (config, request-response)

**Self-modification:** Add `previewContract` import and push to `commandContracts` array.

**Current pattern** (lines 1-20):
```typescript
import { analyzeContract } from './analyze.js';
import { queryContract } from './query.js';
import { depsContract } from './deps.js';
import { doctorContract } from './doctor.js';
import { benchmarkContract } from './benchmark.js';
import { initContract } from './init.js';

export const commandContracts = [
  analyzeContract,
  queryContract,
  depsContract,
  doctorContract,
  benchmarkContract,
  initContract,
] as const;

export { analyzeContract, queryContract, depsContract, doctorContract, benchmarkContract, initContract };
```

Add:
```typescript
import { previewContract } from './preview.js';
// Add to array and re-export
```

---

### `src/cli/index.ts` (controller, request-response)

**Self-modification:** Add `previewCommand` import and `.command('preview')` registration.

**Init command registration pattern** (lines 123-129):
```typescript
program
  .command('init')
  .description('初始化并收敛 CodeMap 项目状态')
  .option('-y, --yes', '使用默认配置')
  .option('--interactive', '仅显示 reconciliation preview，不写入文件')
  .option('--profile <name>', '指定 bootstrap profile（nodejs|python|go|rust|generic），跳过自动检测')
  .action(initCommand);
```

**Doctor command registration pattern** (line 234):
```typescript
program.addCommand(doctorCommand);
```

For preview, use the `addCommand` pattern (like doctor) since `previewCommand` is exported as a `Command` instance, not a plain action function:
```typescript
program.addCommand(previewCommand);
```

**`createActionHandler` pattern** (lines 80-112) — wraps all command actions with tree-sitter check, centralized error handling, and suggestion auto-fix. Preview should use this wrapper:
```typescript
program.addCommand(previewCommand);  // previewCommand already uses createActionHandler internally
// OR register inline with createActionHandler:
.action(await createActionHandler('preview', previewAction));
```

---

### `src/cli/first-run-guide.ts` (utility, request-response)

**Self-modification:** Add `codemap preview` mention as a zero-config starting point.

**Current guide text** (lines 63-76):
```typescript
console.log(chalk.gray('  1. ') + chalk.white('初始化项目'));
console.log(chalk.gray('     ') + chalk.cyan('mycodemap init'));
console.log('');
console.log(chalk.gray('  2. ') + chalk.white('生成代码地图'));
console.log(chalk.gray('     ') + chalk.cyan('mycodemap generate'));
// ...
console.log(chalk.gray('  提示: ') + chalk.white('运行 `mycodemap init` 时...'));
```

Should add preview as step 0 or as a tip:
```typescript
console.log(chalk.gray('  1. ') + chalk.white('零配置预览'));
console.log(chalk.gray('     ') + chalk.cyan('mycodemap preview'));
```

---

### `src/cli/commands/__tests__/preview-command.test.ts` (test, request-response)

**Analog:** `src/cli/commands/__tests__/init-command.test.ts` — same test structure (temp directory, real filesystem, chalk mock, command execution)

**Test setup pattern** (lines 1-44):
```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function createColorMock() {
  const color = (text: string) => text;
  return Object.assign(color, {
    bold: (text: string) => text,
  });
}

vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => text,
    cyan: (text: string) => text,
    gray: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
    white: createColorMock(),
    yellow: (text: string) => text,
  },
}));
```

**Temp project creation pattern** (lines 37-43):
```typescript
function createTempProject(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-init-command-'));
  writeFileSync(path.join(root, 'package.json'), '{"name":"test"}', 'utf8');
  return root;
}
```

**Cleanup pattern** (lines 46-56):
```typescript
const tempRoots: string[] = [];
afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
```

---

### `src/cli/preview/__tests__/dependency-extractor.test.ts` (test, file-I/O)

**Analog:** `src/cli/commands/__tests__/init-profile.test.ts` — same temp-dir-per-test pattern with marker file manipulation

**Key test pattern** (lines 127-142):
```typescript
it('applies nodejs profile when package.json exists and --yes is used', async () => {
  const rootDir = createTempProject();
  tempRoots.push(rootDir);
  writeFileSync(path.join(rootDir, 'package.json'), '{}', 'utf8');

  const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

  const profileAsset = findProfileAsset(receipt.assets as AssetLike[]);
  expect(profileAsset).toBeDefined();
  expect(profileAsset?.status).toBe('installed');
});
```

For dependency extractor tests, create temp projects with known marker files (package.json with deps, go.mod with requires, etc.) and verify extraction returns expected dependency names.

---

### `src/cli/preview/__tests__/complexity-scanner.test.ts` (test, transform)

**Analog:** Same test pattern as above, but test transform/output rather than file-I/O.

Test approach: create temp TS/JS files with known complexity, scan them, verify hotspots are returned in correct order and count. Test graceful failure on non-JS files and malformed source.

## Shared Patterns

### Output Mode Resolution
**Source:** `src/cli/output/mode.ts` lines 15-30
**Apply to:** `src/cli/commands/preview.ts`
```typescript
export function resolveOutputMode(
  options: OutputModeOptions = {},
  ttyOverride?: boolean
): OutputMode {
  if (options.json) { return 'json'; }
  if (options.human) { return 'human'; }
  const isTTY = ttyOverride ?? process.stdout.isTTY;
  return isTTY ? 'human' : 'json';
}
```

### Output Rendering
**Source:** `src/cli/output/render.ts` lines 14-25
**Apply to:** `src/cli/commands/preview.ts`
```typescript
export function renderOutput<T>(
  data: T,
  humanRenderer: (data: T) => string,
  mode: OutputMode
): void {
  if (mode === 'json') {
    process.stdout.write(JSON.stringify(data) + '\n');
    return;
  }
  process.stdout.write(humanRenderer(data) + '\n');
}
```

### Error Formatting
**Source:** `src/cli/output/errors.ts` lines 23-63
**Apply to:** `src/cli/commands/preview.ts` — catch block should use `formatError(error, mode, 'preview')` for mode-aware error output.

### Project Detection
**Source:** `src/cli/init/detect.ts` lines 40-57
**Apply to:** `src/cli/commands/preview.ts` — call `detectProjectType(rootDir)` directly when no config exists (D-04). Key difference from init: when no markers found, fall back to `generic` profile (D-05) instead of throwing.

### Profile Loading
**Source:** `src/cli/init/profile-loader.ts` lines 83-115
**Apply to:** `src/cli/commands/preview.ts` — call `loadProfile(profileName)` to get `BootstrapProfile` with `parser.include`, `parser.extensions`, `ignore`, `analysis_depth`.

### Profile Plan (for --save)
**Source:** `src/cli/init/profile-plan.ts` lines 102-184
**Apply to:** `src/cli/commands/preview.ts` — when `--save` flag is set, call `createProfilePlan()` + `applyProfilePlan()` to write `.mycodemap/config.json`, then invoke `generateCommand()`.

### Config Existence Check
**Source:** `src/cli/commands/init.ts` lines 36-43
**Apply to:** `src/cli/commands/preview.ts` — reuse `hasCanonicalConfig()` pattern to check for existing `.mycodemap/config.json` before running detection (D-06).

### File Discovery
**Source:** `src/core/file-discovery.ts` lines 110-112
**Apply to:** `src/cli/preview/dependency-extractor.ts` (for finding marker files) and `src/cli/commands/preview.ts` (for counting source files)
```typescript
export async function discoverProjectFiles(options: DiscoveryOptions): Promise<string[]> {
  return globby(options.include, createDiscoveryOptions(options));
}
```

### Command Action Handler
**Source:** `src/cli/index.ts` lines 80-112
**Apply to:** `src/cli/commands/preview.ts` — either export a `Command` instance (like doctor) or use `createActionHandler` wrapper (like generate) for centralized error handling.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/cli/preview/complexity-scanner.ts` | service | transform | No existing file uses `typhonjs-escomplex` or does per-file complexity scanning outside of `src/cli/commands/complexity.ts` (which uses tree-sitter AST, a fundamentally different approach). Planner should use RESEARCH.md Pattern 2 as the reference implementation. |

## Metadata

**Analog search scope:** `src/cli/commands/`, `src/cli/init/`, `src/cli/interface-contract/`, `src/cli/output/`, `src/core/`, `src/cli/commands/__tests__/`
**Files scanned:** 18
**Pattern extraction date:** 2026-05-02
