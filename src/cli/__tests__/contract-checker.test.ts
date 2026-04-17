import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildDependencyCruiserRuleSet,
  runContractCheck,
} from '../contract-checker.js';
import { loadDesignContract } from '../design-contract-loader.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const designFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'design-contracts');
const contractCheckFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'contract-check');

describe('contract-checker', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes a valid project in full-scan mode and ignores test fixtures', async () => {
    const result = await runContractCheck({
      contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
      againstPath: path.join(contractCheckFixturesDir, 'valid-project'),
      rootDir: repoRoot,
    });

    expect(result.passed).toBe(true);
    expect(result.scan_mode).toBe('full');
    expect(result.changed_files).toEqual([]);
    expect(result.scanned_files).not.toEqual(
      expect.arrayContaining([
        'src/core/__tests__/ignored-broken.test.ts',
      ]),
    );
    expect(result.violations).toEqual([]);
    expect(result.summary).toEqual(
      expect.objectContaining({
        total_violations: 0,
        error_count: 0,
        warn_count: 0,
        rule_count: 3,
      }),
    );
  });

  it('reports all three rule families from the invalid project', async () => {
    const result = await runContractCheck({
      contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
      againstPath: path.join(contractCheckFixturesDir, 'invalid-project'),
      rootDir: repoRoot,
    });
    const ruleTypes = result.violations.map((violation) => violation.rule_type);

    expect(result.passed).toBe(false);
    expect(ruleTypes).toEqual(
      expect.arrayContaining([
        'layer_direction',
        'forbidden_imports',
        'module_public_api_only',
      ]),
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        total_violations: 3,
        error_count: 2,
        warn_count: 1,
      }),
    );
  });

  it('keeps module_public_api_only on the custom evaluator path', async () => {
    const loadedContract = await loadDesignContract({
      filePath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
      rootDir: repoRoot,
    });
    const translatedRules = buildDependencyCruiserRuleSet(loadedContract.contract.rules);
    const dependencyCruiserRuleTypes = Array.from(
      translatedRules.metadataByGeneratedName.values(),
      (metadata) => metadata.ruleType,
    );

    expect(dependencyCruiserRuleTypes).toEqual(
      expect.arrayContaining(['layer_direction', 'forbidden_imports']),
    );
    expect(dependencyCruiserRuleTypes).not.toContain('module_public_api_only');
  });

  it('reports complexity threshold violations from the custom evaluator path', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-contract-check-'));
    tempRoots.push(root);

    mkdirSync(path.join(root, 'src', 'app'), { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'complexity-check' }));
    writeFileSync(
      path.join(root, 'src', 'app', 'complex.ts'),
      [
        'export function renderState(value: number): string {',
        '  if (value > 10) return "a";',
        '  if (value > 9) return "b";',
        '  if (value > 8) return "c";',
        '  if (value > 7) return "d";',
        '  return "ok";',
        '}',
      ].join('\n'),
    );

    const contractPath = path.join(root, 'complexity.design.md');
    writeFileSync(
      contractPath,
      [
        '---',
        'rules:',
        '  - type: complexity_threshold',
        '    name: "app complexity budget"',
        '    module: "src/app/**"',
        '    max_cyclomatic: 2',
        '    severity: error',
        '---',
        '# Design Contract: Complexity threshold',
        '',
        '## Goal',
        '- enforce complexity hardening',
        '',
        '## Constraints',
        '- reuse existing complexity analyzer',
        '',
        '## Acceptance Criteria',
        '- [ ] complexity threshold can fail check',
        '',
        '## Non-Goals',
        '- no new policy engine',
      ].join('\n'),
    );

    const result = await runContractCheck({
      contractPath,
      againstPath: root,
      rootDir: root,
    });

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule: 'app complexity budget',
          rule_type: 'complexity_threshold',
          severity: 'error',
          location: 'src/app/complex.ts',
          hard_fail: true,
        }),
      ]),
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        total_violations: 1,
        error_count: 1,
      }),
    );
  });

  it('keeps warn-only complexity violations non-blocking', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-contract-check-'));
    tempRoots.push(root);

    mkdirSync(path.join(root, 'src', 'app'), { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'complexity-warn-check' }));
    writeFileSync(
      path.join(root, 'src', 'app', 'warn.ts'),
      [
        'export function maybeWarn(value: number): number {',
        '  if (value > 3) return 3;',
        '  if (value > 2) return 2;',
        '  return value;',
        '}',
      ].join('\n'),
    );

    const contractPath = path.join(root, 'complexity-warn.design.md');
    writeFileSync(
      contractPath,
      [
        '---',
        'rules:',
        '  - type: complexity_threshold',
        '    name: "warn-only complexity"',
        '    module: "src/app/**"',
        '    max_cyclomatic: 1',
        '    severity: warn',
        '---',
        '# Design Contract: Complexity warn',
        '',
        '## Goal',
        '- warn on risky complexity',
        '',
        '## Constraints',
        '- warn should not fail CI',
        '',
        '## Acceptance Criteria',
        '- [ ] warn-only stays additive',
        '',
        '## Non-Goals',
        '- no hard failure here',
      ].join('\n'),
    );

    const result = await runContractCheck({
      contractPath,
      againstPath: root,
      rootDir: root,
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rule_type: 'complexity_threshold',
          severity: 'warn',
          hard_fail: false,
        }),
      ]),
    );
    expect(result.summary).toEqual(
      expect.objectContaining({
        error_count: 0,
        warn_count: 1,
      }),
    );
  });

  it('emits explicit warnings when complexity data is unavailable for a rule', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-contract-check-'));
    tempRoots.push(root);

    mkdirSync(path.join(root, 'src', 'app'), { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'complexity-unavailable-check' }));
    writeFileSync(
      path.join(root, 'src', 'app', 'ok.ts'),
      'export const ok = true;\n',
    );

    const contractPath = path.join(root, 'complexity-unavailable.design.md');
    writeFileSync(
      contractPath,
      [
        '---',
        'rules:',
        '  - type: complexity_threshold',
        '    name: "missing module complexity"',
        '    module: "src/missing/**"',
        '    max_cyclomatic: 1',
        '    severity: error',
        '---',
        '# Design Contract: Complexity unavailable',
        '',
        '## Goal',
        '- unavailable complexity should warn loudly',
        '',
        '## Constraints',
        '- missing data cannot silently pass',
        '',
        '## Acceptance Criteria',
        '- [ ] warning is explicit',
        '',
        '## Non-Goals',
        '- no fake low-risk default',
      ].join('\n'),
    );

    const result = await runContractCheck({
      contractPath,
      againstPath: root,
      rootDir: root,
    });

    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'complexity-threshold-unavailable',
        }),
      ]),
    );
  });
});
