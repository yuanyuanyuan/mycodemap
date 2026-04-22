import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
import { buildRulesSnippet } from '../../init/rule-templates.js';

function createTempProject(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-init-rules-'));
}

describe('init rules reconciliation', () => {
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

  it('creates a categorized generic rules bundle under .mycodemap/rules', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });
    const expectedFiles = [
      path.join(rootDir, '.mycodemap', 'rules', 'commit', 'default.md'),
      path.join(rootDir, '.mycodemap', 'rules', 'test', 'default.md'),
      path.join(rootDir, '.mycodemap', 'rules', 'lint', 'default.md'),
      path.join(rootDir, '.mycodemap', 'rules', 'docs', 'default.md'),
      path.join(rootDir, '.mycodemap', 'rules', 'validation', 'default.md'),
    ];

    for (const filePath of expectedFiles) {
      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, 'utf8')).not.toContain('.planning/');
    }

    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'rules:commit', status: 'installed' }),
      expect.objectContaining({ key: 'rules:test', status: 'installed' }),
      expect.objectContaining({ key: 'ai-context-rules-snippet', status: 'manual-action-needed' }),
    ]));
  });

  it('reports rules as already-synced on rerun when unchanged', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    await executeInitCommand({ yes: true, cwd: rootDir });
    const receipt = await executeInitCommand({ yes: true, cwd: rootDir });

    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'rules:commit', status: 'already-synced' }),
      expect.objectContaining({ key: 'rules:validation', status: 'already-synced' }),
    ]));
  });

  it('shows drift preview and does not overwrite user-modified rules files', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    await executeInitCommand({ yes: true, cwd: rootDir });
    const lintRulePath = path.join(rootDir, '.mycodemap', 'rules', 'lint', 'default.md');
    writeFileSync(lintRulePath, '# Custom lint rule\n\nKeep my local tweaks.\n', 'utf8');

    const receipt = await executeInitCommand({ cwd: rootDir });

    expect(readFileSync(lintRulePath, 'utf8')).toContain('Keep my local tweaks.');
    expect(receipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'rules:lint', status: 'conflict' }),
    ]));
    const lintAsset = receipt.assets.find((asset) => asset.key === 'rules:lint');
    expect(lintAsset?.details.join('\n')).toContain('当前:');
    expect(lintAsset?.details.join('\n')).toContain('目标:');
  });

  it('emits a manual AI context snippet without modifying CLAUDE.md, then detects it on rerun', async () => {
    const rootDir = createTempProject();
    tempRoots.push(rootDir);

    const claudePath = path.join(rootDir, 'CLAUDE.md');
    writeFileSync(claudePath, '# Team Context\n\nExisting instructions.\n', 'utf8');

    const firstReceipt = await executeInitCommand({ yes: true, cwd: rootDir });
    const snippetAsset = firstReceipt.assets.find((asset) => asset.key === 'ai-context-rules-snippet');

    expect(readFileSync(claudePath, 'utf8')).toBe('# Team Context\n\nExisting instructions.\n');
    expect(snippetAsset?.status).toBe('manual-action-needed');
    expect(snippetAsset?.details.join('\n')).toContain('.mycodemap/rules/');

    writeFileSync(claudePath, `# Team Context\n\nExisting instructions.\n\n${buildRulesSnippet()}\n`, 'utf8');
    const secondReceipt = await executeInitCommand({ yes: true, cwd: rootDir });

    expect(secondReceipt.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'ai-context-rules-snippet', status: 'already-synced' }),
    ]));
  });
});
