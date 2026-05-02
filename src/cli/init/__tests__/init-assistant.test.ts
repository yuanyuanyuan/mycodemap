import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => text,
    cyan: (text: string) => text,
    gray: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
    yellow: (text: string) => text,
  },
}));

import { createAssistantPlan, applyAssistantPlan } from '../assistant-plan.js';

function createTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-assistant-'));
}

describe('createAssistantPlan', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('returns all 4 assets when no assistantProfile filter is provided', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);

    expect(plan.assets).toHaveLength(4);
    const keys = plan.assets.map((a) => a.key);
    expect(keys).toContain('assistant:claude-context');
    expect(keys).toContain('assistant:agents-context');
    expect(keys).toContain('assistant:claude-hook-example');
    expect(keys).toContain('assistant:codex-agent-example');
  });

  it('returns 2 codex-specific assets when assistantProfile is codex', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir, 'codex');

    expect(plan.assets).toHaveLength(2);
    const keys = plan.assets.map((a) => a.key);
    expect(keys).toContain('assistant:agents-context');
    expect(keys).toContain('assistant:codex-agent-example');
    expect(keys).not.toContain('assistant:claude-context');
    expect(keys).not.toContain('assistant:claude-hook-example');
  });

  it('returns 2 claude-specific assets when assistantProfile is claude', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir, 'claude');

    expect(plan.assets).toHaveLength(2);
    const keys = plan.assets.map((a) => a.key);
    expect(keys).toContain('assistant:claude-context');
    expect(keys).toContain('assistant:claude-hook-example');
    expect(keys).not.toContain('assistant:agents-context');
    expect(keys).not.toContain('assistant:codex-agent-example');
  });

  it('generates installed assets with write actions for new files', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);

    for (const asset of plan.assets) {
      expect(asset.status).toBe('installed');
      expect(asset.ownership).toBe('tool-owned');
      expect(asset.origin).toBe('assistant-bootstrap');
    }
    expect(plan.writes).toHaveLength(4);
  });

  it('generates claude-context.md content referencing env-contract.json and mycodemap doctor', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    const write = plan.writes.find((w) => w.targetPath.endsWith('claude-context.md'));

    expect(write).toBeDefined();
    expect(write!.content).toContain('env-contract.json');
    expect(write!.content).toContain('mycodemap doctor');
    expect(write!.content).toContain('mycodemap generate');
    expect(write!.content).toContain('mycodemap preview');
    expect(write!.content).toContain('CLAUDE.md');
  });

  it('generates agents-context.md content referencing env-contract.json', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    const write = plan.writes.find((w) => w.targetPath.endsWith('agents-context.md'));

    expect(write).toBeDefined();
    expect(write!.content).toContain('env-contract.json');
    expect(write!.content).toContain('mycodemap doctor');
    expect(write!.content).toContain('AGENTS.md');
  });

  it('generates claude-hook-example.json with valid JSON and SubagentStart structure', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    const write = plan.writes.find((w) => w.targetPath.endsWith('claude-hook-example.json'));

    expect(write).toBeDefined();
    const parsed = JSON.parse(write!.content);
    expect(parsed.hooks).toBeDefined();
    expect(parsed.hooks.SubagentStart).toBeDefined();
    expect(Array.isArray(parsed.hooks.SubagentStart)).toBe(true);
    expect(parsed.hooks.SubagentStart[0].hooks[0].type).toBe('command');
    expect(parsed.hooks.SubagentStart[0].hooks[0].command).toContain('mycodemap env-contract --for');
    expect(parsed.hooks.SubagentStart[0].hooks[0].command).toContain('additionalContext');
  });

  it('generates codex-agent-example.toml with developer_instructions', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    const write = plan.writes.find((w) => w.targetPath.endsWith('codex-agent-example.toml'));

    expect(write).toBeDefined();
    expect(write!.content).toContain('[developer_instructions]');
    expect(write!.content).toContain('developer_instructions = """');
    expect(write!.content).toContain('codemap_env_contract(agentType="worker")');
    expect(write!.content).toContain('mycodemap env-contract --for worker --json');
  });

  it('returns already-synced when file exists with identical content', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    // Get expected content for claude-context.md
    const firstPlan = createAssistantPlan(rootDir, 'claude');
    const write = firstPlan.writes.find((w) => w.targetPath.endsWith('claude-context.md'))!;
    mkdirSync(path.dirname(write.targetPath), { recursive: true });
    writeFileSync(write.targetPath, write.content, 'utf8');

    // Re-run: should detect already-synced
    const secondPlan = createAssistantPlan(rootDir, 'claude');
    const asset = secondPlan.assets.find((a) => a.key === 'assistant:claude-context');

    expect(asset).toBeDefined();
    expect(asset!.status).toBe('already-synced');
    expect(secondPlan.writes).toHaveLength(1); // only the hook example
  });

  it('returns conflict when file exists with different content', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const assistantsDir = path.join(rootDir, '.mycodemap', 'assistants');
    mkdirSync(assistantsDir, { recursive: true });
    writeFileSync(path.join(assistantsDir, 'claude-context.md'), 'old content', 'utf8');

    const plan = createAssistantPlan(rootDir, 'claude');
    const asset = plan.assets.find((a) => a.key === 'assistant:claude-context');

    expect(asset).toBeDefined();
    expect(asset!.status).toBe('conflict');
    expect(asset!.manualAction).toContain('手动审阅');
    // conflict assets should NOT produce write actions
    const conflictWrite = plan.writes.find((w) => w.targetPath.endsWith('claude-context.md'));
    expect(conflictWrite).toBeUndefined();
  });

  it('uses profileName in generated content when provided', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir, undefined, 'nodejs');
    const claudeWrite = plan.writes.find((w) => w.targetPath.endsWith('claude-context.md'));
    const agentsWrite = plan.writes.find((w) => w.targetPath.endsWith('agents-context.md'));

    expect(claudeWrite!.content).toContain('nodejs');
    expect(agentsWrite!.content).toContain('nodejs');
  });

  it('defaults profileName to generic when not provided', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    const claudeWrite = plan.writes.find((w) => w.targetPath.endsWith('claude-context.md'));

    expect(claudeWrite!.content).toContain('generic');
  });

  it('no generated template contains raw cat .mycodemap/env-contract.json', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);

    for (const write of plan.writes) {
      expect(write.content).not.toContain('cat .mycodemap/env-contract.json');
    }
  });

  it('claude-context and agents-context contain retrieval guidance with --for flag', () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    const claudeWrite = plan.writes.find((w) => w.targetPath.endsWith('claude-context.md'));
    const agentsWrite = plan.writes.find((w) => w.targetPath.endsWith('agents-context.md'));

    expect(claudeWrite).toBeDefined();
    expect(agentsWrite).toBeDefined();
    expect(claudeWrite!.content).toContain('mycodemap env-contract --for default --json');
    expect(agentsWrite!.content).toContain('mycodemap env-contract --for default --json');
    expect(claudeWrite!.content).toContain('--for explore, --for plan, --for worker, or --for verify');
    expect(agentsWrite!.content).toContain('--for explore, --for plan, --for worker, or --for verify');
  });
});

describe('applyAssistantPlan', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('writes files to .mycodemap/assistants/ directory', async () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    await applyAssistantPlan(plan);

    const assistantsDir = path.join(rootDir, '.mycodemap', 'assistants');
    expect(existsSync(path.join(assistantsDir, 'claude-context.md'))).toBe(true);
    expect(existsSync(path.join(assistantsDir, 'agents-context.md'))).toBe(true);
    expect(existsSync(path.join(assistantsDir, 'claude-hook-example.json'))).toBe(true);
    expect(existsSync(path.join(assistantsDir, 'codex-agent-example.toml'))).toBe(true);
  });

  it('writes content that matches the plan writes', async () => {
    const rootDir = createTempDir();
    tempRoots.push(rootDir);

    const plan = createAssistantPlan(rootDir);
    await applyAssistantPlan(plan);

    for (const write of plan.writes) {
      const actual = readFileSync(write.targetPath, 'utf8');
      expect(actual).toBe(write.content);
    }
  });
});
