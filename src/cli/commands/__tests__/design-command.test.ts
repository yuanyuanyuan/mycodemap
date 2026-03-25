import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  designCommand,
  renderDesignValidationResult,
  runDesignValidate,
} from '../design.js';

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../tests/fixtures/design-contracts',
);

describe('design command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  it('renders human readable validation output', async () => {
    const result = await runDesignValidate(
      path.join(fixturesDir, 'valid-basic.design.md'),
    );

    const output = renderDesignValidationResult(result);
    expect(output).toContain('Design contract valid');
    expect(output).toContain('Sections: 5');
  });

  it('returns machine readable JSON-friendly payload', async () => {
    const result = await runDesignValidate(
      path.join(fixturesDir, 'valid-basic.design.md'),
      { json: true },
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        exists: true,
        missingRequiredSections: [],
      }),
    );
  });

  it('prints JSON and sets failing exitCode for invalid contracts', async () => {
    await designCommand.parseAsync([
      'node',
      'design',
      'validate',
      path.join(fixturesDir, 'missing-acceptance.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(false);
    expect(payload.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing-section', section: 'acceptanceCriteria' }),
      ]),
    );
    expect(process.exitCode).toBe(1);
  });

  it('exposes validate in help output', () => {
    expect(designCommand.helpInformation()).toContain('validate');
    expect(designCommand.helpInformation()).toContain('Design contract utilities');
  });
});
