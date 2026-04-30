import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-doctor-drift-'));
}

describe('checkWorkspaceDrift', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('returns warn when init-last.json is missing', async () => {
    const { checkWorkspaceDrift } = await import('../../doctor/check-workspace-drift.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);
    // No .mycodemap directory created

    const results = checkWorkspaceDrift(tempDir);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('warn');
    expect(results[0].id).toBe('workspace-not-initialized');
  });

  it('returns error for missing tool-owned assets', async () => {
    const { checkWorkspaceDrift } = await import('../../doctor/check-workspace-drift.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);

    // Create .mycodemap/status/ directory
    const statusDir = path.join(tempDir, '.mycodemap', 'status');
    mkdirSync(statusDir, { recursive: true });

    // Write receipt with a tool-owned asset whose path does not exist
    const receipt = {
      version: 1,
      assets: [
        {
          key: 'canonical-config',
          label: 'canonical config',
          status: 'installed',
          ownership: 'tool-owned',
          path: '.mycodemap/config.json',
        },
      ],
    };
    writeFileSync(
      path.join(statusDir, 'init-last.json'),
      JSON.stringify(receipt, null, 2),
      'utf8'
    );
    // Do NOT create .mycodemap/config.json — it's missing

    const results = checkWorkspaceDrift(tempDir);

    const driftResult = results.find((r) => r.id === 'workspace-drift-detected');
    expect(driftResult).toBeDefined();
    expect(driftResult!.severity).toBe('error');
    expect(driftResult!.message).toContain('canonical-config');
  });

  it('returns warn for missing user-owned assets', async () => {
    const { checkWorkspaceDrift } = await import('../../doctor/check-workspace-drift.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);

    const statusDir = path.join(tempDir, '.mycodemap', 'status');
    mkdirSync(statusDir, { recursive: true });

    const receipt = {
      version: 1,
      assets: [
        {
          key: 'legacy-output-dir',
          label: 'legacy .codemap',
          status: 'manual-action-needed',
          ownership: 'user-owned',
          path: '.codemap',
        },
      ],
    };
    writeFileSync(
      path.join(statusDir, 'init-last.json'),
      JSON.stringify(receipt, null, 2),
      'utf8'
    );
    // Do NOT create .codemap — it's missing but user-owned

    const results = checkWorkspaceDrift(tempDir);

    const driftResult = results.find((r) => r.id === 'workspace-drift-detected');
    expect(driftResult).toBeDefined();
    expect(driftResult!.severity).toBe('warn');
  });

  it('returns ok when all assets exist', async () => {
    const { checkWorkspaceDrift } = await import('../../doctor/check-workspace-drift.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);

    // Create the workspace structure and assets
    const mycodemapDir = path.join(tempDir, '.mycodemap');
    mkdirSync(mycodemapDir, { recursive: true });
    mkdirSync(path.join(mycodemapDir, 'status'), { recursive: true });

    // Create the actual file on disk
    writeFileSync(path.join(mycodemapDir, 'config.json'), '{}', 'utf8');

    const receipt = {
      version: 1,
      assets: [
        {
          key: 'canonical-config',
          label: 'canonical config',
          status: 'already-synced',
          ownership: 'tool-owned',
          path: '.mycodemap/config.json',
        },
      ],
    };
    writeFileSync(
      path.join(mycodemapDir, 'status', 'init-last.json'),
      JSON.stringify(receipt, null, 2),
      'utf8'
    );

    const results = checkWorkspaceDrift(tempDir);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('ok');
    expect(results[0].id).toBe('workspace-drift-ok');
  });
});
