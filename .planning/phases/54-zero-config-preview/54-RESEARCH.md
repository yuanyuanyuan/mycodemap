# Phase 54: Zero-Config Preview - Research

**Researched:** 2026-05-02
**Domain:** CLI command architecture / lightweight analysis / profile fallback
**Confidence:** HIGH

## Summary

Phase 54 creates a `codemap preview` command that wraps generate's analysis core in a zero-config, lightweight mode. The key technical challenge is bridging Phase 53's profile-derived config into generate's analysis path when no `mycodemap.config.json` exists, while skipping heavy steps (symbol-level, graph persistence, full dep graph, output generation). The existing `analyze()` function accepts `AnalysisOptions` with `include`/`exclude`/`mode` — these can be constructed directly from a `BootstrapProfile` without needing a full `LoadedCodemapConfig`. escomplex (`typhonjs-escomplex` v0.1.0, already in package.json) provides file-level cyclomatic complexity via `analyzeModule(sourceCode)`. It handles TypeScript syntax and returns `aggregate.cyclomatic` + `methods[]` per file. For marker-file dependency extraction, `package.json` and `go.mod` can be parsed with native JSON and line-scanning respectively, but `Cargo.toml` and `pyproject.toml` require a TOML parser (`smol-toml` v1.6.1 is the lightest option). The `--save` path reuses `createProfilePlan()` + `applyProfilePlan()` from Phase 53, then invokes `generateCommand`.

**Primary recommendation:** Build `preview` as a new command file that directly calls `discoverProjectFiles()` + escomplex for file/complexity analysis, extracts marker-file deps inline, and constructs the four-section summary. Do NOT route through `analyze()` — it couples to symbol parsing, dependency graph, and global index, which preview must skip per D-02.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `codemap preview` is a **lightweight wrapper over generate's core logic**, not a standalone analysis path. Reuses generate's file discovery, module counting, and analysis infrastructure but skips heavy steps.
- **D-02:** Preview **skips symbol-level analysis, graph persistence to `.mycodemap/`, and full dependency graph construction**. Retains file discovery, module statistics, direct dependency extraction, and escomplex-based complexity scoring.
- **D-03:** `codemap preview --save` **writes the merged profile config to `.mycodemap/config.json` and then runs full generate**.
- **D-04:** When no `mycodemap.config.json` exists, preview **reuses Phase 53's `detectProjectType()` + Bootstrap Profile** as fallback config.
- **D-05:** When `detectProjectType()` finds **no marker files**, preview **falls back to the `generic` profile**.
- **D-06:** When `.mycodemap/config.json` **already exists**, preview uses it directly (no profile detection, no override).
- **D-07:** Output follows **v2.0 AI-First Default Output paradigm**: JSON by default on stdout, `--human` flag or TTY auto-detection renders human-readable tables/colors.
- **D-08:** Preview summary contains exactly four sections: file count, module count, direct dependencies (from marker files), complexity hotspots (top-5 via escomplex).
- **D-09:** "Key dependencies" means **direct dependencies from marker files**, not source-code import relationships.
- **D-10:** After preview output, display a **single-line hint text** at the end. No interactive prompt.
- **D-11:** There is **no `--discard` flag**.
- **D-12:** When `--save` is used, the output should confirm what was saved and that full generate has been triggered.

### Claude's Discretion
- Exact `preview` command file structure (single file vs splitting into preview + preview-runner)
- Whether to extract a shared "lightweight analysis" function from generate or call generate with flags
- Exact hint text wording
- Whether `--save` runs generate synchronously or fires-and-forgets
- Exact JSON output schema (field names, nesting)
- Whether `preview` registers its own interface contract command file or shares with generate
- Error handling details for escomplex failures

### Deferred Ideas (OUT OF SCOPE)
- Interactive modify / Q&A during preview
- `--discard` flag
- Source-code import dependency graph in preview output
- Directory-structure heuristics beyond what profiles provide
- Function-level complexity breakdown
- Progress bar / spinner during preview (planner discretion)
- Preview caching / incremental results
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ZCP-01 | `codemap preview` requires no `mycodemap.config.json` or any pre-configuration | D-04/D-05 profile fallback; `detectProjectType()` + `loadProfile()` bridge; `generic` profile for no-marker case |
| ZCP-02 | System auto-detects project structure and infers reasonable analysis scope | Phase 53 `detectProjectType()` returns `DetectionResult`; profile `parser.include` + `parser.ignore` define scope |
| ZCP-03 | Preview output: file count, module count, key dependencies, complexity hotspots | `discoverProjectFiles()` for file count; directory-based module counting; marker-file dep extraction; escomplex for top-5 hotspots |
| ZCP-04 | After preview, hint user `--save` to save config (or `--discard` to discard) | D-10: single-line hint text; D-11: no `--discard` flag (ZCP-04's `--discard` mention is superseded by D-11) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Project type detection | CLI / Init | -- | Phase 53 `detectProjectType()` is CLI-owned, marker-based |
| Profile-derived config construction | CLI / Init | -- | `loadProfile()` + `createProfilePlan()` are init infrastructure |
| File discovery | Core / Analyzer | CLI | `discoverProjectFiles()` from `file-discovery.ts` |
| Complexity scoring | CLI / Preview | -- | escomplex is a new analysis path, not in core analyzer |
| Marker-file dependency extraction | CLI / Preview | -- | New utility, reads package.json/go.mod/Cargo.toml/pyproject.toml |
| Output rendering | CLI / Output | -- | `resolveOutputMode()` + `renderOutput()` from shared output infra |
| Config persistence (`--save`) | CLI / Init | CLI / Preview | Reuses `applyProfilePlan()` from Phase 53 |
| Interface contract registration | CLI / Interface-Contract | -- | New `preview.ts` contract in `commands/` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| typhonjs-escomplex | 0.1.0 | File-level cyclomatic complexity | Already in package.json; Babel-based parser handles JS/TS; `analyzeModule()` returns `aggregate.cyclomatic` [VERIFIED: node_modules] |
| zod | 4.3.6 | Schema validation for profile loading | Already in project; Phase 53 uses it for `bootstrapProfileSchema` [VERIFIED: package.json] |
| commander | 11.1.0 | CLI command registration | Already in project; all commands use it [VERIFIED: package.json] |
| globby | 14.0.0 | File discovery glob matching | Already in project; `discoverProjectFiles()` uses it [VERIFIED: package.json] |
| chalk | 5.3.0 | Terminal color output | Already in project; human mode rendering [VERIFIED: package.json] |
| ora | 8.0.1 | Progress spinner | Already in project; `createProgressEmitter()` uses it [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| smol-toml | 1.6.1 | Parse Cargo.toml and pyproject.toml for dependency extraction | NEW dependency; needed for marker-file dep extraction from Rust and Python projects [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| smol-toml | @iarna/toml 2.2.5 | @iarna/toml is more mature but larger; smol-toml is lighter and ESM-native, better fit for this project |
| typhonjs-escomplex | Existing ast-complexity-analyzer.ts | ast-complexity-analyzer requires TypeScript AST + tree-sitter; escomplex is self-contained with Babel parser, no native deps |

**Installation:**
```bash
npm install smol-toml
```

**Version verification:**
- typhonjs-escomplex: 0.1.0 [VERIFIED: `npm view typhonjs-escomplex version` + node_modules check]
- smol-toml: 1.6.1 [VERIFIED: `npm view smol-toml version`]

## Architecture Patterns

### System Architecture Diagram

```
codemap preview [options]
        |
        v
+-- resolveOutputMode() ---+--- JSON (default / non-TTY)
|                          +--- human (--human / TTY)
|
+-- Config Resolution ------+-- .mycodemap/config.json exists?
|                          |   YES: loadCodemapConfig() directly
|                          |   NO: detectProjectType()
|                                |
|                                +-- 1 marker: loadProfile(recommended)
|                                +-- 0 markers: loadProfile('generic')
|                                +-- N markers: pick first or --profile
|
+-- File Discovery ---------+-- discoverProjectFiles(include, exclude)
|                          |   from profile.parser.include + profile.ignore
|
+-- Module Counting --------+-- group files by parent directory
|
+-- Dependency Extraction ---+-- scan marker files in cwd
|                          |   package.json -> JSON deps
|                          |   go.mod -> line-scanned deps
|                          |   Cargo.toml -> smol-toml deps
|                          |   pyproject.toml -> smol-toml deps
|
+-- Complexity Hotspots ----+-- for each JS/TS file:
|                          |   readFile -> escomplex.analyzeModule()
|                          |   collect aggregate.cyclomatic
|                          |   sort desc, take top-5
|
+-- Output Rendering -------+-- JSON: renderOutput(data, _, 'json')
|                          +-- human: renderOutput(data, humanRenderer, 'human')
|
+-- Hint Text --------------+-- "Run codemap preview --save to save this config."
|
+-- --save path (if flag) --+-- createProfilePlan() + applyProfilePlan()
                           +-- generateCommand()
```

### Recommended Project Structure
```
src/
├── cli/
│   ├── commands/
│   │   ├── preview.ts              # NEW: preview command entry point
│   │   └── __tests__/
│   │       └── preview-command.test.ts  # NEW: preview command tests
│   ├── preview/
│   │   ├── dependency-extractor.ts # NEW: marker-file dep extraction
│   │   ├── complexity-scanner.ts   # NEW: escomplex file-level scoring
│   │   └── preview-renderer.ts     # NEW: human-readable output formatting
│   ├── init/                       # Phase 53 (reused)
│   │   ├── detect.ts
│   │   ├── profile-loader.ts
│   │   └── profile-plan.ts
│   ├── interface-contract/
│   │   └── commands/
│   │       ├── preview.ts          # NEW: preview contract definition
│   │       └── index.ts            # MODIFIED: add previewContract
│   └── index.ts                    # MODIFIED: register preview command
```

### Pattern 1: Profile-to-AnalysisOptions Bridge
**What:** Convert a `BootstrapProfile` into `AnalysisOptions` for `discoverProjectFiles()`
**When to use:** When no `mycodemap.config.json` exists and preview needs profile-derived include/exclude
**Example:**
```typescript
// Source: inferred from profile-loader.ts + analyzer.ts interfaces
import type { BootstrapProfile } from '../init/profile-loader.js';
import type { AnalysisOptions } from '../../interface/types/index.js';
import { ANALYSIS_DEPTH_TO_MODE } from '../init/profile-loader.js';

function profileToAnalysisOptions(
  profile: BootstrapProfile,
  rootDir: string
): AnalysisOptions {
  return {
    mode: ANALYSIS_DEPTH_TO_MODE[profile.analysis_depth],
    rootDir,
    include: [...profile.parser.include],
    exclude: [...profile.ignore],
  };
}
```

### Pattern 2: escomplex File-Level Scoring
**What:** Use typhonjs-escomplex for per-file cyclomatic complexity without tree-sitter
**When to use:** In preview's complexity hotspot analysis
**Example:**
```typescript
// Source: [VERIFIED: node_modules/typhonjs-escomplex/dist/ESComplex.js]
import escomplex from 'typhonjs-escomplex';
import { readFileSync } from 'node:fs';

interface ComplexityHotspot {
  file: string;
  score: number;
  functions: number;
}

function scanFileComplexity(
  filePath: string,
  rootDir: string
): ComplexityHotspot | null {
  try {
    const source = readFileSync(filePath, 'utf8');
    const report = escomplex.analyzeModule(source);
    return {
      file: path.relative(rootDir, filePath),
      score: report.aggregate.cyclomatic,
      functions: report.methods.length,
    };
  } catch {
    // Per D-08/Discretion: skip individual file failures
    return null;
  }
}

// Top-5 hotspots: sort by score desc, take 5
const hotspots = fileComplexities
  .filter((h): h is ComplexityHotspot => h !== null)
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);
```

### Pattern 3: Marker-File Dependency Extraction
**What:** Read direct dependencies from project marker files without source-code parsing
**When to use:** In preview's dependency section (D-09)
**Example:**
```typescript
// package.json: JSON.parse -> Object.keys(dependencies + devDependencies)
function extractNodeDeps(rootDir: string): string[] {
  const pkgPath = path.join(rootDir, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
  } catch { return []; }
}

// go.mod: line-by-line scanning (no TOML parser needed)
function extractGoDeps(rootDir: string): string[] {
  // Scan for require blocks and single-line require statements
  // See Code Examples section for full implementation
}

// Cargo.toml / pyproject.toml: smol-toml parser
async function extractRustDeps(rootDir: string): Promise<string[]> {
  const toml = await import('smol-toml');
  const content = readFileSync(path.join(rootDir, 'Cargo.toml'), 'utf8');
  const parsed = toml.parse(content);
  return Object.keys(parsed.dependencies || {});
}
```

### Pattern 4: Output Rendering (AI-First)
**What:** Use shared output infrastructure for JSON/human dual output
**When to use:** All preview output
**Example:**
```typescript
// Source: [VERIFIED: src/cli/output/mode.ts + render.ts]
import { resolveOutputMode, renderOutput, createProgressEmitter } from '../output/index.js';

const mode = resolveOutputMode({ json: options.json, human: options.human });
const progress = createProgressEmitter(mode, 'preview');

// ... analysis ...

renderOutput(previewData, formatPreviewHuman, mode);
// hint text always appended (both modes)
process.stdout.write(hintText + '\n');
```

### Pattern 5: Interface Contract Registration
**What:** Register preview command in the interface contract system for MCP auto-exposure
**When to use:** When defining the new preview command
**Example:**
```typescript
// Source: [CITED: src/cli/interface-contract/commands/init.ts]
import type { CommandContract } from '../types.js';

export const previewContract: CommandContract = {
  name: 'preview',
  description: 'Zero-config project preview — file count, modules, dependencies, complexity',
  args: [],
  flags: [
    { name: 'save', long: 'save', description: 'Save profile config and run full generate', type: 'boolean', defaultValue: false },
    { name: 'human', long: 'human', description: 'Force human-readable output', type: 'boolean', defaultValue: false },
    { name: 'json', short: 'j', long: 'json', description: 'Force JSON output', type: 'boolean', defaultValue: false },
    { name: 'profile', long: 'profile', description: 'Skip detection, use specified profile', type: 'string', defaultValue: undefined },
  ],
  outputShape: { /* four-section structure */ },
  errorCodes: [
    { code: 'PREVIEW_PROFILE_LOAD_FAILED', description: 'Failed to load bootstrap profile' },
    { code: 'PREVIEW_NO_FILES_FOUND', description: 'No source files discovered' },
  ],
  examples: ['codemap preview', 'codemap preview --save', 'codemap preview --json', 'codemap preview --profile nodejs'],
};
```

### Anti-Patterns to Avoid
- **Calling `analyze()` directly for preview:** `analyze()` couples to symbol parsing, global index building, and full dependency graph — all of which D-02 says to skip. Use `discoverProjectFiles()` directly instead.
- **Creating a config file before running preview:** D-01 says preview is zero-config. The profile-derived config should be in-memory only, never written to disk (unless `--save`).
- **Using ast-complexity-analyzer.ts for complexity:** It requires TypeScript AST + tree-sitter, which is a heavy dependency chain. escomplex is self-contained and already in package.json.
- **Failing the entire preview on a single escomplex parse error:** Per Claude's Discretion, individual file failures should be skipped, not abort the whole command.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOML parsing (Cargo.toml, pyproject.toml) | Custom regex-based TOML parser | smol-toml | TOML spec has edge cases (inline tables, multiline arrays, date types); smol-toml is 1.6.1 and spec-compliant |
| Cyclomatic complexity | Custom complexity counter | typhonjs-escomplex `analyzeModule()` | escomplex handles all JS/TS syntax via Babel, provides Halstead, SLOC, and method-level detail; hand-rolling misses edge cases |
| Project detection | New detection logic | Phase 53 `detectProjectType()` | Already shipped, tested, handles multi-marker disambiguation |
| Profile loading | Direct JSON read | `loadProfile()` with zod validation | Schema validation prevents malformed profiles from causing silent errors |
| Config write on `--save` | Manual `fs.writeFile` | `applyProfilePlan()` | Handles directory creation, hash computation, and is tested |
| Output mode detection | Manual TTY check | `resolveOutputMode()` | Single source of truth for --json/--human/TTY auto-detect |

**Key insight:** Preview is primarily a composition of existing, tested building blocks (`detectProjectType`, `loadProfile`, `discoverProjectFiles`, `resolveOutputMode`, `renderOutput`, `createProgressEmitter`, `applyProfilePlan`). The only genuinely new logic is: (1) marker-file dependency extraction, (2) escomplex file-level scanning, and (3) the four-section summary schema.

## Common Pitfalls

### Pitfall 1: escomplex CJS Import in ESM Project
**What goes wrong:** `typhonjs-escomplex` is a CJS module (CommonJS default export). In the project's ESM context, a bare `import escomplex from 'typhonjs-escomplex'` may fail or return the module namespace instead of the default export.
**Why it happens:** CJS default exports require `.default` access when dynamically imported in some ESM contexts; TypeScript + Node ESM interop is subtle.
**How to avoid:** Use `import escomplex from 'typhonjs-escomplex'` (TypeScript ESM interop handles this), but verify at build time. If it fails, use `const escomplex = (await import('typhonjs-escomplex')).default` as fallback. [ASSUMED — needs build verification]
**Warning signs:** `escomplex.analyzeModule is not a function` at runtime.

### Pitfall 2: go.mod Dependency Parsing False Positives
**What goes wrong:** Simple line-by-line go.mod parsing may pick up `// indirect` comments as dependency names, or miss single-line `require` declarations outside a block.
**Why it happens:** go.mod format allows both `require (block)` and `require single/dep v1.0` syntax; indirect markers are inline comments.
**How to avoid:** Strip `// indirect` and `// direct` comments from lines before parsing. Handle both block and single-line require forms. See Code Examples section.
**Warning signs:** Dev dependencies appearing in "direct" list; missing dependencies.

### Pitfall 3: Profile Include Globs Too Narrow for Preview
**What goes wrong:** Node.js profile's `parser.include` is `["src/**/*.{ts,tsx,js,jsx,mjs,cjs}"]` — this misses root-level files, test files, and non-src directories that a user might expect preview to see.
**Why it happens:** Profiles are designed for `generate` (which needs focused analysis), not for a broad "show me everything" preview.
**How to avoid:** For preview, consider using the profile's `parser.include` as a starting point but also scanning for files in the root directory. The `generic` profile's broader `["**/*.{ts,js,py,go,rs}"]` may be more appropriate for preview's "quick overview" goal. This is a planner choice.
**Warning signs:** Preview shows 0 files on a project that clearly has source code.

### Pitfall 4: analyze() Called Instead of discoverProjectFiles()
**What goes wrong:** If preview routes through `analyze()`, it will run symbol parsing, global index building, and dependency graph construction — all of which D-02 says to skip, and which add significant latency.
**Why it happens:** It's tempting to reuse `analyze()` since it "already does everything."
**How to avoid:** Call `discoverProjectFiles()` directly for file discovery, then count modules (by directory grouping) and run escomplex separately. Do NOT call `analyze()`.
**Warning signs:** Preview takes >5s on a medium project; generates `.mycodemap/` storage files.

### Pitfall 5: TOML Parser Not Available for Non-Node Projects
**What goes wrong:** `smol-toml` is a new dependency that must be added. If forgotten, Cargo.toml and pyproject.toml dependency extraction will fail silently or throw at runtime.
**Why it happens:** The project currently has no TOML parser; this is a new requirement unique to Phase 54.
**How to avoid:** Add `smol-toml` to `package.json` dependencies in Wave 0. Make the dependency extraction functions gracefully handle parser import failures (return empty deps list).
**Warning signs:** Preview on a Rust/Python project shows 0 dependencies.

### Pitfall 6: escomplex Barfs on Non-JS/TS Files
**What goes wrong:** If preview feeds `.py`, `.go`, or `.rs` files to escomplex, it will throw parse errors.
**Why it happens:** escomplex only handles JS/TS via Babel parser; it cannot parse Python, Go, or Rust.
**How to avoid:** Only feed files with JS/TS extensions (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`) to escomplex. Skip other extensions. Profile `parser.extensions` tells you which extensions exist, but only pass the JS/TS ones to escomplex.
**Warning signs:** Preview crashes with Babel parse error on a `.py` file.

## Code Examples

### escomplex.analyzeModule() Return Shape
```typescript
// Source: [VERIFIED: runtime test via node -e]
const report = escomplex.analyzeModule(sourceCode);
// report.aggregate.cyclomatic: number — total cyclomatic complexity
// report.aggregate.halstead: { bugs, difficulty, effort, ... }
// report.aggregate.sloc: { logical, physical }
// report.maintainability: number — maintainability index
// report.methods: Array<{ name, cyclomatic, sloc, ... }>
// report.errors: Array — parse errors (usually empty if successful)
```

### Complete go.mod Dependency Extraction
```typescript
// Source: [VERIFIED: manual test of go.mod format]
function extractGoDeps(rootDir: string): string[] {
  const goModPath = path.join(rootDir, 'go.mod');
  try {
    const content = readFileSync(goModPath, 'utf8');
    const deps: string[] = [];
    let inRequire = false;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();

      if (trimmed.startsWith('require (')) {
        inRequire = true;
        continue;
      }
      if (inRequire && trimmed === ')') {
        inRequire = false;
        continue;
      }

      if (inRequire) {
        // Strip inline comments: "github.com/pkg v1.0 // indirect"
        const depLine = trimmed.replace(/\/\/.*$/, '').trim();
        const match = depLine.match(/^(\S+)\s+v\S+/);
        if (match) deps.push(match[1]);
      } else if (trimmed.startsWith('require ')) {
        // Single-line require: "require github.com/pkg v1.0"
        const depLine = trimmed.replace(/\/\/.*$/, '').trim();
        const match = depLine.match(/^require\s+(\S+)\s+v\S+/);
        if (match) deps.push(match[1]);
      }
    }
    return deps;
  } catch {
    return [];
  }
}
```

### Cargo.toml / pyproject.toml Dependency Extraction (with smol-toml)
```typescript
// Source: [CITED: smol-toml npm docs]
import { readFileSync } from 'node:fs';
import path from 'node:path';

async function extractRustDeps(rootDir: string): Promise<string[]> {
  const cargoPath = path.join(rootDir, 'Cargo.toml');
  try {
    const content = readFileSync(cargoPath, 'utf8');
    const toml = await import('smol-toml');
    const parsed = toml.parse(content);
    const deps: string[] = [];

    // [dependencies] section
    if (parsed.dependencies && typeof parsed.dependencies === 'object') {
      deps.push(...Object.keys(parsed.dependencies as Record<string, unknown>));
    }
    // [dev-dependencies] section (optional, for completeness)
    if (parsed['dev-dependencies'] && typeof parsed['dev-dependencies'] === 'object') {
      deps.push(...Object.keys(parsed['dev-dependencies'] as Record<string, unknown>));
    }
    return deps;
  } catch {
    return [];
  }
}

async function extractPythonDeps(rootDir: string): Promise<string[]> {
  const pyprojectPath = path.join(rootDir, 'pyproject.toml');
  try {
    const content = readFileSync(pyprojectPath, 'utf8');
    const toml = await import('smol-toml');
    const parsed = toml.parse(content);
    const deps: string[] = [];

    // [project.dependencies] (PEP 621)
    const project = parsed.project as Record<string, unknown> | undefined;
    if (project?.dependencies && Array.isArray(project.dependencies)) {
      // Each entry is like "requests>=2.28" — extract package name
      for (const dep of project.dependencies as string[]) {
        const name = dep.match(/^([A-Za-z0-9_-]+)/)?.[1];
        if (name) deps.push(name);
      }
    }

    // [tool.poetry.dependencies] (Poetry format)
    const poetry = (parsed.tool as Record<string, unknown>)?.poetry as Record<string, unknown> | undefined;
    if (poetry?.dependencies && typeof poetry.dependencies === 'object') {
      deps.push(...Object.keys(poetry.dependencies as Record<string, unknown>));
    }
    return deps;
  } catch {
    return [];
  }
}
```

### Preview Command Registration (in src/cli/index.ts)
```typescript
// Source: [CITED: src/cli/index.ts pattern]
import { previewCommand } from './commands/preview.js';

program
  .command('preview')
  .description('Zero-config project preview')
  .option('--save', 'Save profile config and run full generate')
  .option('-j, --json', 'JSON output')
  .option('--human', 'Force human-readable output')
  .option('--profile <name>', 'Use specified profile (nodejs|python|go|rust|generic)')
  .action(await createActionHandler('preview', previewCommand));
```

### Module Counting by Directory
```typescript
// Source: [ASSUMED — straightforward pattern]
function countModules(files: string[], rootDir: string): {
  count: number;
  top: string[];
} {
  const dirCount = new Map<string, number>();
  for (const file of files) {
    const rel = path.relative(rootDir, file);
    const dir = path.dirname(rel);
    if (dir === '.') continue; // skip root-level files
    dirCount.set(dir, (dirCount.get(dir) ?? 0) + 1);
  }
  // Sort by file count desc, take top N
  const sorted = [...dirCount.entries()]
    .sort((a, b) => b[1] - a[1]);
  return {
    count: dirCount.size,
    top: sorted.slice(0, 5).map(([dir]) => dir),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `codemap generate` requires config file | `loadCodemapConfig()` falls back to `createDefaultCodemapConfig()` with `src/**/*.ts` | Pre-v2.0 | Default config is hardcoded, not profile-aware; preview must bridge this gap |
| `ast-complexity-analyzer.ts` for complexity | `typhonjs-escomplex` for lightweight complexity | Phase 54 introduces | escomplex is CJS, self-contained, no tree-sitter; different tradeoff |
| `codemap init` requires marker file (D-04) | `codemap preview` falls back to generic profile (D-05) | Phase 54 | Preview is more lenient than init; always provides value |

**Deprecated/outdated:**
- typhonjs-escomplex v0.1.0 is the last published version (2018-era). No active maintenance. It works for JS/TS but will not receive updates. This is acceptable for preview's file-level scoring use case. [VERIFIED: npm registry — last publish 6+ years ago]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `import escomplex from 'typhonjs-escomplex'` works in ESM context with TypeScript build | Code Examples | Preview cannot compute complexity; need CJS interop workaround |
| A2 | smol-toml can parse Cargo.toml and pyproject.toml without issues | Standard Stack / Code Examples | Dependency extraction fails for Rust/Python projects; need alternative parser |
| A3 | escomplex can handle all modern JS/TS syntax via Babel plugins | Standard Stack | Parse errors on newer syntax (decorators, satisfy, etc.); need try-catch per file |
| A4 | `discoverProjectFiles()` from `file-discovery.ts` can be called independently without `analyze()` | Architecture Patterns | Must extract file discovery differently; deeper coupling in analyzer |
| A5 | `applyProfilePlan()` from Phase 53 can be reused directly for `--save` without modification | Architecture Patterns | `--save` path breaks; need to adapt or create a new save function |
| A6 | Module counting by directory grouping is sufficient for "module count" in D-08 | Code Examples | Users may expect named modules rather than directory grouping |

## Open Questions

1. **Should preview use the profile's narrow `parser.include` or broader glob patterns?**
   - What we know: Node.js profile uses `src/**/*.{ts,tsx,js,jsx,mjs,cjs}` which misses root-level files and non-src code. Generic profile uses `**/*.{ts,js,py,go,rs}` which is broader.
   - What's unclear: Whether preview should use profile-specific globs (consistent with generate) or generic broader globs (more value for a "quick overview").
   - Recommendation: Use profile-specific globs for consistency with Phase 53 behavior. If user wants broader scanning, they can use `--profile generic`. This keeps preview and init aligned.

2. **Should preview include `devDependencies` in the dependency count?**
   - What we know: CONTEXT.md D-09 says "direct dependencies from marker files" without specifying dev vs prod.
   - What's unclear: Whether "key dependencies" (ZCP-03) should include dev dependencies.
   - Recommendation: Include both `dependencies` and `devDependencies` from package.json (they're all "direct"), but label them separately in the output schema so consumers can filter.

3. **How should preview handle escomplex parse failures on non-JS files in multi-language projects?**
   - What we know: escomplex only handles JS/TS. Python/Go/Rust projects will have non-JS files.
   - What's unclear: Whether to skip complexity scoring entirely for non-JS projects, or show a partial result (JS/TS files only).
   - Recommendation: Only run escomplex on files matching JS/TS extensions. For non-JS projects where 0 JS/TS files exist, show `complexity: { hotspots: [], note: "Complexity analysis requires JavaScript/TypeScript files" }`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI runtime | Yes | 24.14.0 | -- |
| npm | Package manager | Yes | 11.9.0 | -- |
| Vitest | Test runner | Yes | 1.6.1 | -- |
| TypeScript | Build | Yes | 5.3.3+ | -- |
| typhonjs-escomplex | Complexity scoring | Yes | 0.1.0 | -- |
| smol-toml | TOML parsing | No | -- | Skip Cargo.toml/pyproject.toml deps (return empty) |

**Missing dependencies with no fallback:**
- None (smol-toml has graceful fallback: empty dep list for Rust/Python projects)

**Missing dependencies with fallback:**
- smol-toml: Not yet installed. Must be added via `npm install smol-toml` in Wave 0. Without it, dependency extraction from `Cargo.toml` and `pyproject.toml` returns empty arrays (graceful degradation, not blocking).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 1.6.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ZCP-01 | Preview runs without config file | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "runs without config"` | Wave 0 |
| ZCP-02 | Preview auto-detects project type | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "auto-detects"` | Wave 0 |
| ZCP-03 | Preview outputs four sections (files, modules, deps, complexity) | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "four sections"` | Wave 0 |
| ZCP-04 | Preview shows --save hint | unit | `npx vitest run src/cli/commands/__tests__/preview-command.test.ts -t "hint"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/cli/commands/__tests__/preview-command.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/cli/commands/__tests__/preview-command.test.ts` -- covers ZCP-01..04
- [ ] `src/cli/preview/__tests__/dependency-extractor.test.ts` -- covers marker-file dep extraction
- [ ] `src/cli/preview/__tests__/complexity-scanner.test.ts` -- covers escomplex scanning
- [ ] Framework install: `npm install smol-toml` -- new dependency

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — preview is a local-only CLI command |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | zod for profile validation; JSON.parse with try-catch for marker files; smol-toml for TOML parsing |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for CLI/Analysis Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `--profile` | Tampering | Phase 53 `ALLOWED_PROFILE_NAMES` allow-list + path separator check (T-53-01) |
| Malicious package.json with prototype pollution | Tampering | `JSON.parse` is safe from prototype pollution in modern Node; use `Object.keys()` not `for...in` |
| escomplex ReDoS on crafted source files | Denial of Service | Per-file try-catch + timeout not needed (escomplex is synchronous AST walk, bounded by source size) |
| Arbitrary file read via symlink in project directory | Information Disclosure | `discoverProjectFiles()` with `gitignore: true` + globby's default symlink handling |

## Sources

### Primary (HIGH confidence)
- `src/cli/commands/generate.ts` — current generate command implementation
- `src/core/analyzer.ts` — `analyze()` function, `discoverProjectFiles()` usage
- `src/core/file-discovery.ts` — `discoverProjectFiles()` API and `DiscoveryOptions`
- `src/cli/init/detect.ts` — `detectProjectType()`, `DetectionResult`, `ProjectType`
- `src/cli/init/profile-loader.ts` — `loadProfile()`, `BootstrapProfile`, `ANALYSIS_DEPTH_TO_MODE`
- `src/cli/init/profile-plan.ts` — `createProfilePlan()`, `applyProfilePlan()`, `ProfilePlan`
- `src/cli/config-loader.ts` — `loadCodemapConfig()`, `createDefaultCodemapConfig()`, `NormalizedCodemapConfig`
- `src/cli/output/mode.ts` — `resolveOutputMode()`
- `src/cli/output/render.ts` — `renderOutput()`
- `src/cli/output/progress.ts` — `createProgressEmitter()`
- `src/cli/output/types.ts` — `OutputMode`, `ProgressEmitter`, `OutputModeOptions`
- `src/cli/interface-contract/types.ts` — `CommandContract`, `FlagDef`, `OutputShape`
- `src/cli/interface-contract/commands/index.ts` — `commandContracts` registry
- `src/cli/commands/init.ts` — `executeInitCommand()` pattern, profile resolution
- `src/cli/index.ts` — command registration pattern, `createActionHandler()`
- `src/cli/paths.ts` — `CONFIG_FILE_CANONICAL`, `DEFAULT_OUTPUT_DIR_NEW`
- `src/cli/first-run-guide.ts` — `runFirstRunGuide()`, `isFirstRun()`
- typhonjs-escomplex runtime test — `analyzeModule()` return shape verified
- `node_modules/typhonjs-escomplex/dist/ESComplex.js` — API surface (analyzeModule, analyzeProject, parse)

### Secondary (MEDIUM confidence)
- `src/cli/commands/__tests__/init-command.test.ts` — temp directory test pattern
- `src/cli/commands/__tests__/init-profile.test.ts` — profile integration test pattern
- `src/cli/init/reconciler.ts` — `InitAsset`, `InitReceipt`, `createInitPlan`
- `src/cli/commands/complexity.ts` — existing complexity command patterns
- `src/core/ast-complexity-analyzer.ts` — existing AST complexity analysis (not used for preview)
- npm registry — smol-toml v1.6.1, typhonjs-escomplex v0.1.0 version verification

### Tertiary (LOW confidence)
- escomplex CJS/ESM interop behavior — [ASSUMED] based on TypeScript ESM support for CJS default imports; needs build verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in node_modules or npm registry; escomplex tested at runtime
- Architecture: HIGH — all integration points verified via source code reading; `discoverProjectFiles()` confirmed as independently callable
- Pitfalls: MEDIUM — escomplex CJS interop is assumed but not build-verified; smol-toml not yet installed

**Research date:** 2026-05-02
**Valid until:** 2026-06-02 (30 days — stable domain, no fast-moving dependencies)
