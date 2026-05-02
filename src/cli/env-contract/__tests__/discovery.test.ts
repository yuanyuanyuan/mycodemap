// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Tests for discoverProjectEnvironmentContract — verifies item extraction, source snapshots, and authority classification.

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverProjectEnvironmentContract } from '../discovery.js';

describe('discoverProjectEnvironmentContract', () => {
  const tempRoots: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'codemap-discovery-'));
    tempRoots.push(dir);
    return dir;
  }

  function writeFile(rootDir: string, relPath: string, content: string): void {
    const fullPath = path.join(rootDir, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
  }

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) rmSync(root, { recursive: true, force: true });
    }
  });

  const SAMPLE_AGENTS = `# AGENTS.md

## 6. Retrieval Priority
- CodeMap CLI query/analyze/deps/impact should be tried before grep/rg.
- Use \`rtk\` prefix for shell commands.
`;

  const SAMPLE_HOOK = `#!/bin/sh
MSG_FILE=$1
MSG=$(head -1 "$MSG_FILE")
VALID_TAGS="BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE"
if ! echo "$MSG" | grep -qE '^\\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\\]'; then
  echo "ERROR: Commit message must start with an uppercase tag."
  echo "Format: [TAG] scope: message"
  echo "Valid tags: $VALID_TAGS"
  exit 1
fi
`;

  const SAMPLE_PACKAGE = JSON.stringify(
    {
      name: 'test-project',
      scripts: { test: 'vitest run', build: 'tsc', lint: 'eslint src' },
    },
    null,
    2,
  );

  const SAMPLE_TESTING = `# Testing Rules

## Framework
- Vitest
- Coverage: @vitest/coverage-v8

## Real Scenario Validation
- Real filesystem/subprocess evidence required
- At least one failure scenario must be verified
`;

  const SAMPLE_VITEST_CONFIG = `import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
`;

  it('produces all five critical/high items when all sources are present', () => {
    const dir = createTempDir();
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);
    writeFile(dir, '.githooks/commit-msg', SAMPLE_HOOK);
    writeFile(dir, 'package.json', SAMPLE_PACKAGE);
    writeFile(dir, 'docs/rules/testing.md', SAMPLE_TESTING);
    writeFile(dir, 'vitest.config.ts', SAMPLE_VITEST_CONFIG);

    const contract = discoverProjectEnvironmentContract(dir, {
      profileName: 'nodejs',
      generatedAt: '2026-05-02T00:00:00.000Z',
    });

    expect(contract.schemaVersion).toBe('env-contract.v1');

    const ids = contract.items.map((item) => item.id);
    expect(ids).toContain('shell-rtk-wrapper');
    expect(ids).toContain('commit-format');
    expect(ids).toContain('test-entry-vitest');
    expect(ids).toContain('codemap-query-priority');
    expect(ids).toContain('real-scenario-validation');

    expect(contract.items.length).toBeGreaterThanOrEqual(5);
  });

  it('commit-format item includes validTags from hook', () => {
    const dir = createTempDir();
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);
    writeFile(dir, '.githooks/commit-msg', SAMPLE_HOOK);
    writeFile(dir, 'package.json', SAMPLE_PACKAGE);

    const contract = discoverProjectEnvironmentContract(dir);
    const commitItem = contract.items.find((item) => item.id === 'commit-format');

    expect(commitItem).toBeDefined();
    expect(commitItem!.metadata).toBeDefined();
    expect(commitItem!.metadata!.validTags).toEqual([
      'BUGFIX',
      'FEATURE',
      'REFACTOR',
      'CONFIG',
      'DOCS',
      'DELETE',
    ]);
  });

  it('every discovered item has at least one source with file, hash, and authority', () => {
    const dir = createTempDir();
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);
    writeFile(dir, '.githooks/commit-msg', SAMPLE_HOOK);
    writeFile(dir, 'package.json', SAMPLE_PACKAGE);

    const contract = discoverProjectEnvironmentContract(dir);

    for (const item of contract.items) {
      expect(item.sources.length).toBeGreaterThanOrEqual(1);
      for (const source of item.sources) {
        expect(source.file).toBeTruthy();
        expect(source.hash).toMatch(/^sha256:/);
        expect(source.authority).toBeTruthy();
      }
    }
  });

  it('sourceSnapshots includes package.json, .githooks/commit-msg, AGENTS.md, and docs/rules/testing.md when present', () => {
    const dir = createTempDir();
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);
    writeFile(dir, '.githooks/commit-msg', SAMPLE_HOOK);
    writeFile(dir, 'package.json', SAMPLE_PACKAGE);
    writeFile(dir, 'docs/rules/testing.md', SAMPLE_TESTING);

    const contract = discoverProjectEnvironmentContract(dir);

    const snapshotFiles = contract.sourceSnapshots.map((s) => s.file);
    expect(snapshotFiles).toContain('AGENTS.md');
    expect(snapshotFiles).toContain('.githooks/commit-msg');
    expect(snapshotFiles).toContain('package.json');
    expect(snapshotFiles).toContain('docs/rules/testing.md');

    for (const snapshot of contract.sourceSnapshots) {
      expect(snapshot.hash).toMatch(/^sha256:/);
      expect(snapshot.lastModified).toBeTruthy();
    }
  });

  it('classifies .githooks/* and package.json as executable authority', () => {
    const dir = createTempDir();
    writeFile(dir, '.githooks/commit-msg', SAMPLE_HOOK);
    writeFile(dir, 'package.json', SAMPLE_PACKAGE);

    const contract = discoverProjectEnvironmentContract(dir);

    const commitItem = contract.items.find((item) => item.id === 'commit-format');
    expect(commitItem).toBeDefined();
    expect(commitItem!.sources[0].authority).toBe('executable');

    const testItem = contract.items.find((item) => item.id === 'test-entry-vitest');
    expect(testItem).toBeDefined();
    expect(testItem!.sources[0].authority).toBe('executable');
  });

  it('classifies AGENTS.md and docs/rules/ as governance authority', () => {
    const dir = createTempDir();
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);
    writeFile(dir, 'docs/rules/testing.md', SAMPLE_TESTING);

    const contract = discoverProjectEnvironmentContract(dir);

    const rtkItem = contract.items.find((item) => item.id === 'shell-rtk-wrapper');
    expect(rtkItem).toBeDefined();
    expect(rtkItem!.sources[0].authority).toBe('governance');

    const validationItem = contract.items.find((item) => item.id === 'real-scenario-validation');
    expect(validationItem).toBeDefined();
    expect(validationItem!.sources[0].authority).toBe('governance');
  });

  it('omits items when their source files are missing', () => {
    const dir = createTempDir();
    // Only AGENTS.md — no hook, no package.json, no testing.md
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);

    const contract = discoverProjectEnvironmentContract(dir);
    const ids = contract.items.map((item) => item.id);

    expect(ids).toContain('shell-rtk-wrapper');
    expect(ids).toContain('codemap-query-priority');
    expect(ids).not.toContain('commit-format');
    expect(ids).not.toContain('test-entry-vitest');
    expect(ids).not.toContain('real-scenario-validation');
  });

  it('returns empty items for a directory with no source files', () => {
    const dir = createTempDir();

    const contract = discoverProjectEnvironmentContract(dir);

    expect(contract.items).toHaveLength(0);
    expect(contract.sourceSnapshots).toHaveLength(0);
    expect(contract.schemaVersion).toBe('env-contract.v1');
  });

  it('no .mycodemap/prompt-snippets/ path appears in discovery output', () => {
    const dir = createTempDir();
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);
    writeFile(dir, '.githooks/commit-msg', SAMPLE_HOOK);
    writeFile(dir, 'package.json', SAMPLE_PACKAGE);
    writeFile(dir, 'docs/rules/testing.md', SAMPLE_TESTING);

    const contract = discoverProjectEnvironmentContract(dir);
    const json = JSON.stringify(contract);

    expect(json).not.toContain('prompt-snippets');
  });
});
