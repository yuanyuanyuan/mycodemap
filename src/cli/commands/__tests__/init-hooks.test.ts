import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function createColorMock() {
  const color = (text: string) => text;
  return Object.assign(color, {
    bold: (text: string) => text,
  });
}

vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => text,
    cyan: (text: string) => text,
    gray: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
    white: createColorMock(),
    yellow: (text: string) => text,
  },
}));

import { executeInitCommand } from '../init.js';
import { createHookPlan } from '../../init/hooks.js';

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-init-hooks-'));
}

function countOccurrences(text: string, pattern: string): number {
  return text.split(pattern).length - 1;
}

describe('init hook reconciliation', () => {
  const tempRoots: string[] = [];
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('creates package-safe hook payloads, shims, and gitignore entry in a git repo', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    mkdirSync(path.join(rootDir, '.git', 'hooks'), { recursive: true });

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });
    const preCommitTemplate = readFileSync(path.join(process.cwd(), 'scripts/hooks/templates/pre-commit'), 'utf8');
    const commitMsgTemplate = readFileSync(path.join(process.cwd(), 'scripts/hooks/templates/commit-msg'), 'utf8');
    const syncedPreCommit = readFileSync(path.join(rootDir, '.mycodemap', 'hooks', 'pre-commit'), 'utf8');
    const syncedCommitMsg = readFileSync(path.join(rootDir, '.mycodemap', 'hooks', 'commit-msg'), 'utf8');
    const shimPreCommit = readFileSync(path.join(rootDir, '.git', 'hooks', 'pre-commit'), 'utf8');
    const shimCommitMsg = readFileSync(path.join(rootDir, '.git', 'hooks', 'commit-msg'), 'utf8');
    const gitignoreText = readFileSync(path.join(rootDir, '.gitignore'), 'utf8');

    expect(syncedPreCommit).toBe(preCommitTemplate);
    expect(syncedCommitMsg).toBe(commitMsgTemplate);
    expect(shimPreCommit).toContain('.mycodemap/hooks/pre-commit');
    expect(shimCommitMsg).toContain('.mycodemap/hooks/commit-msg');
    expect(gitignoreText).toContain('.mycodemap/logs/');
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'hook-payload:pre-commit', status: 'installed' }),
      expect.objectContaining({ key: 'hook-shim:pre-commit', status: 'installed' }),
      expect.objectContaining({ key: 'gitignore-logs', status: 'installed' }),
    ]));
  });

  it('does not fail non-git projects and skips shim installation only', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

    expect(existsSync(path.join(rootDir, '.mycodemap', 'hooks', 'pre-commit'))).toBe(true);
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'hook-payload:pre-commit', status: 'installed' }),
      expect.objectContaining({ key: 'hook-shim:pre-commit', status: 'skipped' }),
      expect.objectContaining({ key: 'gitignore-logs', status: 'skipped' }),
    ]));
  });

  it('preserves existing user hook logic through a backup + shim strategy', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    mkdirSync(path.join(rootDir, '.git', 'hooks'), { recursive: true });

    const originalHook = '#!/bin/sh\necho user-pre-commit\n';
    writeFileSync(path.join(rootDir, '.git', 'hooks', 'pre-commit'), originalHook, 'utf8');

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });
    const preservedHookPath = path.join(rootDir, '.mycodemap', 'hooks', 'user-pre-commit.sh');
    const shimText = readFileSync(path.join(rootDir, '.git', 'hooks', 'pre-commit'), 'utf8');

    expect(readFileSync(preservedHookPath, 'utf8')).toBe(originalHook);
    expect(shimText).toContain('user-pre-commit.sh');
    expect(shimText).toContain('.mycodemap/hooks/pre-commit');
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'hook-shim:pre-commit', status: 'installed' }),
    ]));
  });

  it('keeps .gitignore idempotent and reports unchanged hook assets on rerun', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    mkdirSync(path.join(rootDir, '.git', 'hooks'), { recursive: true });

    await executeInitCommand({ yes: true, cwd: rootDir });
    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });
    const gitignoreText = readFileSync(path.join(rootDir, '.gitignore'), 'utf8');

    expect(countOccurrences(gitignoreText, '.mycodemap/logs/')).toBe(1);
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'hook-payload:pre-commit', status: 'already-synced' }),
      expect.objectContaining({ key: 'hook-shim:pre-commit', status: 'already-synced' }),
      expect.objectContaining({ key: 'gitignore-logs', status: 'already-synced' }),
    ]));
  });

  it('marks payloads as manual-action-needed when packaged templates are missing', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    mkdirSync(path.join(rootDir, '.git', 'hooks'), { recursive: true });

    const hookPlan = createHookPlan(rootDir, {
      templateRoot: path.join(rootDir, 'missing-templates'),
    });

    expect(hookPlan.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'hook-payload:pre-commit', status: 'manual-action-needed' }),
      expect.objectContaining({ key: 'hook-payload:commit-msg', status: 'manual-action-needed' }),
    ]));
  });
});
