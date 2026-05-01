import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
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

// Hoisted holder for the prompt mock so vi.mock can wire to it.
const detectMocks = vi.hoisted(() => ({
  promptForProfileSelection: vi.fn<(...args: unknown[]) => Promise<string>>(),
}));

vi.mock('../../init/detect.js', async () => {
  const actual = await vi.importActual<typeof import('../../init/detect.js')>(
    '../../init/detect.js'
  );
  return {
    ...actual,
    promptForProfileSelection: detectMocks.promptForProfileSelection,
  };
});

import { executeInitCommand } from '../init.js';

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-init-profile-'));
}

interface AssetLike {
  key: string;
  status: string;
}

function findProfileAsset(assets: AssetLike[]): AssetLike | undefined {
  return assets.find((a) => a.key === 'bootstrap-profile');
}

describe('init command — bootstrap profile integration', () => {
  const tempRoots: string[] = [];
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let originalStdoutDescriptor: PropertyDescriptor | undefined;
  let originalStdinDescriptor: PropertyDescriptor | undefined;

  function setStdoutTTY(value: boolean): void {
    if (originalStdoutDescriptor === undefined) {
      originalStdoutDescriptor = Object.getOwnPropertyDescriptor(
        process.stdout,
        'isTTY'
      );
    }
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      get: () => value,
    });
  }

  function setStdinTTY(value: boolean): void {
    if (originalStdinDescriptor === undefined) {
      originalStdinDescriptor = Object.getOwnPropertyDescriptor(
        process.stdin,
        'isTTY'
      );
    }
    Object.defineProperty(process.stdin, 'isTTY', {
      configurable: true,
      get: () => value,
    });
  }

  function restoreTTY(): void {
    if (originalStdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', originalStdoutDescriptor);
      originalStdoutDescriptor = undefined;
    } else {
      // No prior descriptor → ensure no leftover override remains.
      try {
        delete (process.stdout as unknown as { isTTY?: unknown }).isTTY;
      } catch {
        /* ignore */
      }
    }
    if (originalStdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', originalStdinDescriptor);
      originalStdinDescriptor = undefined;
    } else {
      try {
        delete (process.stdin as unknown as { isTTY?: unknown }).isTTY;
      } catch {
        /* ignore */
      }
    }
  }

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    detectMocks.promptForProfileSelection.mockReset();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    restoreTTY();
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('applies nodejs profile when package.json exists and --yes is used', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{}', 'utf8');

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

    const profileAsset = findProfileAsset(receipt.assets as AssetLike[]);
    expect(profileAsset).toBeDefined();
    expect(profileAsset?.status).toBe('installed');

    const canonicalPath = path.join(rootDir, '.mycodemap', 'config.json');
    expect(existsSync(canonicalPath)).toBe(true);
    const text = readFileSync(canonicalPath, 'utf8');
    expect(text).toContain('src/**/*.{ts,tsx,js,jsx,mjs,cjs}');
  });

  it('shows profile as skipped in preview mode', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{}', 'utf8');

    const receipt = await executeInitCommand({ cwd: rootDir });

    const profileAsset = findProfileAsset(receipt.assets as AssetLike[]);
    expect(profileAsset).toBeDefined();
    expect(profileAsset?.status).toBe('skipped');

    const canonicalPath = path.join(rootDir, '.mycodemap', 'config.json');
    expect(existsSync(canonicalPath)).toBe(false);
  });

  it('skips profile when .mycodemap/config.json already exists', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{}', 'utf8');
    mkdirSync(path.join(rootDir, '.mycodemap'), { recursive: true });
    writeFileSync(
      path.join(rootDir, '.mycodemap', 'config.json'),
      JSON.stringify({ mode: 'hybrid' }, null, 2),
      'utf8'
    );

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

    // [Rule-3 deviation] When canonical config already exists, init.ts'
    // resolveProfile short-circuits and returns profile:null *before*
    // loading any profile, so profile-plan emits 'skipped' (the null-profile
    // branch), not 'already-synced' (which would require a non-null profile
    // plus existing config). User-visible behavior — preserve existing
    // config, do not overwrite — matches the plan's intent (D-16).
    const profileAsset = findProfileAsset(receipt.assets as AssetLike[]);
    expect(profileAsset).toBeDefined();
    expect(profileAsset?.status).toBe('skipped');

    // Existing config must NOT be overwritten.
    const canonicalPath = path.join(rootDir, '.mycodemap', 'config.json');
    const text = readFileSync(canonicalPath, 'utf8');
    expect(text).toContain('"mode": "hybrid"');
    expect(text).not.toContain('src/**/*.{ts,tsx');
  });

  it('bypasses detection with --profile python', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    // No marker files at all — --profile must bypass detection (D-13).

    const receipt = await executeInitCommand({
      yes: true,
      profile: 'python',
      cwd: rootDir,
    });

    const profileAsset = findProfileAsset(receipt.assets as AssetLike[]);
    expect(profileAsset).toBeDefined();
    expect(profileAsset?.status).toBe('installed');

    const canonicalPath = path.join(rootDir, '.mycodemap', 'config.json');
    expect(existsSync(canonicalPath)).toBe(true);
    const text = readFileSync(canonicalPath, 'utf8');
    // The python profile's parser.include glob is merged into the canonical
    // config's `include` field. (`parser.extensions` is not currently merged
    // — only include + ignore — see profile-plan.ts buildMergedConfigText.)
    expect(text).toContain('src/**/*.py');
  });

  it('throws when no markers and no --profile in non-TTY', async () => {
    setStdoutTTY(false);
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    await expect(executeInitCommand({ cwd: rootDir })).rejects.toThrow(/--profile/);
  });

  it('throws when multiple markers in non-TTY', async () => {
    setStdoutTTY(false);
    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{}', 'utf8');
    writeFileSync(path.join(rootDir, 'Cargo.toml'), '', 'utf8');

    await expect(executeInitCommand({ cwd: rootDir })).rejects.toThrow(
      /package\.json.*Cargo\.toml.*--profile|Cargo\.toml.*package\.json.*--profile/
    );
  });

  it('prompts for selection when multiple markers in TTY', async () => {
    setStdoutTTY(true);
    setStdinTTY(true);
    detectMocks.promptForProfileSelection.mockResolvedValue('nodejs');

    const rootDir = createTempProject();
    tempRoots.push(rootDir);
    writeFileSync(path.join(rootDir, 'package.json'), '{}', 'utf8');
    writeFileSync(path.join(rootDir, 'Cargo.toml'), '', 'utf8');

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

    expect(detectMocks.promptForProfileSelection).toHaveBeenCalledTimes(1);
    const profileAsset = findProfileAsset(receipt.assets as AssetLike[]);
    expect(profileAsset?.status).toBe('installed');
  });

  it('throws clear error for empty directory without markers', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    await expect(executeInitCommand({ cwd: rootDir })).rejects.toThrow(
      /未检测到项目类型标记[\s\S]*--profile/
    );
  });
});
