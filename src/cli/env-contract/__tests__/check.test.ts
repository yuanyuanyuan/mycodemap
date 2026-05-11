// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Tests for checkProjectEnvironmentContract — verifies schema, critical items, drift, and conflict checks.

import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkProjectEnvironmentContract } from '../check.js';
import type { ProjectEnvironmentContract, ContractItem } from '../types.js';

function validItem(overrides: Partial<ContractItem> = {}): ContractItem {
  return {
    id: 'shell-rtk-wrapper',
    category: 'execution',
    severity: 'critical',
    content: 'Shell commands must be wrapped with rtk.',
    sources: [{ file: 'AGENTS.md', hash: 'sha256:test', authority: 'governance' }],
    ...overrides,
  };
}

function validContract(
  overrides: Partial<ProjectEnvironmentContract> = {},
): ProjectEnvironmentContract {
  return {
    schemaVersion: 'env-contract.v1',
    generatedAt: '2026-05-02T00:00:00.000Z',
    projectProfile: { name: 'nodejs', source: 'package.json', confidence: 'high' },
    items: [
      validItem({ id: 'commit-format', category: 'commit' }),
      validItem({ id: 'test-entry-command', category: 'execution' }),
    ],
    conflicts: [],
    sourceSnapshots: [],
    ...overrides,
  };
}

describe('checkProjectEnvironmentContract', () => {
  const tempDirs: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'codemap-check-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const d = tempDirs.pop();
      if (d) rmSync(d, { recursive: true, force: true });
    }
  });

  it('returns status ok for a valid contract with critical items and no conflicts', () => {
    const result = checkProjectEnvironmentContract(validContract());

    expect(result.ok).toBe(true);
    expect(result.status).toBe('ok');
    expect(result.diagnostics.find((d) => d.id === 'schema-valid')!.severity).toBe('ok');
    expect(result.diagnostics.find((d) => d.id === 'critical-items-present')!.severity).toBe('ok');
    expect(result.diagnostics.find((d) => d.id === 'conflicts')!.severity).toBe('ok');
  });

  it('returns status error when schema is invalid', () => {
    const contract = validContract();
    (contract as Record<string, unknown>).schemaVersion = 'env-contract.seed.v1';

    const result = checkProjectEnvironmentContract(contract as ProjectEnvironmentContract);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    expect(result.diagnostics[0].severity).toBe('error');
  });

  it('returns status error when commit-format is missing', () => {
    const contract = validContract({
      items: [validItem({ id: 'test-entry-command', category: 'execution' })],
    });

    const result = checkProjectEnvironmentContract(contract);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    const criticalDiag = result.diagnostics.find((d) => d.id === 'critical-items-present');
    expect(criticalDiag!.severity).toBe('error');
    expect(criticalDiag!.message).toContain('commit-format');
  });

  it('returns status error when test-entry-command is missing', () => {
    const contract = validContract({
      items: [validItem({ id: 'commit-format', category: 'commit' })],
    });

    const result = checkProjectEnvironmentContract(contract);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    const criticalDiag = result.diagnostics.find((d) => d.id === 'critical-items-present');
    expect(criticalDiag!.severity).toBe('error');
    expect(criticalDiag!.message).toContain('test-entry-command');
  });

  it('returns status error when a source snapshot hash no longer matches', () => {
    const dir = createTempDir();
    const sourceFile = 'AGENTS.md';
    writeFileSync(path.join(dir, sourceFile), 'original content', 'utf8');

    // Contract was generated with a different hash
    const contract = validContract({
      sourceSnapshots: [
        { file: sourceFile, hash: 'sha256:stalehash', lastModified: '2026-05-01T00:00:00.000Z' },
      ],
    });

    const result = checkProjectEnvironmentContract(contract, dir);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    const driftDiag = result.diagnostics.find((d) => d.id === `source-drift:${sourceFile}`);
    expect(driftDiag).toBeDefined();
    expect(driftDiag!.severity).toBe('error');
  });

  it('returns status ok when source snapshot hash matches current file', () => {
    const dir = createTempDir();
    const sourceFile = 'AGENTS.md';
    const content = 'current content';
    writeFileSync(path.join(dir, sourceFile), content, 'utf8');

    // Compute the correct hash
    const hash = `sha256:${createHash('sha256').update(content).digest('hex')}`;

    const contract = validContract({
      sourceSnapshots: [
        { file: sourceFile, hash, lastModified: '2026-05-02T00:00:00.000Z' },
      ],
    });

    const result = checkProjectEnvironmentContract(contract, dir);

    expect(result.ok).toBe(true);
    const driftDiag = result.diagnostics.find((d) => d.id === `source-drift:${sourceFile}`);
    expect(driftDiag).toBeUndefined();
  });

  it('returns status warn when conflicts exist but critical items are present and fresh', () => {
    const contract = validContract({
      conflicts: [
        {
          id: 'test-conflict',
          severity: 'medium',
          description: 'Test conflict',
          sources: [{ file: 'a.md', value: 'A' }],
          recommendation: 'Use A',
        },
      ],
    });

    const result = checkProjectEnvironmentContract(contract);

    expect(result.ok).toBe(true);
    expect(result.status).toBe('warn');
    const conflictsDiag = result.diagnostics.find((d) => d.id === 'conflicts');
    expect(conflictsDiag!.severity).toBe('warn');
  });

  it('returns status error when source file no longer exists', () => {
    const dir = createTempDir();
    // AGENTS.md does not exist in this temp dir

    const contract = validContract({
      sourceSnapshots: [
        { file: 'AGENTS.md', hash: 'sha256:abc', lastModified: '2026-05-01T00:00:00.000Z' },
      ],
    });

    const result = checkProjectEnvironmentContract(contract, dir);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    const driftDiag = result.diagnostics.find((d) => d.id === 'source-drift:AGENTS.md');
    expect(driftDiag!.severity).toBe('error');
    expect(driftDiag!.message).toContain('no longer exists');
  });
});
