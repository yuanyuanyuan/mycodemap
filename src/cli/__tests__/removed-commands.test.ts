import { afterEach, describe, expect, it, vi } from 'vitest';

type RemovedCommandName = 'server' | 'watch' | 'report' | 'logs';

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

describe('removed top-level commands', () => {
  const originalArgv = process.argv.slice();

  afterEach(() => {
    process.argv = originalArgv.slice();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function invokeRemovedCommand(commandName: RemovedCommandName): Promise<string> {
    process.argv = ['node', 'mycodemap', commandName];

    let output = '';
    vi.spyOn(console, 'error').mockImplementation((message?: unknown) => {
      output += `${String(message ?? '')}\n`;
    });
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    await expect(import('../index.ts')).rejects.toThrow('process.exit:1');

    return output;
  }

  it('prints Server Layer guidance for server', async () => {
    const output = await invokeRemovedCommand('server');

    expect(output).toContain('removed from public CLI');
    expect(output).toContain('Server Layer');
  });

  it('prints generate guidance for watch', async () => {
    const output = await invokeRemovedCommand('watch');

    expect(output).toContain('removed from public CLI');
    expect(output).toContain('mycodemap generate');
  });

  it('prints AI_MAP guidance for report', async () => {
    const output = await invokeRemovedCommand('report');

    expect(output).toContain('removed from public CLI');
    expect(output).toContain('.mycodemap/AI_MAP.md');
    expect(output).toContain('mycodemap export <format>');
  });

  it('prints log directory guidance for logs', async () => {
    const output = await invokeRemovedCommand('logs');

    expect(output).toContain('removed from public CLI');
    expect(output).toContain('.mycodemap/logs/');
  });
});
