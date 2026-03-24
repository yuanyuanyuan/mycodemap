import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execFileSyncMock = vi.fn();

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFileSync: execFileSyncMock,
  };
});

const ciModule = await import('../ci.js');

describe('ci docs sync helpers', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    execFileSyncMock.mockReset();
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('resolves repository script path from project root', () => {
    const result = ciModule.resolveDocsGuardrailScriptPath('/tmp/codemap');
    expect(result).toBe(path.join('/tmp/codemap', 'scripts', 'validate-docs.js'));
  });

  it('resolves analyze docs sync script path from project root', () => {
    const result = ciModule.resolveAnalyzeDocsSyncScriptPath('/tmp/codemap');
    expect(result).toBe(path.join('/tmp/codemap', 'scripts', 'sync-analyze-docs.js'));
  });

  it('runs the documentation guardrail script with node', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-ci-docs-'));
    tempRoots.push(root);
    mkdirSync(path.join(root, 'scripts'), { recursive: true });
    writeFileSync(path.join(root, 'scripts', 'validate-docs.js'), 'console.log("ok");\n');

    ciModule.runDocsGuardrailCheck({ projectRoot: root });

    expect(execFileSyncMock).toHaveBeenCalledWith(
      process.execPath,
      [path.join(root, 'scripts', 'validate-docs.js')],
      expect.objectContaining({
        cwd: root,
        stdio: 'inherit',
      })
    );
  });

  it('throws when the guardrail script is missing', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-ci-docs-missing-'));
    tempRoots.push(root);

    expect(() => ciModule.runDocsGuardrailCheck({ projectRoot: root })).toThrow(/Documentation guardrail script not found/);
  });

  it('runs the analyze docs sync script in check mode', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-ci-sync-'));
    tempRoots.push(root);
    mkdirSync(path.join(root, 'scripts'), { recursive: true });
    writeFileSync(path.join(root, 'scripts', 'sync-analyze-docs.js'), 'console.log("ok");\n');

    ciModule.runAnalyzeDocsSyncCheck({ projectRoot: root });

    expect(execFileSyncMock).toHaveBeenCalledWith(
      process.execPath,
      [path.join(root, 'scripts', 'sync-analyze-docs.js'), '--check'],
      expect.objectContaining({
        cwd: root,
        stdio: 'inherit',
      })
    );
  });

  it('throws when the analyze docs sync script is missing', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-ci-sync-missing-'));
    tempRoots.push(root);

    expect(() => ciModule.runAnalyzeDocsSyncCheck({ projectRoot: root })).toThrow(/Analyze docs sync script not found/);
  });
});
