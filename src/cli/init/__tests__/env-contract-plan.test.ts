// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Tests for createEnvContractPlan — verifies discovery-based contract generation,
// seed migration, preview/apply modes, and already-synced/conflict states.

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

  function writeFile(rootDir: string, relPath: string, content: string): void {
    const fullPath = path.join(rootDir, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
  }

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) rmSync(root, { recursive: true, force: true });
    }
  });

  const SAMPLE_AGENTS = `# AGENTS.md
## 6. Retrieval Priority
- Use \`rtk\` prefix for shell commands.
- CodeMap CLI query/analyze/deps/impact should be tried first.
`;

  const SAMPLE_HOOK = `#!/bin/sh
VALID_TAGS="BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE"
echo "Format: [TAG] scope: message"
`;

  const SAMPLE_PACKAGE = JSON.stringify(
    { scripts: { test: 'vitest run', build: 'tsc' } },
    null,
    2,
  );

  const SAMPLE_TESTING = `# Testing Rules
## Framework
- Vitest
`;

  function setupProject(dir: string): void {
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);
    writeFile(dir, '.githooks/commit-msg', SAMPLE_HOOK);
    writeFile(dir, 'package.json', SAMPLE_PACKAGE);
    writeFile(dir, 'docs/rules/testing.md', SAMPLE_TESTING);
  }

  it('returns installed asset with write action when contract sources are present', () => {
    const dir = createTempDir();
    setupProject(dir);

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

  it('produces valid JSON with schemaVersion env-contract.v1, projectProfile, and items', () => {
    const dir = createTempDir();
    setupProject(dir);

    const plan = createEnvContractPlan(dir, 'nodejs', 'apply');
    const content = JSON.parse(plan.writes[0].content);

    expect(content.schemaVersion).toBe('env-contract.v1');
    expect(content.projectProfile.name).toBe('nodejs');
    expect(content.projectProfile.source).toBe('package.json');
    expect(Array.isArray(content.items)).toBe(true);
    expect(content.items.length).toBeGreaterThan(0);

    // Should include test-entry-vitest from package.json
    const testItem = content.items.find(
      (i: { id: string }) => i.id === 'test-entry-vitest',
    );
    expect(testItem).toBeDefined();
  });

  it('generated contract includes sourceSnapshots', () => {
    const dir = createTempDir();
    setupProject(dir);

    const plan = createEnvContractPlan(dir, 'nodejs', 'apply');
    const content = JSON.parse(plan.writes[0].content);

    expect(Array.isArray(content.sourceSnapshots)).toBe(true);
    expect(content.sourceSnapshots.length).toBeGreaterThan(0);

    const snapshotFiles = content.sourceSnapshots.map(
      (s: { file: string }) => s.file,
    );
    expect(snapshotFiles).toContain('package.json');
    expect(snapshotFiles).toContain('.githooks/commit-msg');
    expect(snapshotFiles).toContain('AGENTS.md');
  });

  it('returns skipped asset in preview mode with no writes', () => {
    const dir = createTempDir();
    setupProject(dir);

    const plan = createEnvContractPlan(dir, 'nodejs', 'preview');

    expect(plan.assets).toHaveLength(1);
    expect(plan.assets[0].status).toBe('skipped');
    expect(plan.writes).toHaveLength(0);
    expect(plan.assets[0].details.join(' ')).toContain('预览模式');
    expect(plan.assets[0].details.join(' ')).toContain('env-contract.v1');
  });

  it('returns already-synced asset when file exists with same content', () => {
    const dir = createTempDir();
    setupProject(dir);

    const fixedTimestamp = '2026-05-02T00:00:00.000Z';

    // First create the plan with a fixed timestamp
    const plan1 = createEnvContractPlan(dir, 'nodejs', 'apply', { generatedAt: fixedTimestamp });
    const targetPath = plan1.writes[0].targetPath;

    // Write the file to disk
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, plan1.writes[0].content, 'utf8');

    // Now create the plan again with the same timestamp — should detect matching content
    const plan2 = createEnvContractPlan(dir, 'nodejs', 'apply', { generatedAt: fixedTimestamp });

    expect(plan2.assets).toHaveLength(1);
    expect(plan2.assets[0].status).toBe('already-synced');
    expect(plan2.writes).toHaveLength(0);
  });

  it('returns conflict asset when file exists with different unrecognized content', () => {
    const dir = createTempDir();
    setupProject(dir);

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

  it('migrates env-contract.seed.v1 to env-contract.v1 deterministically', () => {
    const dir = createTempDir();
    setupProject(dir);

    // Write a seed v1 contract
    const seedContract = {
      schemaVersion: 'env-contract.seed.v1',
      generatedAt: '2026-05-01T00:00:00.000Z',
      projectProfile: { name: 'nodejs', source: 'package.json', confidence: 'high' },
      items: [
        { category: 'execution', key: 'testCommand', value: 'vitest run', source: 'package.json:scripts.test', confidence: 'high' },
      ],
    };
    const targetPath = path.join(dir, '.mycodemap', 'env-contract.json');
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, JSON.stringify(seedContract, null, 2), 'utf8');

    const plan = createEnvContractPlan(dir, 'nodejs', 'apply');

    expect(plan.assets).toHaveLength(1);
    expect(plan.assets[0].status).toBe('installed');
    expect(plan.assets[0].details.join(' ')).toContain('迁移');
    expect(plan.writes).toHaveLength(1);

    // Verify the migrated content has the new schema version
    const migrated = JSON.parse(plan.writes[0].content);
    expect(migrated.schemaVersion).toBe('env-contract.v1');
    expect(Array.isArray(migrated.items)).toBe(true);
    expect(Array.isArray(migrated.sourceSnapshots)).toBe(true);
  });

  it('returns installed with no manifest-derived facts when package.json is missing', () => {
    const dir = createTempDir();
    // Only AGENTS.md — no package.json
    writeFile(dir, 'AGENTS.md', SAMPLE_AGENTS);

    const plan = createEnvContractPlan(dir, 'generic', 'apply');

    expect(plan.assets).toHaveLength(1);
    expect(plan.assets[0].status).toBe('installed');
    expect(plan.writes).toHaveLength(1);

    const content = JSON.parse(plan.writes[0].content);
    expect(content.schemaVersion).toBe('env-contract.v1');
  });
});

describe('applyEnvContractPlan', () => {
  it('writes the JSON file to disk', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'codemap-env-contract-apply-'));
    try {
      // Setup project sources
      writeFileSync(path.join(dir, 'AGENTS.md'), '# AGENTS\n', 'utf8');
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
      expect(content.schemaVersion).toBe('env-contract.v1');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
