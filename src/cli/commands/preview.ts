// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Top-level 'preview' command — zero-config project preview with file count,
// modules, dependencies, and complexity hotspots (D-01..D-12).

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { detectProjectType } from '../init/detect.js';
import type { ProjectType } from '../init/detect.js';
import { loadProfile, ANALYSIS_DEPTH_TO_MODE } from '../init/profile-loader.js';
import type { BootstrapProfile } from '../init/profile-loader.js';
import { createProfilePlan, applyProfilePlan, type ProfilePlanScan } from '../init/profile-plan.js';
import { discoverProjectFiles } from '../../core/file-discovery.js';
import { extractDependencies } from '../preview/dependency-extractor.js';
import { scanComplexity } from '../preview/complexity-scanner.js';
import { resolveOutputMode, renderOutput, formatError } from '../output/index.js';
import { formatPreviewHuman, type PreviewData } from '../preview/preview-renderer.js';
import { generateCommand } from './generate.js';
import { CONFIG_FILE_CANONICAL, DEFAULT_OUTPUT_DIR_NEW } from '../paths.js';
import { loadCodemapConfig } from '../config-loader.js';

interface PreviewCommandOptions {
  save?: boolean;
  json?: boolean;
  human?: boolean;
  profile?: string;
}

/**
 * Check whether any user-configured codemap config exists.
 * Reuses the same two-path check as init.ts (D-06).
 */
function hasCanonicalConfig(rootDir: string): boolean {
  const canonicalPath = path.join(rootDir, DEFAULT_OUTPUT_DIR_NEW, CONFIG_FILE_CANONICAL);
  const legacyRootPath = path.join(rootDir, 'mycodemap.config.json');
  return existsSync(canonicalPath) || existsSync(legacyRootPath);
}

/**
 * Resolve which profile to use for the preview.
 *
 * Priority (per D-04, D-05, D-06):
 * 1. If .mycodemap/config.json already exists → use existing config (D-06)
 * 2. If --profile is set → use that profile directly (D-04)
 * 3. Run detectProjectType():
 *    - 0 markers → generic profile (D-05)
 *    - 1 marker  → recommended profile (D-04)
 *    - 2+ markers → first candidate (Claude's Discretion)
 */
async function resolvePreviewProfile(
  rootDir: string,
  options: PreviewCommandOptions,
): Promise<{
  profile: BootstrapProfile | null;
  profileName: string;
  projectType: string;
  existingConfig: boolean;
}> {
  // D-06: existing config skips detection
  if (hasCanonicalConfig(rootDir)) {
    return {
      profile: null,
      profileName: 'existing-config',
      projectType: 'existing-config',
      existingConfig: true,
    };
  }

  // D-04: explicit --profile bypasses detection
  if (options.profile) {
    const profile = loadProfile(options.profile);
    return {
      profile,
      profileName: options.profile,
      projectType: options.profile,
      existingConfig: false,
    };
  }

  // Auto-detect
  const result = detectProjectType(rootDir);

  if (result.candidates.length === 0) {
    // D-05: fall back to generic (preview always provides value, unlike init)
    const profile = loadProfile('generic');
    return {
      profile,
      profileName: 'generic',
      projectType: 'unknown',
      existingConfig: false,
    };
  }

  // Single or multiple markers — pick first candidate
  const selectedType: ProjectType = result.recommended ?? result.candidates[0].type;
  const profile = loadProfile(selectedType);
  return {
    profile,
    profileName: selectedType,
    projectType: selectedType,
    existingConfig: false,
  };
}

/**
 * Count files by extension from a list of absolute file paths.
 */
function countByExtension(files: string[]): Record<string, number> {
  const byExt: Record<string, number> = {};
  for (const file of files) {
    const ext = path.extname(file);
    if (ext) {
      byExt[ext] = (byExt[ext] ?? 0) + 1;
    }
  }
  return byExt;
}

/**
 * Count modules by grouping files by parent directory.
 * Skips root-level files (dir === '.').
 * Returns top-5 directories by file count.
 */
function countModules(files: string[], rootDir: string): { count: number; top: string[] } {
  const dirCount = new Map<string, number>();
  for (const file of files) {
    const rel = path.relative(rootDir, file);
    const dir = path.dirname(rel);
    if (dir === '.') continue; // skip root-level files
    dirCount.set(dir, (dirCount.get(dir) ?? 0) + 1);
  }
  const sorted = [...dirCount.entries()].sort((a, b) => b[1] - a[1]);
  return {
    count: dirCount.size,
    top: sorted.slice(0, 5).map(([dir]) => dir),
  };
}

async function previewAction(options: PreviewCommandOptions): Promise<void> {
  try {
    const rootDir = process.cwd();
    const mode = resolveOutputMode({ json: options.json, human: options.human });

    // Step a: Resolve profile
    const { profile, profileName, projectType, existingConfig } =
      await resolvePreviewProfile(rootDir, options);

    // Step b: File discovery
    let files: string[];
    if (existingConfig) {
      // Use existing config's include/exclude patterns
      const loadedConfig = await loadCodemapConfig(rootDir);
      files = await discoverProjectFiles({
        rootDir,
        include: loadedConfig.config.include,
        exclude: loadedConfig.config.exclude,
        absolute: true,
        gitignore: true,
      });
    } else if (profile) {
      files = await discoverProjectFiles({
        rootDir,
        include: [...profile.parser.include],
        exclude: [...profile.ignore],
        absolute: true,
        gitignore: true,
      });
    } else {
      // Should not happen (generic profile always loaded), but fallback
      files = await discoverProjectFiles({
        rootDir,
        include: ['**/*.{ts,js,py,go,rs}'],
        absolute: true,
        gitignore: true,
      });
    }

    // Count by extension
    const byExtension = countByExtension(files);

    // Step c: Module counting
    const modules = countModules(files, rootDir);

    // Step d: Dependency extraction
    const dependencies = await extractDependencies(rootDir);

    // Step e: Complexity scanning
    const hotspots = scanComplexity(files, rootDir);

    // Step f: Hint text (per D-10)
    let hint = 'Run codemap preview --save to save this config.';
    if (projectType === 'unknown') {
      hint = 'Run codemap preview --save to save this config. No project type detected — using generic defaults. Pass --profile <name> for language-specific analysis.';
    }

    // Step g: Build output data
    const data: PreviewData = {
      projectType,
      profile: profileName,
      files: {
        total: files.length,
        byExtension,
      },
      modules,
      dependencies: {
        direct: dependencies.direct,
        count: dependencies.count,
      },
      complexity: {
        hotspots,
      },
      hint,
    };

    renderOutput(data, formatPreviewHuman, mode);

    // Step h: --save path (per D-03, D-12)
    if (options.save) {
      if (existingConfig) {
        process.stdout.write('Config already exists at .mycodemap/config.json. Running codemap generate...\n');
        await generateCommand({});
      } else if (profile) {
        // Create and apply profile plan
        const canonicalPath = path.join(rootDir, DEFAULT_OUTPUT_DIR_NEW, CONFIG_FILE_CANONICAL);
        const scan: ProfilePlanScan = {
          hasCanonicalConfig: false,
          paths: { canonicalConfigPath: canonicalPath },
        };
        const plan = createProfilePlan(rootDir, profile, scan, 'apply', profileName);
        await applyProfilePlan(plan);
        process.stdout.write(`Config saved to .mycodemap/config.json (profile: ${profileName})\n`);
        process.stdout.write('Running codemap generate...\n');
        await generateCommand({ mode: ANALYSIS_DEPTH_TO_MODE[profile.analysis_depth] });
      }
    }
  } catch (error) {
    const mode = resolveOutputMode({ json: options.json, human: options.human });
    process.stdout.write(formatError(error, mode) + '\n');
    process.exitCode = 1;
  }
}

export const previewCommand = new Command('preview')
  .description('Zero-config project preview')
  .option('--save', 'Save profile config and run full generate')
  .option('-j, --json', 'JSON output')
  .option('--human', 'Force human-readable output')
  .option('--profile <name>', 'Use specified profile (nodejs|python|go|rust|generic)')
  .action(previewAction);
