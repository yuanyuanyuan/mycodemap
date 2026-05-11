// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Phase 55 — extract obvious project facts from package.json, pyproject.toml,
// go.mod, Cargo.toml for env-contract seed generation.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseToml } from 'smol-toml';

export interface ManifestItem {
  category: 'execution' | 'commit' | 'retrieval' | 'validation' | 'style';
  key: string;
  value?: string;
  status?: 'unknown';
  source: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface ManifestFacts {
  projectType: string;
  projectSource: string;
  items: ManifestItem[];
}

function safeReadFile(filePath: string): string | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function extractPackageJson(rootDir: string, items: ManifestItem[]): void {
  const text = safeReadFile(path.join(rootDir, 'package.json'));
  if (!text) return;

  try {
    const pkg = JSON.parse(text) as Record<string, unknown>;
    const scripts = pkg.scripts as Record<string, string> | undefined;

    if (scripts?.test) {
      items.push({
        category: 'execution',
        key: 'testCommand',
        value: scripts.test,
        source: 'package.json:scripts.test',
        confidence: 'high',
      });
    }

    if (scripts?.build) {
      items.push({
        category: 'execution',
        key: 'buildCommand',
        value: scripts.build,
        source: 'package.json:scripts.build',
        confidence: 'high',
      });
    }

    if (scripts?.lint) {
      items.push({
        category: 'execution',
        key: 'lintCommand',
        value: scripts.lint,
        source: 'package.json:scripts.lint',
        confidence: 'high',
      });
    }

    if (typeof pkg.main === 'string') {
      items.push({
        category: 'execution',
        key: 'entryPoint',
        value: pkg.main,
        source: 'package.json:main',
        confidence: 'medium',
      });
    }
  } catch {
    // skip malformed package.json
  }
}

function extractPyprojectToml(rootDir: string, items: ManifestItem[]): void {
  const text = safeReadFile(path.join(rootDir, 'pyproject.toml'));
  if (!text) return;

  try {
    const parsed = parseToml(text) as Record<string, unknown>;
    const project = parsed.project as Record<string, unknown> | undefined;

    if (project?.name) {
      items.push({
        category: 'execution',
        key: 'projectName',
        value: String(project.name),
        source: 'pyproject.toml:project.name',
        confidence: 'high',
      });
    }

    const tool = parsed.tool as Record<string, unknown> | undefined;
    const pytest = tool?.pytest as Record<string, unknown> | undefined;
    if (pytest?.ini_options) {
      items.push({
        category: 'execution',
        key: 'testCommand',
        value: 'pytest',
        source: 'pyproject.toml:tool.pytest',
        confidence: 'medium',
      });
    }
  } catch {
    // skip malformed pyproject.toml
  }
}

function extractGoMod(rootDir: string, items: ManifestItem[]): void {
  const text = safeReadFile(path.join(rootDir, 'go.mod'));
  if (!text) return;

  try {
    const match = text.match(/^module\s+(.+)$/m);
    if (match) {
      items.push({
        category: 'execution',
        key: 'moduleName',
        value: match[1].trim(),
        source: 'go.mod:module',
        confidence: 'high',
      });
      items.push({
        category: 'execution',
        key: 'testCommand',
        value: 'go test ./...',
        source: 'go.mod:module',
        confidence: 'medium',
      });
    }
  } catch {
    // skip malformed go.mod
  }
}

function extractCargoToml(rootDir: string, items: ManifestItem[]): void {
  const text = safeReadFile(path.join(rootDir, 'Cargo.toml'));
  if (!text) return;

  try {
    const parsed = parseToml(text) as Record<string, unknown>;
    const pkg = parsed.package as Record<string, unknown> | undefined;

    if (pkg?.name) {
      items.push({
        category: 'execution',
        key: 'packageName',
        value: String(pkg.name),
        source: 'Cargo.toml:package.name',
        confidence: 'high',
      });
      items.push({
        category: 'execution',
        key: 'testCommand',
        value: 'cargo test',
        source: 'Cargo.toml:package.name',
        confidence: 'medium',
      });
    }
  } catch {
    // skip malformed Cargo.toml
  }
}

function addMissingDefaults(items: ManifestItem[]): void {
  const keys = new Set(items.map((item) => item.key));

  if (!keys.has('testCommand')) {
    items.push({
      category: 'execution',
      key: 'testCommand',
      status: 'unknown',
      source: 'not-detected',
      confidence: 'none',
    });
  }

  if (!keys.has('buildCommand')) {
    items.push({
      category: 'execution',
      key: 'buildCommand',
      status: 'unknown',
      source: 'not-detected',
      confidence: 'none',
    });
  }
}

/**
 * Extract obvious project facts from manifest files in `rootDir`.
 *
 * Reads package.json, pyproject.toml, go.mod, Cargo.toml for basic
 * project metadata. Returns typed ManifestFacts with items[].
 * Missing items are represented as status: 'unknown' with source: 'not-detected'.
 */
export function extractManifestFacts(
  rootDir: string,
  profileName?: string,
): ManifestFacts {
  const items: ManifestItem[] = [];

  extractPackageJson(rootDir, items);
  extractPyprojectToml(rootDir, items);
  extractGoMod(rootDir, items);
  extractCargoToml(rootDir, items);
  addMissingDefaults(items);

  // Determine project source from whichever manifest was detected
  const sourceMap: Record<string, string> = {
    nodejs: 'package.json',
    python: 'pyproject.toml',
    go: 'go.mod',
    rust: 'Cargo.toml',
  };
  const projectType = profileName ?? 'generic';
  const projectSource = sourceMap[projectType] ?? 'not-detected';

  return { projectType, projectSource, items };
}
