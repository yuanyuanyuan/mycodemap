import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCheckCommand } from '../check.js';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../',
);
const designFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'design-contracts');
const contractFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'contract-check');

function createSqliteConfiguredFixtureRoot(): {
  root: string;
  designFixturesPath: string;
  contractFixturesPath: string;
} {
  const tempParentDir = path.join(repoRoot, '.tmp');
  mkdirSync(tempParentDir, { recursive: true });
  const root = mkdtempSync(path.join(tempParentDir, 'codemap-check-diff-aware-'));
  const copiedDesignFixturesPath = path.join(root, 'tests', 'fixtures', 'design-contracts');
  const copiedContractFixturesPath = path.join(root, 'tests', 'fixtures', 'contract-check');

  cpSync(designFixturesDir, copiedDesignFixturesPath, { recursive: true });
  cpSync(contractFixturesDir, copiedContractFixturesPath, { recursive: true });
  for (const projectName of ['invalid-project', 'barrel-project']) {
    writeFileSync(
      path.join(copiedContractFixturesPath, projectName, 'mycodemap.config.json'),
      JSON.stringify({
        storage: {
          type: 'sqlite',
          databasePath: '.codemap/governance.sqlite',
        },
      }, null, 2),
    );
  }

  return {
    root,
    designFixturesPath: copiedDesignFixturesPath,
    contractFixturesPath: copiedContractFixturesPath,
  };
}

describe('check command diff-aware mode', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  const originalExitCode = process.exitCode;
  let checkCommand = createCheckCommand();
  let fixtureRoot: ReturnType<typeof createSqliteConfiguredFixtureRoot> | undefined;

  beforeEach(() => {
    fixtureRoot = createSqliteConfiguredFixtureRoot();
    checkCommand = createCheckCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.exitCode = originalExitCode;
    if (fixtureRoot) {
      rmSync(fixtureRoot.root, { recursive: true, force: true });
      fixtureRoot = undefined;
    }
  });

  it('uses explicit changed-files as diff input', async () => {
    expect(fixtureRoot).toBeDefined();
    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(fixtureRoot!.designFixturesPath, 'valid-frontmatter.design.md'),
      '--against',
      path.join(fixtureRoot!.contractFixturesPath, 'invalid-project'),
      '--changed-files',
      path.join(fixtureRoot!.contractFixturesPath, 'invalid-project', 'src', 'core', 'bad.ts'),
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.scan_mode).toBe('diff');
    expect(payload.changed_files).toEqual(['src/core/bad.ts']);
    expect(payload.history).toEqual(expect.objectContaining({
      status: expect.any(String),
    }));
    expect(payload.violations.map((violation: { rule_type: string }) => violation.rule_type)).toEqual([
      'layer_direction',
    ]);
    expect(process.exitCode).toBe(1);
  });

  it('falls back to full scan when base cannot be resolved', async () => {
    expect(fixtureRoot).toBeDefined();
    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(fixtureRoot!.designFixturesPath, 'valid-frontmatter.design.md'),
      '--against',
      path.join(fixtureRoot!.contractFixturesPath, 'invalid-project'),
      '--base',
      'not-a-real-base-ref',
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.scan_mode).toBe('full');
    expect(payload.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'diff-scope-fallback',
      }),
    ]));
    expect(payload.history).toEqual(expect.objectContaining({
      status: expect.any(String),
    }));
    expect(payload.summary.total_violations).toBe(3);
    expect(process.exitCode).toBe(1);
  });

  it('barrel changed-files expand to downstream consumers', async () => {
    expect(fixtureRoot).toBeDefined();
    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(fixtureRoot!.designFixturesPath, 'contract-barrel.design.md'),
      '--against',
      path.join(fixtureRoot!.contractFixturesPath, 'barrel-project'),
      '--changed-files',
      path.join(fixtureRoot!.contractFixturesPath, 'barrel-project', 'src', 'domain', 'index.ts'),
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.scan_mode).toBe('diff');
    expect(payload.changed_files).toEqual(['src/domain/index.ts']);
    expect(payload.scanned_files).toEqual(
      expect.arrayContaining(['src/app/use-domain.ts', 'src/domain/index.ts']),
    );
    expect(payload.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'diff-scope-expanded',
      }),
    ]));
    expect(payload.history).toEqual(expect.objectContaining({
      status: expect.any(String),
    }));
    expect(payload.violations).toEqual([
      expect.objectContaining({
        rule_type: 'layer_direction',
        severity: 'error',
      }),
    ]);
    expect(process.exitCode).toBe(1);
  });

  it('keeps GitHub annotation severity aligned with diff-aware truth', async () => {
    expect(fixtureRoot).toBeDefined();

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(fixtureRoot!.designFixturesPath, 'valid-frontmatter.design.md'),
      '--against',
      path.join(fixtureRoot!.contractFixturesPath, 'invalid-project'),
      '--changed-files',
      path.join(fixtureRoot!.contractFixturesPath, 'invalid-project', 'src', 'core', 'bad.ts'),
    ]);

    const fullPayload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(fullPayload.violations[0]?.severity).toBe('error');

    consoleLogSpy.mockClear();
    process.exitCode = undefined;
    checkCommand = createCheckCommand();

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(fixtureRoot!.designFixturesPath, 'valid-frontmatter.design.md'),
      '--against',
      path.join(fixtureRoot!.contractFixturesPath, 'invalid-project'),
      '--changed-files',
      path.join(fixtureRoot!.contractFixturesPath, 'invalid-project', 'src', 'core', 'bad.ts'),
      '--annotation-format',
      'github',
    ]);

    const annotationOutput = String(consoleLogSpy.mock.calls[0]?.[0]);
    expect(annotationOutput).toContain('::error');
    expect(annotationOutput).toContain('file=src/core/bad.ts');
    expect(annotationOutput).toContain('line=1');
    expect(annotationOutput).toContain('title=layer_direction%3A core 不可依赖 cli');
    expect(process.exitCode).toBe(1);
  });

  it('surfaces hard-gate window warnings in command output when changed files exceed 10', async () => {
    expect(fixtureRoot).toBeDefined();

    const projectRoot = path.join(fixtureRoot!.root, 'window-project');
    mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
    writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify({ name: 'window-project' }));

    const changedFiles = Array.from({ length: 11 }, (_, index) => {
      const filePath = path.join(projectRoot, 'src', `file-${index + 1}.ts`);
      writeFileSync(filePath, `export const value${index + 1} = ${index + 1};\n`);
      return filePath;
    });

    const contractPath = path.join(projectRoot, 'window.design.md');
    writeFileSync(
      contractPath,
      [
        '# Design Contract: Window smoke',
        '',
        '## Goal',
        '- verify hard-gate window warning reaches command output',
        '',
        '## Constraints',
        '- no executable rules needed for this smoke',
        '',
        '## Acceptance Criteria',
        '- [ ] warning is present in JSON output',
        '',
        '## Non-Goals',
        '- no contract violation in this fixture',
      ].join('\n'),
    );

    checkCommand = createCheckCommand();
    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      contractPath,
      '--against',
      projectRoot,
      '--changed-files',
      ...changedFiles,
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload.scan_mode).toBe('diff');
    expect(payload.changed_files).toHaveLength(11);
    expect(payload.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'hard-gate-window-exceeded',
      }),
    ]));
    expect(process.exitCode).toBeUndefined();
  });
});
