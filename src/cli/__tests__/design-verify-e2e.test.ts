import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  runDesignHandoff,
  runDesignMap,
  runDesignValidate,
} from '../commands/design.js';
import { buildDesignVerification } from '../design-verification-builder.js';

describe('design verify e2e', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('proves the full ready-path chain from validate to verify', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-verify-e2e-ready-'));
    tempRoots.push(outputRoot);
    const fixturePath = path.join(
      process.cwd(),
      'tests/fixtures/design-contracts/verify-ready.design.md',
    );

    const validateResult = await runDesignValidate(fixturePath, { json: true });
    const mapResult = await runDesignMap(fixturePath, { json: true });
    const handoffResult = await runDesignHandoff(fixturePath, { output: outputRoot });

    mkdirSync(handoffResult.artifacts.outputDir, { recursive: true });
    writeFileSync(handoffResult.artifacts.jsonPath, `${JSON.stringify(handoffResult, null, 2)}\n`, 'utf8');

    const verifyResult = await buildDesignVerification({
      filePath: fixturePath,
      outputDir: outputRoot,
      rootDir: process.cwd(),
    });

    expect(validateResult.ok).toBe(true);
    expect(mapResult.ok).toBe(true);
    expect(mapResult.candidates.length).toBeGreaterThan(0);
    expect(handoffResult.ok).toBe(true);
    expect(handoffResult.readyForExecution).toBe(true);
    expect(verifyResult.ok).toBe(true);
    expect(verifyResult.readyForExecution).toBe(true);
    expect(verifyResult.checklist.some((item) => item.status === 'satisfied')).toBe(true);
    expect(verifyResult.drift).toEqual([]);
  });

  it('keeps missing required design sections blocked through verify', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-verify-e2e-missing-'));
    tempRoots.push(outputRoot);
    const fixturePath = path.join(
      process.cwd(),
      'tests/fixtures/design-contracts/missing-acceptance.design.md',
    );

    const validateResult = await runDesignValidate(fixturePath, { json: true });
    const verifyResult = await buildDesignVerification({
      filePath: fixturePath,
      outputDir: outputRoot,
      rootDir: process.cwd(),
    });

    expect(validateResult.ok).toBe(false);
    expect(verifyResult.ok).toBe(false);
    expect(verifyResult.readyForExecution).toBe(false);
    expect(verifyResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing-section', blocker: true }),
      ]),
    );
  });

  it('does not wash away upstream scope blockers during verify', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-verify-e2e-scope-'));
    tempRoots.push(outputRoot);
    const fixturePath = path.join(
      process.cwd(),
      'tests/fixtures/design-contracts/no-match.design.md',
    );

    const mapResult = await runDesignMap(fixturePath, { json: true });
    const handoffResult = await runDesignHandoff(fixturePath, { output: outputRoot });
    const verifyResult = await buildDesignVerification({
      filePath: fixturePath,
      outputDir: outputRoot,
      rootDir: process.cwd(),
    });

    expect(mapResult.ok).toBe(false);
    expect(mapResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'no-candidates', blocker: true }),
      ]),
    );
    expect(handoffResult.ok).toBe(false);
    expect(verifyResult.ok).toBe(false);
    expect(verifyResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'no-candidates' }),
        expect.objectContaining({ code: 'blocked-mapping' }),
      ]),
    );
  });
});
