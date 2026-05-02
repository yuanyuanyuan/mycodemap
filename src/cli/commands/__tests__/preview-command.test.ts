import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Hoisted mocks so vi.mock can reference them (vitest hoisting requirement)
const mocks = vi.hoisted(() => ({
  generateCommand: vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined),
}));

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

vi.mock('../generate.js', () => ({
  generateCommand: mocks.generateCommand,
}));

import { previewCommand } from '../preview.js';

function createNodeProject(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-preview-node-'));
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'test-node', dependencies: { express: '^4.18' } }, null, 2),
    'utf8',
  );
  // Create src/ directory with a few .ts files so file discovery finds something
  mkdirSync(path.join(root, 'src'), { recursive: true });
  writeFileSync(path.join(root, 'src', 'index.ts'), 'export function main() { return 1; }\n', 'utf8');
  writeFileSync(path.join(root, 'src', 'utils.ts'), 'export function add(a: number, b: number) { return a + b; }\n', 'utf8');
  return root;
}

/**
 * Run the preview command via Commander's parseAsync.
 * Mocks process.cwd() to return the target directory (vitest workers don't support process.chdir).
 */
async function runPreview(
  cwd: string,
  options: {
    save?: boolean;
    json?: boolean;
    human?: boolean;
    profile?: string;
  } = {},
): Promise<string> {
  const outputChunks: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    outputChunks.push(String(chunk));
    return true;
  });
  const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd);

  try {
    const argv = ['node', 'preview'];
    if (options.save) argv.push('--save');
    if (options.json) argv.push('--json');
    if (options.human) argv.push('--human');
    if (options.profile) argv.push('--profile', options.profile);
    await previewCommand.parseAsync(argv);
    return outputChunks.join('');
  } finally {
    cwdSpy.mockRestore();
    stdoutSpy.mockRestore();
  }
}

describe('preview command', () => {
  const tempRoots: string[] = [];

  beforeEach(() => {
    mocks.generateCommand.mockClear();
  });

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('runs without config file (ZCP-01)', async () => {
    const rootDir = createNodeProject();
    tempRoots.push(rootDir);

    const output = await runPreview(rootDir, { json: true });

    const data = JSON.parse(output);
    expect(data.projectType).toBe('nodejs');
    expect(data.profile).toBe('nodejs');
    expect(data.files.total).toBeGreaterThan(0);
    expect(data.modules).toBeDefined();
    expect(data.dependencies).toBeDefined();
    expect(data.complexity).toBeDefined();
    expect(data.hint).toBeDefined();

    // Verify non-destructive: no config created
    expect(existsSync(path.join(rootDir, '.mycodemap', 'config.json'))).toBe(false);
  });

  it('auto-detects project type (ZCP-02)', async () => {
    // Node.js project
    const nodeRoot = createNodeProject();
    tempRoots.push(nodeRoot);
    const nodeOutput = await runPreview(nodeRoot, { json: true });
    const nodeData = JSON.parse(nodeOutput);
    expect(nodeData.projectType).toBe('nodejs');

    // Go project
    const goRoot = mkdtempSync(path.join(tmpdir(), 'codemap-preview-go-'));
    tempRoots.push(goRoot);
    writeFileSync(
      path.join(goRoot, 'go.mod'),
      'module example.com/test\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.0\n)\n',
      'utf8',
    );
    const goOutput = await runPreview(goRoot, { json: true });
    const goData = JSON.parse(goOutput);
    expect(goData.projectType).toBe('go');

    // No markers — falls back to generic (D-05)
    const emptyRoot = mkdtempSync(path.join(tmpdir(), 'codemap-preview-empty-'));
    tempRoots.push(emptyRoot);
    const emptyOutput = await runPreview(emptyRoot, { json: true });
    const emptyData = JSON.parse(emptyOutput);
    expect(emptyData.projectType).toBe('unknown');
    expect(emptyData.profile).toBe('generic');
  });

  it('uses existing config when present (D-06)', async () => {
    const rootDir = createNodeProject();
    tempRoots.push(rootDir);
    mkdirSync(path.join(rootDir, '.mycodemap'), { recursive: true });
    writeFileSync(
      path.join(rootDir, '.mycodemap', 'config.json'),
      JSON.stringify({ mode: 'smart', include: ['src/**/*.ts'] }, null, 2),
      'utf8',
    );

    const output = await runPreview(rootDir, { json: true });
    const data = JSON.parse(output);
    expect(data.profile).toBe('existing-config');
  });

  it('outputs four sections (ZCP-03)', async () => {
    const rootDir = createNodeProject();
    tempRoots.push(rootDir);

    const output = await runPreview(rootDir, { json: true });
    const data = JSON.parse(output);

    expect(data.files).toBeDefined();
    expect(data.modules).toBeDefined();
    expect(data.dependencies).toBeDefined();
    expect(data.complexity).toBeDefined();

    expect(typeof data.files.total).toBe('number');
    expect(data.files.total).toBeGreaterThan(0);
    expect(typeof data.dependencies.count).toBe('number');
    expect(Array.isArray(data.complexity.hotspots)).toBe(true);
    expect(data.complexity.hotspots.length).toBeLessThanOrEqual(5);
  });

  it('shows --save hint text (ZCP-04 / D-10)', async () => {
    const rootDir = createNodeProject();
    tempRoots.push(rootDir);

    const output = await runPreview(rootDir, { json: true });
    const data = JSON.parse(output);
    expect(data.hint).toContain('--save');
  });

  it('--save writes config and triggers generate (D-03, D-12)', async () => {
    const rootDir = createNodeProject();
    tempRoots.push(rootDir);

    const output = await runPreview(rootDir, { save: true, json: true });

    expect(existsSync(path.join(rootDir, '.mycodemap', 'config.json'))).toBe(true);
    expect(mocks.generateCommand).toHaveBeenCalledTimes(1);
    expect(output).toContain('Config saved');
    expect(output).toContain('Running codemap generate');
  });

  it('--save with existing config runs generate without overwriting (D-06)', async () => {
    const rootDir = createNodeProject();
    tempRoots.push(rootDir);
    mkdirSync(path.join(rootDir, '.mycodemap'), { recursive: true });
    const existingConfig = JSON.stringify({ mode: 'smart', include: ['src/**/*.ts'] }, null, 2);
    writeFileSync(path.join(rootDir, '.mycodemap', 'config.json'), existingConfig, 'utf8');

    const output = await runPreview(rootDir, { save: true, json: true });

    const configAfter = readFileSync(path.join(rootDir, '.mycodemap', 'config.json'), 'utf8');
    expect(configAfter).toBe(existingConfig);
    expect(mocks.generateCommand).toHaveBeenCalledTimes(1);
    expect(output).toContain('Config already exists');
  });

  it('--profile flag bypasses detection (D-04)', async () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'codemap-preview-profile-'));
    tempRoots.push(rootDir);

    const output = await runPreview(rootDir, { profile: 'python', json: true });
    const jsonLine = output.split('\n').find(l => l.trim().startsWith('{')) ?? output;
    const data = JSON.parse(jsonLine);
    expect(data.profile).toBe('python');
  });

  it('JSON mode outputs valid JSON (D-07)', async () => {
    const rootDir = createNodeProject();
    tempRoots.push(rootDir);

    const output = await runPreview(rootDir, { json: true });
    const jsonLine = output.split('\n').find(l => l.trim().startsWith('{')) ?? output;
    const data = JSON.parse(jsonLine);
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  it('does not have a --discard flag (D-11)', () => {
    const options = previewCommand.options;
    const discardOption = options.find(
      (opt: { long?: string; flags?: string }) =>
        opt.long === 'discard' || (opt.flags && opt.flags.includes('discard')),
    );
    expect(discardOption).toBeUndefined();
  });
});
