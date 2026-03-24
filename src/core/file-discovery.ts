// [META] since:2026-03 | owner:core-team | stable:true
// [WHY] Centralize .gitignore-aware file discovery shared by analyzer and CI scanners

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { globby, globbySync, type Options as GlobbyOptions } from 'globby';

export const DEFAULT_DISCOVERY_EXCLUDES = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.d.ts'
] as const;

const DISCOVERY_ROOT_MARKERS = ['package.json', '.gitignore', '.git'] as const;

export interface DiscoveryOptions {
  rootDir: string;
  include: readonly string[];
  exclude?: readonly string[];
  absolute?: boolean;
  onlyFiles?: boolean;
  gitignore?: boolean;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep);
}

function hasDiscoveryRootMarker(directory: string): boolean {
  return DISCOVERY_ROOT_MARKERS.some((marker) => existsSync(path.join(directory, marker)));
}

function isGitDirectory(rootDir: string): boolean {
  const gitPath = path.join(rootDir, '.git');

  try {
    return statSync(gitPath).isDirectory();
  } catch {
    return false;
  }
}

export function resolveDiscoveryRoot(startDir: string): string {
  const initialDir = path.resolve(startDir);
  let currentDir = initialDir;

  while (true) {
    if (hasDiscoveryRootMarker(currentDir)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return initialDir;
    }

    currentDir = parentDir;
  }
}

export function resolveDiscoveryIgnorePatterns(
  rootDir: string,
  exclude: readonly string[] = DEFAULT_DISCOVERY_EXCLUDES
): string[] {
  const ignorePatterns = new Set(exclude.map((pattern) => toPosixPath(pattern)));

  if (isGitDirectory(rootDir)) {
    ignorePatterns.add('.git/**');
  }

  return [...ignorePatterns];
}

export function createScopedIncludePatterns(
  rootDir: string,
  scopeDir: string,
  include: readonly string[]
): string[] {
  const relativeScope = toPosixPath(path.relative(rootDir, scopeDir));

  if (relativeScope === '' || relativeScope === '.') {
    return [...include];
  }

  return include.map((pattern) => path.posix.join(relativeScope, pattern));
}

export function createDiscoveryOptions(options: DiscoveryOptions): GlobbyOptions {
  const {
    rootDir,
    exclude = DEFAULT_DISCOVERY_EXCLUDES,
    absolute = true,
    onlyFiles = true,
    gitignore = true,
  } = options;

  return {
    cwd: rootDir,
    absolute,
    onlyFiles,
    gitignore,
    ignore: resolveDiscoveryIgnorePatterns(rootDir, exclude),
  };
}

export async function discoverProjectFiles(options: DiscoveryOptions): Promise<string[]> {
  return globby(options.include, createDiscoveryOptions(options));
}

export function discoverProjectFilesSync(options: DiscoveryOptions): string[] {
  return globbySync(options.include, createDiscoveryOptions(options));
}
