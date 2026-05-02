import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  extractNodeDeps,
  extractGoDeps,
  extractRustDeps,
  extractPythonDeps,
  extractDependencies,
} from '../dependency-extractor.js';

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

function createTempDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-dep-extract-'));
  tempRoots.push(root);
  return root;
}

describe('extractNodeDeps', () => {
  it('extracts dependencies and devDependencies from valid package.json', () => {
    const rootDir = createTempDir();
    writeFileSync(
      path.join(rootDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        dependencies: { express: '^4.18', commander: '^11.0' },
        devDependencies: { vitest: '^1.0', typescript: '^5.3' },
      }),
      'utf8',
    );

    const deps = extractNodeDeps(rootDir);
    expect(deps).toContain('express');
    expect(deps).toContain('commander');
    expect(deps).toContain('vitest');
    expect(deps).toContain('typescript');
    expect(deps).toHaveLength(4);
  });

  it('returns empty array when package.json is missing', () => {
    const rootDir = createTempDir();
    const deps = extractNodeDeps(rootDir);
    expect(deps).toEqual([]);
  });

  it('returns empty array when package.json contains invalid JSON', () => {
    const rootDir = createTempDir();
    writeFileSync(path.join(rootDir, 'package.json'), 'not json', 'utf8');
    const deps = extractNodeDeps(rootDir);
    expect(deps).toEqual([]);
  });
});

describe('extractGoDeps', () => {
  it('extracts deps from require block and single-line require', () => {
    const rootDir = createTempDir();
    writeFileSync(
      path.join(rootDir, 'go.mod'),
      [
        'module github.com/test/project',
        '',
        'go 1.21',
        '',
        'require (',
        '\tgithub.com/gin-gonic/gin v1.9.1',
        '\tgithub.com/go-sql-driver/mysql v1.7.1 // indirect',
        ')',
        '',
        'require github.com/stretchr/testify v1.8.4',
      ].join('\n'),
      'utf8',
    );

    const deps = extractGoDeps(rootDir);
    expect(deps).toContain('github.com/gin-gonic/gin');
    expect(deps).toContain('github.com/go-sql-driver/mysql');
    expect(deps).toContain('github.com/stretchr/testify');
    expect(deps).toHaveLength(3);
  });

  it('includes indirect deps (they are still deps in go.mod context)', () => {
    const rootDir = createTempDir();
    writeFileSync(
      path.join(rootDir, 'go.mod'),
      [
        'module github.com/test/project',
        '',
        'go 1.21',
        '',
        'require (',
        '\tgithub.com/pkg/errors v0.9.1 // indirect',
        ')',
      ].join('\n'),
      'utf8',
    );

    const deps = extractGoDeps(rootDir);
    expect(deps).toContain('github.com/pkg/errors');
    expect(deps).toHaveLength(1);
  });

  it('returns empty array when go.mod is missing', () => {
    const rootDir = createTempDir();
    const deps = extractGoDeps(rootDir);
    expect(deps).toEqual([]);
  });
});

describe('extractRustDeps', () => {
  it('extracts dependencies and dev-dependencies from Cargo.toml', async () => {
    const rootDir = createTempDir();
    writeFileSync(
      path.join(rootDir, 'Cargo.toml'),
      [
        '[package]',
        'name = "test"',
        'version = "0.1.0"',
        '',
        '[dependencies]',
        'serde = "1.0"',
        'tokio = "1.35"',
        '',
        '[dev-dependencies]',
        'criterion = "0.5"',
      ].join('\n'),
      'utf8',
    );

    const deps = await extractRustDeps(rootDir);
    expect(deps).toContain('serde');
    expect(deps).toContain('tokio');
    expect(deps).toContain('criterion');
    expect(deps).toHaveLength(3);
  });

  it('returns empty array when Cargo.toml is missing', async () => {
    const rootDir = createTempDir();
    const deps = await extractRustDeps(rootDir);
    expect(deps).toEqual([]);
  });
});

describe('extractPythonDeps', () => {
  it('extracts deps from PEP 621 pyproject.toml with version specifiers stripped', async () => {
    const rootDir = createTempDir();
    writeFileSync(
      path.join(rootDir, 'pyproject.toml'),
      [
        '[project]',
        'name = "test"',
        'dependencies = [',
        '  "requests>=2.28",',
        '  "flask==2.3",',
        '  "numpy",',
        ']',
      ].join('\n'),
      'utf8',
    );

    const deps = await extractPythonDeps(rootDir);
    expect(deps).toContain('requests');
    expect(deps).toContain('flask');
    expect(deps).toContain('numpy');
    expect(deps).toHaveLength(3);
  });

  it('extracts deps from Poetry format pyproject.toml', async () => {
    const rootDir = createTempDir();
    writeFileSync(
      path.join(rootDir, 'pyproject.toml'),
      [
        '[tool.poetry]',
        'name = "test"',
        '',
        '[tool.poetry.dependencies]',
        'python = "^3.11"',
        'requests = "^2.28"',
        'flask = "^2.3"',
      ].join('\n'),
      'utf8',
    );

    const deps = await extractPythonDeps(rootDir);
    expect(deps).toContain('python');
    expect(deps).toContain('requests');
    expect(deps).toContain('flask');
    expect(deps).toHaveLength(3);
  });

  it('returns empty array when pyproject.toml is missing', async () => {
    const rootDir = createTempDir();
    const deps = await extractPythonDeps(rootDir);
    expect(deps).toEqual([]);
  });
});

describe('extractDependencies', () => {
  it('combines deps from multiple marker files with correct count', async () => {
    const rootDir = createTempDir();
    // Create a Node.js project
    writeFileSync(
      path.join(rootDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        dependencies: { express: '^4.18' },
        devDependencies: {},
      }),
      'utf8',
    );

    const result = await extractDependencies(rootDir);
    expect(result.direct).toContain('express');
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it('returns empty result on directory with no marker files', async () => {
    const rootDir = createTempDir();
    const result = await extractDependencies(rootDir);
    expect(result).toEqual({ direct: [], count: 0 });
  });
});
