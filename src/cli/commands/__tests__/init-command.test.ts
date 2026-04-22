import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
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

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-init-command-'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

describe('initCommand', () => {
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

  it('creates canonical config and receipt on a new project with --yes', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

    expect(existsSync(path.join(rootDir, '.mycodemap', 'config.json'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.mycodemap', 'status', 'init-last.json'))).toBe(true);
    expect(receipt.mode).toBe('apply');
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'workspace', status: 'installed' }),
      expect.objectContaining({ key: 'canonical-config', status: 'installed' }),
      expect.objectContaining({ key: 'status-ledger', status: 'installed' }),
    ]));
  });

  it('copies root mycodemap.config.json into canonical config and preserves the old file', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    const rootConfigPath = path.join(rootDir, 'mycodemap.config.json');
    const rootConfigText = JSON.stringify({
      mode: 'fast',
      output: '.mycodemap',
      storage: {
        type: 'filesystem',
        outputPath: '.mycodemap/storage',
      },
    }, null, 2);
    writeFileSync(rootConfigPath, rootConfigText, 'utf8');

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });
    const canonicalConfigPath = path.join(rootDir, '.mycodemap', 'config.json');

    expect(readFileSync(canonicalConfigPath, 'utf8')).toBe(rootConfigText);
    expect(existsSync(rootConfigPath)).toBe(true);
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'canonical-config', status: 'migrated' }),
      expect.objectContaining({
        key: 'legacy-root-config:mycodemap.config.json',
        status: 'manual-action-needed',
      }),
    ]));
    expect(receipt.nextSteps.join('\n')).toContain('删除 `mycodemap.config.json`');
  });

  it('reports legacy .codemap drift instead of ignoring it', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    mkdirSync(path.join(rootDir, '.codemap'), { recursive: true });

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'legacy-output-dir',
        status: 'manual-action-needed',
      }),
    ]));
  });

  it('treats rerun as idempotent for workspace and canonical config assets', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    await executeInitCommand({ yes: true, cwd: rootDir });
    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });
    const savedReceipt = readJson<{ assets: Array<{ key: string; status: string }> }>(
      path.join(rootDir, '.mycodemap', 'status', 'init-last.json')
    );

    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'workspace', status: 'already-synced' }),
      expect.objectContaining({ key: 'canonical-config', status: 'already-synced' }),
      expect.objectContaining({ key: 'status-ledger', status: 'already-synced' }),
    ]));
    expect(savedReceipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'workspace', status: 'already-synced' }),
      expect.objectContaining({ key: 'canonical-config', status: 'already-synced' }),
    ]));
  });

  it('shows a preview and does not write files when interactive preview is requested', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    const receipt = await executeInitCommand({ interactive: true, cwd: rootDir });

    expect(receipt.mode).toBe('preview');
    expect(existsSync(path.join(rootDir, '.mycodemap', 'config.json'))).toBe(false);
    expect(existsSync(path.join(rootDir, '.mycodemap', 'status', 'init-last.json'))).toBe(false);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('CodeMap init 预览'));
  });
});
