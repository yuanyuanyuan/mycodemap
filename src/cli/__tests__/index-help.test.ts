import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../runtime-logger.js', () => ({
  setupRuntimeLogging: vi.fn(),
}));

vi.mock('../first-run-guide.js', () => ({
  runFirstRunGuide: vi.fn(),
}));

vi.mock('../paths.js', () => ({
  printMigrationWarning: vi.fn(),
}));

vi.mock('../platform-check.js', () => ({
  validatePlatform: vi.fn(() => ({
    supportLevel: 'full',
    warnings: [],
  })),
}));

describe('cli help surface', () => {
  const originalArgv = process.argv.slice();

  afterEach(() => {
    process.argv = originalArgv.slice();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('does not expose removed top-level commands in help output', async () => {
    process.argv = ['node', 'mycodemap', '--help'];

    let output = '';

    const captureWrite = vi.fn((chunk: string | Uint8Array) => {
      output += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
      return true;
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    vi.spyOn(process.stdout, 'write').mockImplementation(captureWrite as never);
    vi.spyOn(process.stderr, 'write').mockImplementation(captureWrite as never);

    await expect(import('../index.ts')).rejects.toThrow('process.exit:0');

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(output).toContain('generate');
    expect(output).toContain('design');
    expect(output).toContain('query');
    expect(output).toContain('deps');
    expect(output).toContain('impact');
    expect(output).toContain('complexity');
    expect(output).toContain('cycles');
    expect(output).toContain('analyze');
    expect(output).toContain('ci');
    expect(output).toContain('workflow');
    expect(output).toContain('export');
    expect(output).toContain('ship');
    expect(output).not.toContain('watch');
    expect(output).not.toContain('report');
    expect(output).not.toContain('logs');
    expect(output).not.toContain('server');
  });
});
