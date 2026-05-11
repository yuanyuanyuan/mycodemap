import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractManifestFacts } from '../manifest-extractors.js';

describe('extractManifestFacts', () => {
  const tempRoots: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'codemap-manifest-'));
    tempRoots.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns testCommand with high confidence from package.json scripts.test', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf8',
    );

    const facts = extractManifestFacts(dir);
    const testItem = facts.items.find((i) => i.key === 'testCommand');

    expect(testItem).toBeDefined();
    expect(testItem!.value).toBe('vitest run');
    expect(testItem!.confidence).toBe('high');
    expect(testItem!.source).toBe('package.json:scripts.test');
  });

  it('returns buildCommand and lintCommand from package.json scripts', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { build: 'tsc', lint: 'eslint .' } }),
      'utf8',
    );

    const facts = extractManifestFacts(dir);
    const buildItem = facts.items.find((i) => i.key === 'buildCommand');
    const lintItem = facts.items.find((i) => i.key === 'lintCommand');

    expect(buildItem).toBeDefined();
    expect(buildItem!.value).toBe('tsc');
    expect(buildItem!.confidence).toBe('high');
    expect(lintItem).toBeDefined();
    expect(lintItem!.value).toBe('eslint .');
    expect(lintItem!.confidence).toBe('high');
  });

  it('returns testCommand and buildCommand as unknown in empty directory', () => {
    const dir = createTempDir();

    const facts = extractManifestFacts(dir);
    const testItem = facts.items.find((i) => i.key === 'testCommand');
    const buildItem = facts.items.find((i) => i.key === 'buildCommand');

    expect(testItem).toBeDefined();
    expect(testItem!.status).toBe('unknown');
    expect(testItem!.source).toBe('not-detected');
    expect(testItem!.confidence).toBe('none');
    expect(buildItem).toBeDefined();
    expect(buildItem!.status).toBe('unknown');
    expect(buildItem!.source).toBe('not-detected');
    expect(buildItem!.confidence).toBe('none');
  });

  it('returns projectName from pyproject.toml', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'pyproject.toml'),
      '[project]\nname = "my-python-app"\nversion = "0.1.0"\n',
      'utf8',
    );

    const facts = extractManifestFacts(dir);
    const nameItem = facts.items.find((i) => i.key === 'projectName');

    expect(nameItem).toBeDefined();
    expect(nameItem!.value).toBe('my-python-app');
    expect(nameItem!.confidence).toBe('high');
    expect(nameItem!.source).toBe('pyproject.toml:project.name');
  });

  it('returns moduleName from go.mod', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'go.mod'),
      'module example.com/myapp\n\ngo 1.21\n',
      'utf8',
    );

    const facts = extractManifestFacts(dir);
    const modItem = facts.items.find((i) => i.key === 'moduleName');

    expect(modItem).toBeDefined();
    expect(modItem!.value).toBe('example.com/myapp');
    expect(modItem!.confidence).toBe('high');
    expect(modItem!.source).toBe('go.mod:module');

    const testItem = facts.items.find((i) => i.key === 'testCommand');
    expect(testItem).toBeDefined();
    expect(testItem!.value).toBe('go test ./...');
    expect(testItem!.confidence).toBe('medium');
    expect(testItem!.source).toBe('go.mod:module');
  });

  it('returns packageName from Cargo.toml', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'Cargo.toml'),
      '[package]\nname = "my-rust-app"\nversion = "0.1.0"\n',
      'utf8',
    );

    const facts = extractManifestFacts(dir);
    const pkgItem = facts.items.find((i) => i.key === 'packageName');

    expect(pkgItem).toBeDefined();
    expect(pkgItem!.value).toBe('my-rust-app');
    expect(pkgItem!.confidence).toBe('high');
    expect(pkgItem!.source).toBe('Cargo.toml:package.name');

    const testItem = facts.items.find((i) => i.key === 'testCommand');
    expect(testItem).toBeDefined();
    expect(testItem!.value).toBe('cargo test');
    expect(testItem!.confidence).toBe('medium');
    expect(testItem!.source).toBe('Cargo.toml:package.name');
  });

  it('sets projectType from profileName parameter', () => {
    const dir = createTempDir();

    const facts = extractManifestFacts(dir, 'nodejs');

    expect(facts.projectType).toBe('nodejs');
    expect(facts.projectSource).toBe('package.json');
  });

  it('defaults projectType to generic when no profileName given', () => {
    const dir = createTempDir();

    const facts = extractManifestFacts(dir);

    expect(facts.projectType).toBe('generic');
  });
});
