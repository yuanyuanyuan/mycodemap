// [META] since:2026-03-25 | owner:cli-team | stable:false
// [WHY] Provide a CLI-owned loader and validator seam for human-authored design contract markdown files

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import type {
  DesignContractDiagnostic,
  DesignContractDiagnosticSeverity,
  DesignContractMetadata,
  DesignContractRequiredSectionId,
  DesignContractSection,
  DesignContractSectionId,
  NormalizedDesignContract,
} from '../interface/types/design-contract.js';
import {
  DEFAULT_DESIGN_CONTRACT_PATH,
  getCanonicalDesignContractHeading,
  isRequiredDesignContractSection,
  normalizeDesignContractHeading,
  REQUIRED_DESIGN_CONTRACT_SECTIONS,
} from './design-contract-schema.js';

export interface LoadDesignContractOptions {
  filePath?: string;
  rootDir?: string;
}

export interface LoadedDesignContract {
  ok: boolean;
  exists: boolean;
  filePath: string;
  contract: NormalizedDesignContract;
  diagnostics: DesignContractDiagnostic[];
}

interface PendingSection {
  id: DesignContractSectionId;
  title: string;
  rawHeading: string;
  line: number;
  content: string[];
}

function resolveDesignContractPath(
  filePath?: string,
  rootDir: string = cwd(),
): string {
  if (!filePath) {
    return path.join(rootDir, DEFAULT_DESIGN_CONTRACT_PATH);
  }

  return path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
}

function createMetadata(sourcePath: string, title?: string): DesignContractMetadata {
  return {
    version: 'v1',
    sourcePath,
    title,
  };
}

function createDiagnostic(
  code: DesignContractDiagnostic['code'],
  message: string,
  severity: DesignContractDiagnosticSeverity,
  details: Partial<Omit<DesignContractDiagnostic, 'code' | 'message' | 'severity'>> = {},
): DesignContractDiagnostic {
  return {
    code,
    message,
    severity,
    ...details,
  };
}

function createEmptyContract(sourcePath: string): NormalizedDesignContract {
  return {
    metadata: createMetadata(sourcePath),
    sections: {},
    orderedSections: [],
    missingRequiredSections: [...REQUIRED_DESIGN_CONTRACT_SECTIONS],
    diagnostics: [],
  };
}

function trimSectionContent(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start]?.trim() === '') {
    start += 1;
  }

  while (end > start && lines[end - 1]?.trim() === '') {
    end -= 1;
  }

  return lines.slice(start, end);
}

function getSectionSeverity(sectionId: DesignContractSectionId): DesignContractDiagnosticSeverity {
  return isRequiredDesignContractSection(sectionId) ? 'error' : 'warning';
}

function finalizeSection(
  pendingSection: PendingSection | undefined,
  sections: Partial<Record<DesignContractSectionId, DesignContractSection>>,
  orderedSections: DesignContractSection[],
  diagnostics: DesignContractDiagnostic[],
): void {
  if (!pendingSection) {
    return;
  }

  if (sections[pendingSection.id]) {
    diagnostics.push(
      createDiagnostic(
        'duplicate-section',
        `重复的 section: ${getCanonicalDesignContractHeading(pendingSection.id)}`,
        'error',
        {
          section: pendingSection.id,
          heading: pendingSection.rawHeading,
          line: pendingSection.line,
        },
      ),
    );
    return;
  }

  const content = trimSectionContent(pendingSection.content);
  const section: DesignContractSection = {
    id: pendingSection.id,
    title: pendingSection.title,
    rawHeading: pendingSection.rawHeading,
    content,
    line: pendingSection.line,
  };

  sections[pendingSection.id] = section;
  orderedSections.push(section);

  if (content.length === 0) {
    diagnostics.push(
      createDiagnostic(
        'empty-section',
        `空的 section: ${getCanonicalDesignContractHeading(pendingSection.id)}`,
        getSectionSeverity(pendingSection.id),
        {
          section: pendingSection.id,
          heading: pendingSection.rawHeading,
          line: pendingSection.line,
        },
      ),
    );
  }
}

function extractDocumentTitle(lines: readonly string[]): string | undefined {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('# ')) {
      return line.slice(2).trim();
    }
  }

  return undefined;
}

export function hasBlockingDesignContractDiagnostics(
  diagnostics: readonly DesignContractDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

export async function loadDesignContract(
  options: LoadDesignContractOptions = {},
): Promise<LoadedDesignContract> {
  const rootDir = options.rootDir ?? cwd();
  const filePath = resolveDesignContractPath(options.filePath, rootDir);
  const initialContract = createEmptyContract(filePath);

  if (!existsSync(filePath)) {
    const diagnostics = [
      createDiagnostic(
        'file-not-found',
        `未找到 design contract 文件: ${filePath}`,
        'error',
        {
          suggestion: `请创建 ${DEFAULT_DESIGN_CONTRACT_PATH}，或显式传入文件路径`,
        },
      ),
      ...REQUIRED_DESIGN_CONTRACT_SECTIONS.map((sectionId) => createDiagnostic(
        'missing-section',
        `缺少必填 section: ${getCanonicalDesignContractHeading(sectionId)}`,
        'error',
        {
          section: sectionId,
        },
      )),
    ];

    return {
      ok: false,
      exists: false,
      filePath,
      contract: {
        ...initialContract,
        diagnostics,
      },
      diagnostics,
    };
  }

  const sourceText = await readFile(filePath, 'utf8');
  const lines = sourceText.split(/\r?\n/u);
  const metadata = createMetadata(filePath, extractDocumentTitle(lines));
  const sections: Partial<Record<DesignContractSectionId, DesignContractSection>> = {};
  const orderedSections: DesignContractSection[] = [];
  const diagnostics: DesignContractDiagnostic[] = [];

  let pendingSection: PendingSection | undefined;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const headingMatch = rawLine.match(/^##\s+(.+?)\s*$/u);

    if (!headingMatch) {
      if (pendingSection) {
        pendingSection.content.push(rawLine);
      }
      return;
    }

    finalizeSection(pendingSection, sections, orderedSections, diagnostics);
    pendingSection = undefined;

    const heading = headingMatch[1]?.trim() ?? '';
    const sectionId = normalizeDesignContractHeading(heading);

    if (!sectionId) {
      diagnostics.push(
        createDiagnostic(
          'unknown-section',
          `未知的 section heading: ${heading}`,
          'warning',
          {
            heading,
            line: lineNumber,
          },
        ),
      );
      return;
    }

    pendingSection = {
      id: sectionId,
      title: getCanonicalDesignContractHeading(sectionId),
      rawHeading: heading,
      line: lineNumber,
      content: [],
    };
  });

  finalizeSection(pendingSection, sections, orderedSections, diagnostics);

  const missingRequiredSections: DesignContractRequiredSectionId[] = REQUIRED_DESIGN_CONTRACT_SECTIONS.filter(
    (sectionId) => !sections[sectionId],
  );

  for (const sectionId of missingRequiredSections) {
    diagnostics.push(
      createDiagnostic(
        'missing-section',
        `缺少必填 section: ${getCanonicalDesignContractHeading(sectionId)}`,
        'error',
        {
          section: sectionId,
        },
      ),
    );
  }

  const contract: NormalizedDesignContract = {
    metadata,
    sections,
    orderedSections,
    missingRequiredSections,
    diagnostics,
  };

  return {
    ok: !hasBlockingDesignContractDiagnostics(diagnostics),
    exists: true,
    filePath,
    contract,
    diagnostics,
  };
}
