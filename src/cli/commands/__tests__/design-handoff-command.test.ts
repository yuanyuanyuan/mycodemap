import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const buildDesignHandoffMock = vi.fn();
const renderDesignHandoffMarkdownMock = vi.fn(() => '# Mock Handoff\n\n## Validation Checklist\n- verify output');

vi.mock('../../design-handoff-builder.js', () => ({
  buildDesignHandoff: buildDesignHandoffMock,
  renderDesignHandoffMarkdown: renderDesignHandoffMarkdownMock,
}));

const designModule = await import('../design.js');
const { designCommand, runDesignHandoff } = designModule;

function createMockResult(
  outputRoot: string,
  overrides: Partial<Awaited<ReturnType<typeof runDesignHandoff>>> = {},
) {
  const handoffDir = path.join(outputRoot, 'handoffs');

  return {
    ok: true,
    filePath: path.join(process.cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
    outputDir: handoffDir,
    readyForExecution: true,
    artifacts: {
      stem: 'handoff-basic',
      outputDir: handoffDir,
      markdownPath: path.join(handoffDir, 'handoff-basic.handoff.md'),
      jsonPath: path.join(handoffDir, 'handoff-basic.handoff.json'),
    },
    summary: {
      candidateCount: 1,
      touchedFileCount: 1,
      supportingFileCount: 1,
      testCount: 1,
      riskCount: 1,
      approvalCount: 1,
      assumptionCount: 0,
      openQuestionCount: 0,
      diagnosticCount: 0,
      requiresReview: false,
    },
    handoff: {
      goal: ['生成 canonical handoff truth'],
      constraints: ['默认 artifact path 复用 src/cli/paths.ts'],
      acceptanceCriteria: ['返回 machine-readable handoff payload'],
      nonGoals: ['不恢复 workflow 的 commit / ci phases'],
      touchedFiles: ['src/cli/design-handoff-builder.ts'],
      supportingFiles: ['src/interface/types/design-handoff.ts'],
      tests: ['src/cli/__tests__/design-handoff-builder.test.ts'],
      risks: ['src/cli/design-handoff-builder.ts: medium'],
      validationChecklist: ['返回 machine-readable handoff payload'],
      approvals: [
        {
          id: 'approved-goal',
          status: 'approved' as const,
          text: 'Goal 已被纳入 handoff 事实输入',
          sourceRefs: ['design:goal' as const],
        },
      ],
      assumptions: [],
      openQuestions: [],
    },
    diagnostics: [],
    ...overrides,
  };
}

describe('design handoff command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  const tempRoots: string[] = [];
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    buildDesignHandoffMock.mockReset();
    renderDesignHandoffMarkdownMock.mockClear();
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.exitCode = originalExitCode;
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('returns machine readable handoff payload', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-handoff-json-'));
    tempRoots.push(outputRoot);
    buildDesignHandoffMock.mockResolvedValue(createMockResult(outputRoot));

    const result = await runDesignHandoff(
      path.join(process.cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
      { json: true, output: outputRoot },
    );

    expect(buildDesignHandoffMock).toHaveBeenCalledWith({
      filePath: path.join(process.cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
      outputDir: outputRoot,
    });
    expect(result.ok).toBe(true);
    expect(result.artifacts.markdownPath).toMatch(/\.handoff\.md$/u);
    expect(result.artifacts.jsonPath).toMatch(/\.handoff\.json$/u);
    expect(Array.isArray(result.handoff.approvals)).toBe(true);
    expect(Array.isArray(result.handoff.assumptions)).toBe(true);
    expect(Array.isArray(result.handoff.openQuestions)).toBe(true);
  });

  it('writes markdown and json artifacts in human mode', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-handoff-'));
    tempRoots.push(outputRoot);
    buildDesignHandoffMock.mockResolvedValue(createMockResult(outputRoot));

    await designCommand.parseAsync([
      'node',
      'design',
      'handoff',
      path.join(process.cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
      '--output',
      outputRoot,
    ]);

    const handoffDir = path.join(outputRoot, 'handoffs');
    const markdownPath = path.join(handoffDir, 'handoff-basic.handoff.md');
    const jsonPath = path.join(handoffDir, 'handoff-basic.handoff.json');

    expect(existsSync(markdownPath)).toBe(true);
    expect(existsSync(jsonPath)).toBe(true);
    expect(readFileSync(markdownPath, 'utf8')).toContain('## Validation Checklist');
    expect(JSON.parse(readFileSync(jsonPath, 'utf8'))).toEqual(
      expect.objectContaining({
        ok: true,
        artifacts: expect.objectContaining({
          markdownPath,
          jsonPath,
        }),
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('keeps review-needed handoff as non-blocking', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-handoff-review-'));
    tempRoots.push(outputRoot);
    buildDesignHandoffMock.mockResolvedValue(createMockResult(outputRoot, {
      readyForExecution: false,
      summary: {
        ...createMockResult(outputRoot).summary,
        openQuestionCount: 1,
        diagnosticCount: 1,
        requiresReview: true,
      },
      handoff: {
        ...createMockResult(outputRoot).handoff,
        openQuestions: [
          {
            id: 'open-question-1',
            text: '低风险 assumptions 是否也必须显式批准？',
            sourceRefs: ['design:openQuestions' as const],
          },
        ],
      },
      diagnostics: [
        {
          code: 'review-required' as const,
          severity: 'warning' as const,
          blocker: false,
          message: '需要人类复核后再执行',
          sourceRefs: ['diagnostic:review-required' as const],
        },
      ],
    }));

    await designCommand.parseAsync([
      'node',
      'design',
      'handoff',
      path.join(process.cwd(), 'tests/fixtures/design-contracts/handoff-pending-review.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(true);
    expect(payload.readyForExecution).toBe(false);
    expect(payload.handoff.openQuestions.length).toBeGreaterThan(0);
    expect(process.exitCode).toBeUndefined();
  });

  it('returns non-zero exit code for blocker diagnostics', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-handoff-blocked-'));
    tempRoots.push(outputRoot);
    buildDesignHandoffMock.mockResolvedValue(createMockResult(outputRoot, {
      ok: false,
      readyForExecution: false,
      diagnostics: [
        {
          code: 'blocked-mapping' as const,
          severity: 'error' as const,
          blocker: true,
          message: 'mapping blocked',
          sourceRefs: ['diagnostic:blocked-mapping' as const],
        },
      ],
    }));

    await designCommand.parseAsync([
      'node',
      'design',
      'handoff',
      path.join(process.cwd(), 'tests/fixtures/design-contracts/no-match.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(false);
    expect(payload.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'blocked-mapping' }),
      ]),
    );
    expect(process.exitCode).toBe(1);
  });

  it('exposes handoff in help output', () => {
    expect(designCommand.helpInformation()).toContain('handoff');
    expect(designCommand.helpInformation()).toContain('Design contract utilities');
  });
});
