import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CLI_PATH = path.resolve(__dirname, '../../dist/cli/index.js');

interface ReceiptAsset {
  key: string;
  status: string;
}

interface InitReceiptJson {
  profileName?: string;
  assets: ReceiptAsset[];
}

function runCli(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-init-e2e-'));
}

function readReceipt(rootDir: string): InitReceiptJson {
  return JSON.parse(
    readFileSync(path.join(rootDir, '.mycodemap', 'status', 'init-last.json'), 'utf8')
  ) as InitReceiptJson;
}

function hasConflict(receipt: InitReceiptJson): boolean {
  return receipt.assets.some((asset) => asset.status === 'conflict');
}

describe('init onboarding verification e2e', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('converges an empty directory through the built CLI when an explicit profile is provided', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    const result = runCli(['init', '--yes', '--profile', 'nodejs'], rootDir);

    expect(result.exitCode).toBe(0);
    expect(existsSync(path.join(rootDir, '.mycodemap', 'config.json'))).toBe(true);

    const receipt = readReceipt(rootDir);
    expect(receipt.profileName).toBe('nodejs');
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'workspace', status: 'installed' }),
      expect.objectContaining({ key: 'canonical-config', status: 'installed' }),
      expect.objectContaining({ key: 'bootstrap-profile', status: 'installed' }),
    ]));
    expect(hasConflict(receipt)).toBe(false);
  });

  it('keeps reruns already-synced on a Node.js project', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{"name":"demo"}', 'utf8');

    const firstRun = runCli(['init', '--yes'], rootDir);
    expect(firstRun.exitCode).toBe(0);

    const secondRun = runCli(['init', '--yes'], rootDir);
    expect(secondRun.exitCode).toBe(0);

    const receipt = readReceipt(rootDir);
    expect(receipt.profileName).toBe('nodejs');
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'workspace', status: 'already-synced' }),
      expect.objectContaining({ key: 'canonical-config', status: 'already-synced' }),
      expect.objectContaining({ key: 'status-ledger', status: 'already-synced' }),
      expect.objectContaining({ key: 'assistant:claude-context', status: 'already-synced' }),
      expect.objectContaining({ key: 'assistant:agents-context', status: 'already-synced' }),
      expect.objectContaining({ key: 'env-contract', status: 'already-synced' }),
      expect.objectContaining({ key: 'bootstrap-profile', status: 'already-synced' }),
    ]));
    expect(hasConflict(receipt)).toBe(false);
  });

  it('migrates a legacy root config and preserves the original file', () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{"name":"demo"}', 'utf8');

    const rootConfigText = JSON.stringify(
      {
        mode: 'fast',
        output: '.mycodemap',
        storage: {
          type: 'filesystem',
          outputPath: '.mycodemap/storage',
        },
      },
      null,
      2
    );
    const legacyConfigPath = path.join(rootDir, 'mycodemap.config.json');
    writeFileSync(legacyConfigPath, rootConfigText, 'utf8');

    const result = runCli(['init', '--yes'], rootDir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(path.join(rootDir, '.mycodemap', 'config.json'), 'utf8')).toBe(rootConfigText);
    expect(readFileSync(legacyConfigPath, 'utf8')).toBe(rootConfigText);

    const receipt = readReceipt(rootDir);
    expect(receipt.profileName).toBe('nodejs');
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'canonical-config', status: 'migrated' }),
      expect.objectContaining({
        key: 'legacy-root-config:mycodemap.config.json',
        status: 'manual-action-needed',
      }),
    ]));
    expect(hasConflict(receipt)).toBe(false);
  });
});
