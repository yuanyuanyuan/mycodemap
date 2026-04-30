import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-doctor-ghost-'));
}

describe('checkGhostCommands', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('detects echo stubs in package.json scripts', async () => {
    const { checkGhostCommands } = await import('../../doctor/check-ghost-commands.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);

    const packageJson = {
      scripts: {
        'check:architecture': "echo 'dependency-cruiser not installed, run: npm i -D dependency-cruiser'",
        'check:unused': "echo 'knip not installed, run: npm i -D knip'",
        build: 'tsc',
      },
    };
    writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf8'
    );

    const results = checkGhostCommands(tempDir);

    const ghostResults = results.filter((r) => r.id === 'ghost-command-detected');
    expect(ghostResults).toHaveLength(2);
    expect(ghostResults.every((r) => r.severity === 'error')).toBe(true);
    expect(ghostResults.every((r) => r.category === 'install')).toBe(true);

    // Verify nextCommand is extracted from echo text
    const archResult = ghostResults.find((r) => r.message.includes('check:architecture'));
    expect(archResult?.nextCommand).toContain('npm i -D dependency-cruiser');

    const unusedResult = ghostResults.find((r) => r.message.includes('check:unused'));
    expect(unusedResult?.nextCommand).toContain('npm i -D knip');
  });

  it('returns ok when no echo stubs found', async () => {
    const { checkGhostCommands } = await import('../../doctor/check-ghost-commands.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);

    const packageJson = {
      scripts: {
        build: 'tsc',
        test: 'vitest run',
      },
    };
    writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf8'
    );

    const results = checkGhostCommands(tempDir);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('ok');
    expect(results[0].id).toBe('ghost-commands-ok');
  });

  it('returns ok when package.json has no scripts', async () => {
    const { checkGhostCommands } = await import('../../doctor/check-ghost-commands.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);

    writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test' }, null, 2),
      'utf8'
    );

    const results = checkGhostCommands(tempDir);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('ok');
    expect(results[0].id).toBe('ghost-commands-ok');
  });

  it('returns warn when package.json is missing', async () => {
    const { checkGhostCommands } = await import('../../doctor/check-ghost-commands.js');
    const tempDir = createTempProject();
    tempRoots.push(tempDir);
    // No package.json created

    const results = checkGhostCommands(tempDir);

    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('warn');
    expect(results[0].id).toBe('package-json-missing');
  });
});
