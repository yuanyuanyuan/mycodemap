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
    cyan: (text: string) => text,
    gray: (text: string) => text,
    white: createColorMock(),
  },
}));

import {
  isFirstRun,
  markFirstRunDone,
  runFirstRunGuide,
  showFirstRunGuide,
} from '../first-run-guide.js';

function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-first-run-'));
}

describe('first-run guide', () => {
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

  it('returns true only when there is no config, marker, or legacy output', () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    expect(isFirstRun(rootDir)).toBe(true);

    mkdirSync(path.join(rootDir, '.mycodemap'), { recursive: true });
    writeFileSync(path.join(rootDir, '.mycodemap', 'config.json'), '{"mode":"hybrid"}', 'utf8');

    expect(isFirstRun(rootDir)).toBe(false);
  });

  it('marks first run as done inside .mycodemap', () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    markFirstRunDone(rootDir);

    const markerPath = path.join(rootDir, '.mycodemap', '.first-run-done');
    expect(existsSync(markerPath)).toBe(true);
    expect(readFileSync(markerPath, 'utf8')).not.toHaveLength(0);
  });

  it('shows a concise init → generate → help guide without hook or rules setup', () => {
    showFirstRunGuide();

    const output = consoleLogSpy.mock.calls.flat().join('\n');
    expect(output).toContain('mycodemap init');
    expect(output).toContain('mycodemap generate');
    expect(output).toContain('mycodemap --help');
    expect(output).not.toContain('hooks');
    expect(output).not.toContain('rules');
  });

  it('runFirstRunGuide prints once and then stops after the marker exists', () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    expect(runFirstRunGuide(rootDir)).toBe(true);
    consoleLogSpy.mockClear();
    expect(runFirstRunGuide(rootDir)).toBe(false);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
