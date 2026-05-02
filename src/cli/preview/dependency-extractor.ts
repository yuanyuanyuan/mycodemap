// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Marker-file dependency extraction for codemap preview — reads package.json,
// go.mod, Cargo.toml, pyproject.toml to list direct dependencies without source-code
// parsing. Graceful degradation: each extractor returns [] on missing/unparseable files.

import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface DependencyExtractionResult {
  direct: string[];
  count: number;
}

/**
 * Extract direct and dev dependencies from a Node.js package.json.
 * Returns concatenated keys of `dependencies` and `devDependencies`.
 * Returns [] on any error (missing file, invalid JSON, etc.).
 */
export function extractNodeDeps(rootDir: string): string[] {
  try {
    const content = readFileSync(path.join(rootDir, 'package.json'), 'utf8');
    const pkg = JSON.parse(content) as Record<string, unknown>;
    return [
      ...Object.keys((pkg.dependencies as Record<string, unknown>) || {}),
      ...Object.keys((pkg.devDependencies as Record<string, unknown>) || {}),
    ];
  } catch {
    return [];
  }
}

/**
 * Extract direct dependencies from a Go go.mod file.
 * Handles both `require (` blocks and single-line `require` statements.
 * Strips `// indirect` and `// direct` inline comments before parsing.
 * Returns [] on any error (missing file, read failure, etc.).
 */
export function extractGoDeps(rootDir: string): string[] {
  try {
    const content = readFileSync(path.join(rootDir, 'go.mod'), 'utf8');
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

/**
 * Extract direct and dev dependencies from a Rust Cargo.toml file.
 * Uses smol-toml (dynamic import) for TOML parsing.
 * Returns [] on any error (missing file, parse failure, smol-toml import failure, etc.).
 */
export async function extractRustDeps(rootDir: string): Promise<string[]> {
  try {
    const content = readFileSync(path.join(rootDir, 'Cargo.toml'), 'utf8');
    const { parse: parseToml } = await import('smol-toml');
    const parsed = parseToml(content) as Record<string, unknown>;
    const deps: string[] = [];

    if (parsed.dependencies && typeof parsed.dependencies === 'object') {
      deps.push(...Object.keys(parsed.dependencies as Record<string, unknown>));
    }
    if (parsed['dev-dependencies'] && typeof parsed['dev-dependencies'] === 'object') {
      deps.push(...Object.keys(parsed['dev-dependencies'] as Record<string, unknown>));
    }
    return deps;
  } catch {
    return [];
  }
}

/**
 * Extract direct dependencies from a Python pyproject.toml file.
 * Supports both PEP 621 `[project.dependencies]` and Poetry
 * `[tool.poetry.dependencies]` formats.
 * Uses smol-toml (dynamic import) for TOML parsing.
 * Returns [] on any error (missing file, parse failure, smol-toml import failure, etc.).
 */
export async function extractPythonDeps(rootDir: string): Promise<string[]> {
  try {
    const content = readFileSync(path.join(rootDir, 'pyproject.toml'), 'utf8');
    const { parse: parseToml } = await import('smol-toml');
    const parsed = parseToml(content) as Record<string, unknown>;
    const deps: string[] = [];

    // PEP 621 format: [project.dependencies]
    const project = parsed.project as Record<string, unknown> | undefined;
    if (project?.dependencies && Array.isArray(project.dependencies)) {
      for (const dep of project.dependencies as string[]) {
        const name = dep.match(/^([A-Za-z0-9_-]+)/)?.[1];
        if (name) deps.push(name);
      }
    }

    // Poetry format: [tool.poetry.dependencies]
    const tool = parsed.tool as Record<string, unknown> | undefined;
    const poetry = tool?.poetry as Record<string, unknown> | undefined;
    if (poetry?.dependencies && typeof poetry.dependencies === 'object') {
      deps.push(...Object.keys(poetry.dependencies as Record<string, unknown>));
    }

    return deps;
  } catch {
    return [];
  }
}

/**
 * Extract all direct dependencies from all supported marker files.
 * Calls all four extractors and deduplicates the results.
 * Returns { direct: string[], count: number }.
 */
export async function extractDependencies(rootDir: string): Promise<DependencyExtractionResult> {
  const [nodeDeps, goDeps, rustDeps, pythonDeps] = await Promise.all([
    Promise.resolve(extractNodeDeps(rootDir)),
    Promise.resolve(extractGoDeps(rootDir)),
    extractRustDeps(rootDir),
    extractPythonDeps(rootDir),
  ]);

  const all = [...nodeDeps, ...goDeps, ...rustDeps, ...pythonDeps];
  const direct = Array.from(new Set(all));
  return { direct, count: direct.length };
}
