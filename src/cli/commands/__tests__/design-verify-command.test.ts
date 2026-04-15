import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

const buildDesignVerificationMock = vi.fn();

vi.mock('../../design-verification-builder.js', () => ({
  buildDesignVerification: buildDesignVerificationMock,
}));

const designModule = await import('../design.js');
const { designCommand, runDesignVerify } = designModule;

function createMockResult(
  overrides: Partial<Awaited<ReturnType<typeof runDesignVerify>>> = {},
) {
  return {
    ok: true,
    filePath: path.join(process.cwd(), 'tests/fixtures/design-contracts/verify-ready.design.md'),
    readyForExecution: true,
    summary: {
      checklistCount: 3,
      satisfiedCount: 3,
      needsReviewCount: 0,
      violatedCount: 0,
      blockedCount: 0,
      driftCount: 0,
      diagnosticCount: 0,
      reviewRequired: false,
      blocked: false,
    },
    checklist: [
      {
        id: 'acceptance-1',
        text: 'src/cli/design-verification-builder.ts 会产出 conservative verification result',
        status: 'satisfied' as const,
        evidenceRefs: ['candidate:src/cli/design-verification-builder.ts' as const],
      },
    ],
    drift: [],
    diagnostics: [],
    ...overrides,
  };
}

describe('design verify command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    buildDesignVerificationMock.mockReset();
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.exitCode = originalExitCode;
    vi.clearAllMocks();
  });

  it('returns machine readable verification payload', async () => {
    buildDesignVerificationMock.mockResolvedValue(createMockResult());

    const result = await runDesignVerify(
      path.join(process.cwd(), 'tests/fixtures/design-contracts/verify-ready.design.md'),
      { json: true },
    );

    expect(buildDesignVerificationMock).toHaveBeenCalledWith({
      filePath: path.join(process.cwd(), 'tests/fixtures/design-contracts/verify-ready.design.md'),
    });
    expect(result.ok).toBe(true);
    expect(result.readyForExecution).toBe(true);
    expect(Array.isArray(result.checklist)).toBe(true);
    expect(Array.isArray(result.drift)).toBe(true);
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });

  it('prints JSON payload for ready verification', async () => {
    buildDesignVerificationMock.mockResolvedValue(createMockResult());

    await designCommand.parseAsync([
      'node',
      'design',
      'verify',
      path.join(process.cwd(), 'tests/fixtures/design-contracts/verify-ready.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(true);
    expect(payload.readyForExecution).toBe(true);
    expect(payload.summary.checklistCount).toBeGreaterThan(0);
    expect(payload.checklist.length).toBeGreaterThan(0);
    expect(process.exitCode).toBeUndefined();
  });

  it('keeps review-needed verification as non-blocking', async () => {
    buildDesignVerificationMock.mockResolvedValue(createMockResult({
      readyForExecution: false,
      summary: {
        ...createMockResult().summary,
        satisfiedCount: 1,
        needsReviewCount: 2,
        driftCount: 2,
        diagnosticCount: 1,
        reviewRequired: true,
      },
      checklist: [
        ...createMockResult().checklist,
        {
          id: 'acceptance-2',
          text: 'src/interface/types/design-verification.ts 会定义正式 verification schema',
          status: 'needs-review' as const,
          evidenceRefs: ['design:acceptanceCriteria' as const],
        },
      ],
      drift: [
        {
          kind: 'handoff-missing' as const,
          severity: 'warning' as const,
          message: 'Canonical handoff artifact is missing.',
          sourceRefs: ['diagnostic:handoff-missing' as const],
        },
      ],
      diagnostics: [
        {
          code: 'handoff-missing' as const,
          severity: 'warning' as const,
          blocker: false,
          message: 'Canonical handoff artifact is missing.',
          sourceRefs: ['diagnostic:handoff-missing' as const],
        },
      ],
    }));

    await designCommand.parseAsync([
      'node',
      'design',
      'verify',
      path.join(process.cwd(), 'tests/fixtures/design-contracts/verify-ready.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(true);
    expect(payload.readyForExecution).toBe(false);
    expect(payload.drift).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'handoff-missing' }),
      ]),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('returns non-zero exit code for blocked verification', async () => {
    buildDesignVerificationMock.mockResolvedValue(createMockResult({
      ok: false,
      readyForExecution: false,
      summary: {
        ...createMockResult().summary,
        satisfiedCount: 0,
        blockedCount: 1,
        driftCount: 1,
        diagnosticCount: 1,
        reviewRequired: false,
        blocked: true,
      },
      checklist: [
        {
          id: 'acceptance-1',
          text: '若 design 缺失必填 section，verify 必须阻断',
          status: 'blocked' as const,
          evidenceRefs: ['design:acceptanceCriteria' as const],
        },
      ],
      drift: [
        {
          kind: 'blocked-input' as const,
          severity: 'error' as const,
          message: 'Verification is blocked.',
          sourceRefs: ['diagnostic:blocked-input' as const],
        },
      ],
      diagnostics: [
        {
          code: 'missing-section' as const,
          severity: 'error' as const,
          blocker: true,
          message: '缺少必填 section: Acceptance Criteria',
          sourceRefs: ['design:acceptanceCriteria' as const],
        },
      ],
    }));

    await designCommand.parseAsync([
      'node',
      'design',
      'verify',
      path.join(process.cwd(), 'tests/fixtures/design-contracts/missing-acceptance.design.md'),
      '--json',
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));

    expect(payload.ok).toBe(false);
    expect(payload.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing-section' }),
      ]),
    );
    expect(process.exitCode).toBe(1);
  });

  it('exposes verify in help output', () => {
    expect(designCommand.helpInformation()).toContain('verify');
    expect(designCommand.helpInformation()).toContain('Design contract utilities');
  });
});
