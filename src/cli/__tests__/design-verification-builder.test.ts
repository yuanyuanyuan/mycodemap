import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const buildDesignHandoffMock = vi.fn();

vi.mock('../design-handoff-builder.js', async () => {
  const actual = await vi.importActual<typeof import('../design-handoff-builder.js')>(
    '../design-handoff-builder.js',
  );

  return {
    ...actual,
    buildDesignHandoff: buildDesignHandoffMock,
  };
});

const verificationModule = await import('../design-verification-builder.js');
const handoffModule = await import('../design-handoff-builder.js');

const { buildDesignVerification } = verificationModule;
const { resolveDesignHandoffArtifacts } = handoffModule;

function createReadyHandoffResult(filePath: string, outputRoot: string) {
  const artifacts = resolveDesignHandoffArtifacts({
    filePath,
    outputDir: outputRoot,
    rootDir: process.cwd(),
  });

  return {
    ok: true,
    filePath,
    outputDir: artifacts.outputDir,
    readyForExecution: true,
    artifacts,
    summary: {
      candidateCount: 1,
      touchedFileCount: 1,
      supportingFileCount: 1,
      testCount: 1,
      riskCount: 0,
      approvalCount: 4,
      assumptionCount: 0,
      openQuestionCount: 0,
      diagnosticCount: 0,
      requiresReview: false,
    },
    handoff: {
      goal: ['在 src/cli/design-verification-builder.ts 中聚合 canonical verification truth'],
      constraints: [
        '结构化输出必须落在 src/interface/types/design-verification.ts',
        '必须保留 builder-focused 回归测试',
      ],
      acceptanceCriteria: [
        'src/cli/design-verification-builder.ts 会产出 conservative verification result',
        'src/interface/types/design-verification.ts 会定义正式 verification schema',
        'ready-path regressions 会被现有测试覆盖',
      ],
      nonGoals: ['不把 verify 重新塞回 workflow phase'],
      touchedFiles: ['src/cli/design-verification-builder.ts'],
      supportingFiles: ['src/interface/types/design-verification.ts'],
      tests: ['src/cli/__tests__/design-verification-builder.test.ts'],
      risks: [],
      validationChecklist: [
        'src/cli/design-verification-builder.ts 会产出 conservative verification result',
        'src/interface/types/design-verification.ts 会定义正式 verification schema',
        'ready-path regressions 会被现有测试覆盖',
      ],
      approvals: [
        {
          id: 'approved-goal',
          status: 'approved' as const,
          text: 'Goal 已被纳入 handoff 事实输入',
          sourceRefs: ['design:goal' as const],
        },
        {
          id: 'approved-constraints',
          status: 'approved' as const,
          text: 'Constraints 已被纳入 handoff 事实输入',
          sourceRefs: ['design:constraints' as const],
        },
        {
          id: 'approved-acceptance',
          status: 'approved' as const,
          text: 'Acceptance Criteria 已被纳入 handoff 事实输入',
          sourceRefs: ['design:acceptanceCriteria' as const],
        },
        {
          id: 'approved-non-goals',
          status: 'approved' as const,
          text: 'Non-Goals 已被纳入 handoff 事实输入',
          sourceRefs: ['design:nonGoals' as const],
        },
      ],
      assumptions: [],
      openQuestions: [],
    },
    diagnostics: [],
  };
}

describe('design-verification-builder', () => {
  const tempRoots: string[] = [];
  const readyFixture = path.join(process.cwd(), 'tests/fixtures/design-contracts/verify-ready.design.md');

  beforeEach(() => {
    buildDesignHandoffMock.mockReset();
  });

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
    vi.clearAllMocks();
  });

  it('marks the zero-unresolved ready fixture as ready for execution when reviewed handoff truth exists', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-verify-ready-'));
    tempRoots.push(outputRoot);
    const readyHandoff = createReadyHandoffResult(readyFixture, outputRoot);

    mkdirSync(readyHandoff.artifacts.outputDir, { recursive: true });
    writeFileSync(readyHandoff.artifacts.jsonPath, `${JSON.stringify(readyHandoff, null, 2)}\n`, 'utf8');

    const result = await buildDesignVerification({
      filePath: readyFixture,
      outputDir: outputRoot,
      rootDir: process.cwd(),
    });

    expect(buildDesignHandoffMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.readyForExecution).toBe(true);
    expect(result.summary.satisfiedCount).toBe(3);
    expect(result.checklist.every((item) => item.status === 'satisfied')).toBe(true);
    expect(result.checklist.every((item) => item.evidenceRefs.length > 0)).toBe(true);
    expect(result.drift).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('does not false-pass when the reviewed handoff artifact is missing', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-verify-missing-'));
    tempRoots.push(outputRoot);
    buildDesignHandoffMock.mockResolvedValue(createReadyHandoffResult(readyFixture, outputRoot));

    const result = await buildDesignVerification({
      filePath: readyFixture,
      outputDir: outputRoot,
      rootDir: process.cwd(),
    });

    expect(buildDesignHandoffMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.readyForExecution).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'handoff-missing',
          blocker: false,
        }),
      ]),
    );
    expect(result.checklist.some((item) => item.status === 'needs-review')).toBe(true);
    expect(result.drift).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'handoff-missing',
        }),
      ]),
    );
    expect(result.drift.every((item) => item.sourceRefs.length > 0)).toBe(true);
  });

  it('blocks verification when required design sections are missing', async () => {
    const outputRoot = mkdtempSync(path.join(tmpdir(), 'codemap-design-verify-blocked-'));
    tempRoots.push(outputRoot);
    const missingAcceptanceFixture = path.join(
      process.cwd(),
      'tests/fixtures/design-contracts/missing-acceptance.design.md',
    );
    buildDesignHandoffMock.mockResolvedValue(createReadyHandoffResult(missingAcceptanceFixture, outputRoot));

    const result = await buildDesignVerification({
      filePath: missingAcceptanceFixture,
      outputDir: outputRoot,
      rootDir: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.readyForExecution).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-section',
          blocker: true,
        }),
      ]),
    );
    expect(result.drift).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'blocked-input',
        }),
      ]),
    );
    expect(result.drift.every((item) => item.sourceRefs.length > 0)).toBe(true);
  });
});
