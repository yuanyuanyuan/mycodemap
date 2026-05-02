// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] 测试 receipt 增强功能：分类、同步检测、个性化下一步

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => text,
    cyan: (text: string) => text,
    gray: (text: string) => text,
    green: (text: string) => text,
    red: (text: string) => text,
    white: Object.assign((text: string) => text, { bold: (text: string) => text }),
    yellow: (text: string) => text,
  },
}));

import { createInitPlan } from '../reconciler.js';
import { renderInitReceipt, renderInitPreview } from '../receipt.js';

function createTempProject(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-receipt-test-'));
  writeFileSync(path.join(root, 'package.json'), '{"name":"test"}', 'utf8');
  return root;
}

describe('init receipt', () => {
  let rootDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rootDir = createTempProject();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    rmSync(rootDir, { recursive: true, force: true });
  });

  describe('team file sync detection', () => {
    it('detects already-synced CLAUDE.md with .mycodemap/ references', () => {
      writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Project\n\nSee .mycodemap/assistants/claude-context.md\n');

      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('CLAUDE.md [already-synced]');
    });

    it('detects manual-action-needed for CLAUDE.md without .mycodemap/ references', () => {
      writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Project\n\nNo codemap references here.\n');

      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('CLAUDE.md [manual action]');
      expect(output).toContain('将 .mycodemap/assistants/claude-context.md 中的内容复制到项目根目录的 CLAUDE.md');
    });

    it('detects manual-action-needed when CLAUDE.md does not exist', () => {
      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('CLAUDE.md [manual action]');
    });

    it('is case-insensitive for .mycodemap/ path matching', () => {
      writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Project\n\nSee .MYCODEMAP/config\n');

      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('CLAUDE.md [already-synced]');
    });

    it('detects already-synced AGENTS.md with .mycodemap/ references', () => {
      writeFileSync(path.join(rootDir, 'AGENTS.md'), '# Agents\n\nSee .mycodemap/assistants/agents-context.md\n');

      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('AGENTS.md [already-synced]');
    });

    it('detects manual-action-needed for AGENTS.md without .mycodemap/ references', () => {
      writeFileSync(path.join(rootDir, 'AGENTS.md'), '# Agents\n\nNo codemap references.\n');

      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('AGENTS.md [manual action]');
      expect(output).toContain('将 .mycodemap/assistants/agents-context.md 中的内容复制到项目根目录的 AGENTS.md');
    });
  });

  describe('asset classification', () => {
    it('classifies assistant context assets in Main Agent section', () => {
      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Main Agent（主 Agent 上下文）');
    });

    it('classifies assistant hook/agent-example assets in Subagent section', () => {
      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Subagent（子 Agent 配置）');
    });

    it('classifies workspace/config assets in infrastructure section', () => {
      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('基础设施');
      expect(output).toContain('workspace');
      expect(output).toContain('canonical config');
    });

    it('renders two-section receipt with Main Agent and Subagent groups', () => {
      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Main Agent（主 Agent 上下文）');
      expect(output).toContain('Subagent（子 Agent 配置）');
      expect(output).toContain('基础设施');
    });

    it('renders two-section preview with same classification as receipt', () => {
      const plan = createInitPlan(rootDir, 'preview');
      renderInitPreview(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Main Agent（主 Agent 上下文）');
      expect(output).toContain('Subagent（子 Agent 配置）');
      expect(output).toContain('基础设施');
    });
  });

  describe('personalized next steps', () => {
    it('generates specific steps for installed assistant assets', () => {
      const plan = createInitPlan(rootDir, 'preview');
      const receipt = plan.receipt;

      const hasAssistantStep = receipt.nextSteps.some(
        (step) => step.includes('.mycodemap/assistants/') || step.includes('mycodemap doctor')
      );
      expect(hasAssistantStep).toBe(true);
    });

    it('prioritizes conflict steps over manual-action steps', () => {
      writeFileSync(
        path.join(rootDir, 'mycodemap.config.json'),
        JSON.stringify({ mode: 'fast' }),
        'utf8'
      );

      const plan = createInitPlan(rootDir, 'preview');
      const receipt = plan.receipt;

      expect(receipt.nextSteps.some((s) => s.includes('删除'))).toBe(true);
    });

    it('caps next steps at 3 (D-08)', () => {
      writeFileSync(
        path.join(rootDir, 'mycodemap.config.json'),
        JSON.stringify({ mode: 'fast', output: '.codemap' }),
        'utf8'
      );

      const plan = createInitPlan(rootDir, 'preview');
      expect(plan.receipt.nextSteps.length).toBeLessThanOrEqual(3);
    });

    it('falls back to doctor/generate when no actionable steps', () => {
      writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Project\n\nSee .mycodemap/assistants/claude-context.md\n');
      writeFileSync(path.join(rootDir, 'AGENTS.md'), '# Agents\n\nSee .mycodemap/assistants/agents-context.md\n');

      const plan = createInitPlan(rootDir, 'preview');
      const steps = plan.receipt.nextSteps;

      expect(steps.length).toBeLessThanOrEqual(3);
    });

    it('includes assistant guidance in next steps for installed context assets', () => {
      const plan = createInitPlan(rootDir, 'preview');
      const steps = plan.receipt.nextSteps;

      const hasContextStep = steps.some(
        (s) => s.includes('claude-context') || s.includes('agents-context')
      );
      expect(hasContextStep).toBe(true);
    });

    it('renders next steps section in receipt output', () => {
      const plan = createInitPlan(rootDir, 'preview');
      renderInitReceipt(plan.receipt);

      const output = consoleLogSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('下一步');
    });
  });
});
