import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createEnvContractPlan, applyEnvContractPlan } from '../env-contract-plan.js';

describe('createEnvContractPlan', () => {
  const tempRoots: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'codemap-env-contract-'));
    tempRoots.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns installed asset with write action for package.json with scripts.test', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf8',
    );

    const plan = createEnvContractPlan(dir, 'nodejs', 'apply');

    expect(plan.assets).toHaveLength(1);
    expect(plan.assets[0].status).toBe('installed');
    expect(plan.assets[0].key).toBe('env-contract');
    expect(plan.assets[0].ownership).toBe('tool-owned');
    expect(plan.writes).toHaveLength(1);
    expect(plan.writes[0].targetPath).toBe(
      path.join(dir, '.mycodemap', 'env-contract.json'),
    );
  });

  it('produces valid JSON seed with schemaVersion, projectProfile, and items', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf8',
    );

    const plan = createEnvContractPlan(dir, 'nodejs', 'apply');
    const content = JSON.parse(plan.writes[0].content);

    expect(content.schemaVersion).toBe('env-contract.seed.v1');
    expect(content.projectProfile.name).toBe('nodejs');
    expect(content.projectProfile.source).toBe('package.json');
    expect(Array.isArray(content.items)).toBe(true);

    const testItem = content.items.find(
      (i: { key: string }) => i.key === 'testCommand',
    );
    expect(testItem).toBeDefined();
    expect(testItem.value).toBe('vitest run');
    expect(testItem.confidence).toBe('high');
  });

  it('returns skipped asset in preview mode with no writes', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf8',
    );

    const plan = createEnvContractPlan(dir, 'nodejs', 'preview');

    expect(plan.assets).toHaveLength(1);
    expect(plan.assets[0].status).toBe('skipped');
    expect(plan.writes).toHaveLength(0);
    expect(plan.assets[0].details.join(' ')).toContain('预览模式');
  });

  it('returns already-synced asset when file exists with same content', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf8',
    );

    // First create the plan to get the expected content
    const plan1 = createEnvContractPlan(dir, 'nodejs', 'apply');
    const targetPath = plan1.writes[0].targetPath;

    // Write the file to disk
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, plan1.writes[0].content, 'utf8');

    // Now create the plan again — should detect existing matching content
    const plan2 = createEnvContractPlan(dir, 'nodejs', 'apply');

    expect(plan2.assets).toHaveLength(1);
    expect(plan2.assets[0].status).toBe('already-synced');
    expect(plan2.writes).toHaveLength(0);
  });

  it('returns conflict asset when file exists with different content', () => {
    const dir = createTempDir();
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf8',
    );

    // Write a file with different content
    const targetPath = path.join(dir, '.mycodemap', 'env-contract.json');
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, '{"different": true}', 'utf8');

    const plan = createEnvContractPlan(dir, 'nodejs', 'apply');

    expect(plan.assets).toHaveLength(1);
    expect(plan.assets[0].status).toBe('conflict');
    expect(plan.assets[0].manualAction).toContain('手动审阅');
    expect(plan.writes).toHaveLength(0);
  });
});

describe('applyEnvContractPlan', () => {
  it('writes the JSON file to disk', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'codemap-env-contract-apply-'));
    try {
      writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ scripts: { test: 'vitest run' } }),
        'utf8',
      );

      const plan = createEnvContractPlan(dir, 'nodejs', 'apply');
      await applyEnvContractPlan(plan);

      const targetPath = path.join(dir, '.mycodemap', 'env-contract.json');
      expect(existsSync(targetPath)).toBe(true);

      const content = JSON.parse(readFileSync(targetPath, 'utf8'));
      expect(content.schemaVersion).toBe('env-contract.seed.v1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
