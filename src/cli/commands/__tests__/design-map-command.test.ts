import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  designCommand,
  renderDesignMappingResult,
  runDesignMap,
} from '../design.js';

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../tests/fixtures/design-contracts',
);

describe('design map command', () => {
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

  it('returns machine readable mapping payload', async () => {
    const result = await runDesignMap(
      path.join(fixturesDir, 'mapping-basic.design.md'),
      { json: true },
    );

    expect(result.ok).toBe(true);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((candidate) => candidate.reasons.length > 0)).toBe(true);
    expect(result.summary.candidateCount).toBe(result.candidates.length);
    expect(
      result.candidates.every((candidate) =>
        Array.isArray(candidate.dependencies) &&
        Array.isArray(candidate.testImpact) &&
        Array.isArray(candidate.unknowns) &&
        typeof candidate.risk === 'string' &&
        typeof candidate.confidence?.score === 'number'),
    ).toBe(true);
  });

  it('renders human readable mapping output', async () => {
    const result = await runDesignMap(path.join(fixturesDir, 'mapping-basic.design.md'));
    const output = renderDesignMappingResult(result);

    expect(output).toContain('Candidates:');
    expect(output).toContain('Unknowns:');
    expect(output).toContain('Diagnostics:');
    expect(output).toContain('src/cli/commands/design.ts');
  });

  it('prints JSON payload for design map', async () => {
    await designCommand.parseAsync([
      'node',
      'design',
      'map',
      path.join(fixturesDir, 'mapping-basic.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(true);
    expect(payload.candidates.length).toBeGreaterThan(0);
    expect(payload.candidates.every((candidate: { reasons: unknown[] }) => candidate.reasons.length > 0)).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it('returns non-zero exit code for blocker diagnostics', async () => {
    await designCommand.parseAsync([
      'node',
      'design',
      'map',
      path.join(fixturesDir, 'high-risk.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(false);
    expect(payload.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'high-risk-scope' }),
      ]),
    );
    expect(process.exitCode).toBe(1);
  });

  it('exposes map in help output', () => {
    expect(designCommand.helpInformation()).toContain('map');
    expect(designCommand.helpInformation()).toContain('Design contract utilities');
  });
});
