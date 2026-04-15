import path from 'node:path';
import { cwd } from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadDesignContractMock = vi.fn();
const hasBlockingDesignContractDiagnosticsMock = vi.fn();
const resolveDesignScopeMock = vi.fn();

vi.mock('../design-contract-loader.js', () => ({
  loadDesignContract: loadDesignContractMock,
  hasBlockingDesignContractDiagnostics: hasBlockingDesignContractDiagnosticsMock,
}));

vi.mock('../design-scope-resolver.js', () => ({
  resolveDesignScope: resolveDesignScopeMock,
}));

const builderModule = await import('../design-handoff-builder.js');

const {
  buildDesignHandoff,
  renderDesignHandoffMarkdown,
  resolveDesignHandoffArtifacts,
} = builderModule;

function createLoadedContract(openQuestions: string[] = []) {
  return {
    ok: true,
    exists: true,
    filePath: path.join(cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
    contract: {
      metadata: {
        version: 'v1' as const,
        title: 'Handoff baseline',
        sourcePath: path.join(cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
      },
      sections: {
        goal: {
          id: 'goal' as const,
          title: 'Goal',
          rawHeading: 'Goal',
          content: ['- 生成 canonical handoff truth'],
          line: 3,
        },
        constraints: {
          id: 'constraints' as const,
          title: 'Constraints',
          rawHeading: 'Constraints',
          content: ['- 默认 artifact path 复用 src/cli/paths.ts'],
          line: 6,
        },
        acceptanceCriteria: {
          id: 'acceptanceCriteria' as const,
          title: 'Acceptance Criteria',
          rawHeading: 'Acceptance Criteria',
          content: ['- [ ] 返回 machine-readable handoff payload'],
          line: 9,
        },
        nonGoals: {
          id: 'nonGoals' as const,
          title: 'Non-Goals',
          rawHeading: 'Non-Goals',
          content: ['- 不恢复 workflow 的 commit / ci phases'],
          line: 12,
        },
        ...(openQuestions.length > 0
          ? {
              openQuestions: {
                id: 'openQuestions' as const,
                title: 'Open Questions',
                rawHeading: 'Open Questions',
                content: openQuestions.map((text) => `- ${text}`),
                line: 15,
              },
            }
          : {}),
      },
      orderedSections: [],
      missingRequiredSections: [],
      diagnostics: [],
    },
    diagnostics: [],
  };
}

function createMappingResult(overrides: Partial<ReturnType<typeof baseMappingResult>> = {}) {
  return {
    ...baseMappingResult(),
    ...overrides,
  };
}

function baseMappingResult() {
  return {
    ok: true,
    filePath: path.join(cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
    summary: {
      candidateCount: 1,
      blocked: false,
      unknownCount: 0,
      diagnosticCount: 0,
    },
    candidates: [
      {
        kind: 'file' as const,
        path: 'src/cli/design-handoff-builder.ts',
        reasons: [
          {
            section: 'goal' as const,
            matchedText: 'src/cli/design-handoff-builder.ts',
            evidenceType: 'path-anchor' as const,
          },
        ],
        dependencies: ['src/interface/types/design-handoff.ts'],
        testImpact: ['src/cli/__tests__/design-handoff-builder.test.ts'],
        risk: 'medium' as const,
        confidence: {
          score: 0.91,
          level: 'high' as const,
        },
        unknowns: [],
      },
    ],
    diagnostics: [],
  };
}

describe('design-handoff-builder', () => {
  beforeEach(() => {
    loadDesignContractMock.mockReset();
    hasBlockingDesignContractDiagnosticsMock.mockReset();
    resolveDesignScopeMock.mockReset();
    hasBlockingDesignContractDiagnosticsMock.mockImplementation((diagnostics: Array<{ severity: string }>) =>
      diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves default artifacts into the handoffs subdirectory', () => {
    const artifacts = resolveDesignHandoffArtifacts({
      filePath: path.join(cwd(), 'tests/fixtures/design-contracts/handoff-basic.design.md'),
      rootDir: cwd(),
    });

    expect(artifacts.outputDir).toContain(`${path.sep}handoffs`);
    expect(artifacts.markdownPath).toMatch(/handoff-basic\.handoff\.md$/u);
    expect(artifacts.jsonPath).toMatch(/handoff-basic\.handoff\.json$/u);
  });

  it('builds canonical handoff payload from design and mapping truth', async () => {
    loadDesignContractMock.mockResolvedValue(createLoadedContract());
    resolveDesignScopeMock.mockResolvedValue(createMappingResult());

    const result = await buildDesignHandoff({
      filePath: 'tests/fixtures/design-contracts/handoff-basic.design.md',
      rootDir: cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.readyForExecution).toBe(true);
    expect(result.handoff.touchedFiles).toEqual(['src/cli/design-handoff-builder.ts']);
    expect(result.handoff.supportingFiles).toEqual(['src/interface/types/design-handoff.ts']);
    expect(result.handoff.tests).toEqual(['src/cli/__tests__/design-handoff-builder.test.ts']);
    expect(result.handoff.validationChecklist).toEqual(['返回 machine-readable handoff payload']);
    expect(result.handoff.approvals.every((item) => item.sourceRefs.length > 0)).toBe(true);
  });

  it('renders markdown with fixed review headings', async () => {
    loadDesignContractMock.mockResolvedValue(createLoadedContract());
    resolveDesignScopeMock.mockResolvedValue(createMappingResult());

    const result = await buildDesignHandoff({
      filePath: 'tests/fixtures/design-contracts/handoff-basic.design.md',
      rootDir: cwd(),
    });
    const markdown = renderDesignHandoffMarkdown(result);

    expect(markdown).toContain('## Goal');
    expect(markdown).toContain('## Scope');
    expect(markdown).toContain('## Validation Checklist');
    expect(markdown).toContain('## Open Questions');
    expect(markdown).toContain('## Approval Gates');
  });

  it('marks unresolved open questions as review-needed without blocking handoff generation', async () => {
    loadDesignContractMock.mockResolvedValue(createLoadedContract([
      '低风险 assumptions 是否也必须显式批准？',
    ]));
    resolveDesignScopeMock.mockResolvedValue(createMappingResult());

    const result = await buildDesignHandoff({
      filePath: 'tests/fixtures/design-contracts/handoff-pending-review.design.md',
      rootDir: cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.readyForExecution).toBe(false);
    expect(result.handoff.openQuestions.length).toBeGreaterThan(0);
    expect(result.summary.requiresReview).toBe(true);
    expect(result.handoff.approvals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'needs-review',
        }),
      ]),
    );
    expect(result.handoff.openQuestions.every((item) => item.sourceRefs.length > 0)).toBe(true);
  });

  it('blocks handoff when mapping does not produce a safe executable scope', async () => {
    loadDesignContractMock.mockResolvedValue(createLoadedContract());
    resolveDesignScopeMock.mockResolvedValue(createMappingResult({
      ok: false,
      summary: {
        candidateCount: 0,
        blocked: true,
        unknownCount: 0,
        diagnosticCount: 1,
      },
      candidates: [],
      diagnostics: [
        {
          code: 'no-candidates' as const,
          severity: 'error' as const,
          blocker: true,
          message: '未能解析出可信候选范围',
          candidatePaths: [],
        },
      ],
    }));

    const result = await buildDesignHandoff({
      filePath: 'tests/fixtures/design-contracts/no-match.design.md',
      rootDir: cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.readyForExecution).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'blocked-mapping',
        }),
      ]),
    );
  });
});
