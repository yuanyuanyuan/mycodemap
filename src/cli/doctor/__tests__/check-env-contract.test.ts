// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Tests for checkEnvContract — schema, critical items, drift, conflicts, and missing contract

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkEnvContract } from '../check-env-contract.js';

function createTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-doctor-env-'));
}

function writeFile(rootDir: string, relPath: string, content: string): void {
  const fullPath = path.join(rootDir, relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

function sha256Hex(content: string): string {
  const { createHash } = require('node:crypto');
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

describe('checkEnvContract', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns env-contract-missing warn when contract file does not exist', () => {
    const dir = createTempDir();
    tempRoots.push(dir);

    const results = checkEnvContract(dir);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('env-contract-missing');
    expect(results[0].severity).toBe('warn');
    expect(results[0].category).toBe('agent');
  });

  it('returns env-contract-fresh ok for a valid contract with no issues', () => {
    const dir = createTempDir();
    tempRoots.push(dir);

    const hookContent = '#!/bin/sh\necho "commit-msg hook"';
    const packageContent = JSON.stringify({ scripts: { test: 'vitest run' } });
    const agentsContent = '# AGENTS\n## 6. Retrieval Priority\n- Use rtk\n';
    const testingContent = '# Testing Rules\n- Vitest\n';

    writeFile(dir, '.githooks/commit-msg', hookContent);
    writeFile(dir, 'package.json', packageContent);
    writeFile(dir, 'AGENTS.md', agentsContent);
    writeFile(dir, 'docs/rules/testing.md', testingContent);

    const contract = {
      schemaVersion: 'env-contract.v1',
      generatedAt: '2026-05-02T00:00:00.000Z',
      projectProfile: { name: 'nodejs', source: 'package.json', confidence: 'high' },
      items: [
        {
          id: 'commit-format',
          category: 'commit',
          severity: 'critical',
          content: '[TAG] scope: message',
          sources: [{ file: '.githooks/commit-msg', hash: sha256Hex(hookContent), authority: 'executable' }],
        },
        {
          id: 'test-entry-command',
          category: 'execution',
          severity: 'critical',
          content: 'vitest run',
          sources: [{ file: 'package.json', hash: sha256Hex(packageContent), authority: 'executable' }],
        },
      ],
      conflicts: [],
      sourceSnapshots: [
        { file: '.githooks/commit-msg', hash: sha256Hex(hookContent), lastModified: '2026-05-01T00:00:00.000Z' },
        { file: 'package.json', hash: sha256Hex(packageContent), lastModified: '2026-05-01T00:00:00.000Z' },
        { file: 'AGENTS.md', hash: sha256Hex(agentsContent), lastModified: '2026-05-01T00:00:00.000Z' },
        { file: 'docs/rules/testing.md', hash: sha256Hex(testingContent), lastModified: '2026-05-01T00:00:00.000Z' },
      ],
    };

    writeFile(dir, '.mycodemap/env-contract.json', JSON.stringify(contract, null, 2));

    const results = checkEnvContract(dir);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('env-contract-fresh');
    expect(results[0].severity).toBe('ok');
    expect(results[0].category).toBe('agent');
  });

  it('returns env-contract-source-drift error when a source file changes after generation', () => {
    const dir = createTempDir();
    tempRoots.push(dir);

    const hookContent = '#!/bin/sh\necho "commit-msg hook"';
    const packageContent = JSON.stringify({ scripts: { test: 'vitest run' } });

    writeFile(dir, '.githooks/commit-msg', hookContent);
    writeFile(dir, 'package.json', packageContent);

    const contract = {
      schemaVersion: 'env-contract.v1',
      generatedAt: '2026-05-02T00:00:00.000Z',
      projectProfile: { name: 'nodejs', source: 'package.json', confidence: 'high' },
      items: [
        {
          id: 'commit-format',
          category: 'commit',
          severity: 'critical',
          content: '[TAG] scope: message',
          sources: [{ file: '.githooks/commit-msg', hash: sha256Hex(hookContent), authority: 'executable' }],
        },
        {
          id: 'test-entry-command',
          category: 'execution',
          severity: 'critical',
          content: 'vitest run',
          sources: [{ file: 'package.json', hash: sha256Hex(packageContent), authority: 'executable' }],
        },
      ],
      conflicts: [],
      sourceSnapshots: [
        { file: '.githooks/commit-msg', hash: sha256Hex(hookContent), lastModified: '2026-05-01T00:00:00.000Z' },
        { file: 'package.json', hash: sha256Hex(packageContent), lastModified: '2026-05-01T00:00:00.000Z' },
      ],
    };

    writeFile(dir, '.mycodemap/env-contract.json', JSON.stringify(contract, null, 2));

    // Mutate the hook file AFTER contract generation
    writeFile(dir, '.githooks/commit-msg', '#!/bin/sh\necho "NEW FORMAT"');

    const results = checkEnvContract(dir);

    const driftResult = results.find((r) => r.id === 'env-contract-source-drift');
    expect(driftResult).toBeDefined();
    expect(driftResult!.severity).toBe('error');
    expect(driftResult!.message).toContain('.githooks/commit-msg');
  });

  it('returns env-contract-conflict warn when contract has conflicts', () => {
    const dir = createTempDir();
    tempRoots.push(dir);

    const hookContent = '#!/bin/sh\necho "commit-msg hook"';
    const packageContent = JSON.stringify({ scripts: { test: 'vitest run' } });

    writeFile(dir, '.githooks/commit-msg', hookContent);
    writeFile(dir, 'package.json', packageContent);

    const contract = {
      schemaVersion: 'env-contract.v1',
      generatedAt: '2026-05-02T00:00:00.000Z',
      projectProfile: { name: 'nodejs', source: 'package.json', confidence: 'high' },
      items: [
        {
          id: 'commit-format',
          category: 'commit',
          severity: 'critical',
          content: '[TAG] scope: message',
          sources: [{ file: '.githooks/commit-msg', hash: sha256Hex(hookContent), authority: 'executable' }],
        },
        {
          id: 'test-entry-command',
          category: 'execution',
          severity: 'critical',
          content: 'vitest run',
          sources: [{ file: 'package.json', hash: sha256Hex(packageContent), authority: 'executable' }],
        },
      ],
      conflicts: [
        {
          id: 'commit-tag-case',
          severity: 'high',
          description: 'Commit tag case mismatch between hook and docs',
          sources: [
            { file: '.githooks/commit-msg', value: 'BUGFIX' },
            { file: 'docs/brainstorms/example.md', value: 'feat' },
          ],
          recommendation: 'Hook is the enforcement source',
        },
      ],
      sourceSnapshots: [
        { file: '.githooks/commit-msg', hash: sha256Hex(hookContent), lastModified: '2026-05-01T00:00:00.000Z' },
        { file: 'package.json', hash: sha256Hex(packageContent), lastModified: '2026-05-01T00:00:00.000Z' },
      ],
    };

    writeFile(dir, '.mycodemap/env-contract.json', JSON.stringify(contract, null, 2));

    const results = checkEnvContract(dir);

    const conflictResult = results.find((r) => r.id === 'env-contract-conflict');
    expect(conflictResult).toBeDefined();
    expect(conflictResult!.severity).toBe('warn');
    expect(conflictResult!.message).toContain('1 conflict(s)');

    // Should NOT have an error-level result (conflicts are warn-only)
    const errorResults = results.filter((r) => r.severity === 'error');
    expect(errorResults).toHaveLength(0);
  });

  it('returns env-contract-critical-missing error when critical items are absent', () => {
    const dir = createTempDir();
    tempRoots.push(dir);

    const hookContent = '#!/bin/sh\necho "commit-msg hook"';
    writeFile(dir, '.githooks/commit-msg', hookContent);

    // Contract with no items — missing both critical items
    const contract = {
      schemaVersion: 'env-contract.v1',
      generatedAt: '2026-05-02T00:00:00.000Z',
      projectProfile: { name: 'generic', source: 'none', confidence: 'none' },
      items: [],
      conflicts: [],
      sourceSnapshots: [
        { file: '.githooks/commit-msg', hash: sha256Hex(hookContent), lastModified: '2026-05-01T00:00:00.000Z' },
      ],
    };

    writeFile(dir, '.mycodemap/env-contract.json', JSON.stringify(contract, null, 2));

    const results = checkEnvContract(dir);

    const criticalResult = results.find((r) => r.id === 'env-contract-critical-missing');
    expect(criticalResult).toBeDefined();
    expect(criticalResult!.severity).toBe('error');
  });

  it('returns env-contract-unreadable error for malformed JSON', () => {
    const dir = createTempDir();
    tempRoots.push(dir);

    writeFile(dir, '.mycodemap/env-contract.json', '{ invalid json !!!');

    const results = checkEnvContract(dir);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('env-contract-unreadable');
    expect(results[0].severity).toBe('error');
  });
});
