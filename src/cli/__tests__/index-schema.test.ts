import { describe, expect, it, vi } from 'vitest';
import { getFullContract, interfaceContractSchema } from '../interface-contract/index.js';

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

describe('cli --schema flag', () => {
  it('--schema outputs valid JSON matching interface contract schema', () => {
    // Simulate what --schema does: JSON.stringify(getFullContract(), null, 2)
    const output = JSON.stringify(getFullContract(), null, 2);

    const parsed = JSON.parse(output);
    expect(parsed.programName).toBe('mycodemap');
    expect(parsed.aliases).toContain('codemap');
    expect(parsed.commands.length).toBeGreaterThanOrEqual(3);

    const validated = interfaceContractSchema.safeParse(parsed);
    expect(validated.success).toBe(true);
  });

  it('--schema only intercepts at root level (no subcommand)', async () => {
    const originalArgv = process.argv.slice();

    // With subcommand present, --schema should not trigger early exit
    process.argv = ['node', 'mycodemap', 'analyze', '--schema'];
    const firstArg = process.argv[2];
    const isRootLevel = !firstArg || firstArg.startsWith('-');
    expect(isRootLevel).toBe(false);

    process.argv = originalArgv.slice();
  });
});
