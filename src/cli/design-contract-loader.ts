// [META] since:2026-03-25 | owner:cli-team | stable:false
// [WHY] Provide a CLI-owned loader and validator seam for human-authored design contract markdown files

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import type {
  ComplexityThresholdRule,
  DesignContractRule,
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
    rules: [],
    sections: {},
    orderedSections: [],
    missingRequiredSections: [...REQUIRED_DESIGN_CONTRACT_SECTIONS],
    diagnostics: [],
  };
}

interface ExtractedFrontmatter {
  bodyLines: string[];
  bodyLineStart: number;
  diagnostics: DesignContractDiagnostic[];
  rules: DesignContractRule[];
}

type RuleFieldValue = boolean | number | string | string[];

interface ParsedRuleItem {
  line: number;
  fields: Record<string, RuleFieldValue>;
}

function countLeadingSpaces(line: string): number {
  const match = line.match(/^ */u);
  return match?.[0].length ?? 0;
}

function isIgnorableFrontmatterLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

function stripYamlQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith('\'') && value.endsWith('\''))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseYamlScalar(value: string): boolean | number | string {
  const normalizedValue = stripYamlQuotes(value.trim());
  if (/^-?\d+(?:\.\d+)?$/u.test(normalizedValue)) {
    return Number(normalizedValue);
  }

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return normalizedValue;
}

function parseRuleField(
  rawContent: string,
  line: number,
  diagnostics: DesignContractDiagnostic[],
): { key: string; value: RuleFieldValue | undefined } | undefined {
  const match = rawContent.match(/^([a-z_]+):(.*)$/u);
  if (!match) {
    diagnostics.push(
      createDiagnostic(
        'invalid-frontmatter',
        `无法解析 frontmatter 字段: ${rawContent}`,
        'error',
        { line },
      ),
    );
    return undefined;
  }

  const key = match[1] ?? '';
  const rawValue = match[2]?.trim() ?? '';
  return {
    key,
    value: rawValue === '' ? undefined : parseYamlScalar(rawValue),
  };
}

function pushMissingRuleField(
  field: string,
  line: number,
  diagnostics: DesignContractDiagnostic[],
): void {
  diagnostics.push(
    createDiagnostic(
      'missing-rule-field',
      `规则缺少必填字段: ${field}`,
      'error',
      { line },
    ),
  );
}

function pushUnknownRuleField(
  field: string,
  line: number,
  diagnostics: DesignContractDiagnostic[],
): void {
  diagnostics.push(
    createDiagnostic(
      'unknown-rule-field',
      `规则包含未知字段: ${field}`,
      'error',
      { line },
    ),
  );
}

function readRuleStringField(
  item: ParsedRuleItem,
  field: string,
  diagnostics: DesignContractDiagnostic[],
): string | undefined {
  const value = item.fields[field];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  pushMissingRuleField(field, item.line, diagnostics);
  return undefined;
}

function readRuleNumberField(
  item: ParsedRuleItem,
  field: string,
  diagnostics: DesignContractDiagnostic[],
): number | undefined {
  const value = item.fields[field];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  diagnostics.push(
    createDiagnostic(
      'missing-rule-field',
      `规则字段 ${field} 必须是数字`,
      'error',
      { line: item.line },
    ),
  );
  return undefined;
}

function readRuleStringArrayField(
  item: ParsedRuleItem,
  field: string,
  diagnostics: DesignContractDiagnostic[],
): string[] | undefined {
  const value = item.fields[field];
  if (
    Array.isArray(value)
    && value.length > 0
    && value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
  ) {
    return value.map((entry) => entry.trim());
  }

  pushMissingRuleField(field, item.line, diagnostics);
  return undefined;
}

function validateRuleSeverity(
  item: ParsedRuleItem,
  diagnostics: DesignContractDiagnostic[],
): 'error' | 'warn' | undefined {
  const severity = item.fields.severity;
  if (severity === 'error' || severity === 'warn') {
    return severity;
  }

  if (severity === undefined) {
    pushMissingRuleField('severity', item.line, diagnostics);
    return undefined;
  }

  diagnostics.push(
    createDiagnostic(
      'invalid-rule-severity',
      `不支持的规则 severity: ${String(severity)}`,
      'error',
      { line: item.line },
    ),
  );
  return undefined;
}

function createComplexityRule(
  item: ParsedRuleItem,
  diagnostics: DesignContractDiagnostic[],
): ComplexityThresholdRule | undefined {
  const name = readRuleStringField(item, 'name', diagnostics);
  const module = readRuleStringField(item, 'module', diagnostics);
  const severity = validateRuleSeverity(item, diagnostics);

  const maxCyclomatic = item.fields.max_cyclomatic === undefined
    ? undefined
    : readRuleNumberField(item, 'max_cyclomatic', diagnostics);
  const maxCognitive = item.fields.max_cognitive === undefined
    ? undefined
    : readRuleNumberField(item, 'max_cognitive', diagnostics);
  const minMaintainability = item.fields.min_maintainability === undefined
    ? undefined
    : readRuleNumberField(item, 'min_maintainability', diagnostics);

  if (maxCyclomatic == null && maxCognitive == null && minMaintainability == null) {
    pushMissingRuleField('max_cyclomatic|max_cognitive|min_maintainability', item.line, diagnostics);
  }

  if (!name || !module || !severity || (maxCyclomatic == null && maxCognitive == null && minMaintainability == null)) {
    return undefined;
  }

  return {
    type: 'complexity_threshold',
    name,
    module,
    severity,
    ...(maxCyclomatic == null ? {} : { maxCyclomatic }),
    ...(maxCognitive == null ? {} : { maxCognitive }),
    ...(minMaintainability == null ? {} : { minMaintainability }),
  };
}

function normalizeRuleItem(
  item: ParsedRuleItem,
  diagnostics: DesignContractDiagnostic[],
): DesignContractRule | undefined {
  const typeValue = item.fields.type;
  if (typeof typeValue !== 'string' || typeValue.trim() === '') {
    pushMissingRuleField('type', item.line, diagnostics);
    return undefined;
  }

  const ruleType = typeValue.trim();
  const allowedFieldsByType: Record<string, readonly string[]> = {
    layer_direction: ['type', 'name', 'from', 'to', 'severity'],
    forbidden_imports: ['type', 'name', 'module', 'forbidden', 'severity'],
    module_public_api_only: ['type', 'name', 'module', 'public_api', 'severity'],
    complexity_threshold: [
      'type',
      'name',
      'module',
      'max_cyclomatic',
      'max_cognitive',
      'min_maintainability',
      'severity',
    ],
  };

  if (!(ruleType in allowedFieldsByType)) {
    diagnostics.push(
      createDiagnostic(
        'invalid-rule-type',
        `不支持的规则类型: ${ruleType}`,
        'error',
        { line: item.line },
      ),
    );
    return undefined;
  }

  const allowedFields = new Set(allowedFieldsByType[ruleType]);
  for (const field of Object.keys(item.fields)) {
    if (!allowedFields.has(field)) {
      pushUnknownRuleField(field, item.line, diagnostics);
    }
  }

  if (ruleType === 'layer_direction') {
    const name = readRuleStringField(item, 'name', diagnostics);
    const from = readRuleStringField(item, 'from', diagnostics);
    const to = readRuleStringField(item, 'to', diagnostics);
    const severity = validateRuleSeverity(item, diagnostics);

    if (!name || !from || !to || !severity) {
      return undefined;
    }

    return {
      type: 'layer_direction',
      name,
      from,
      to,
      severity,
    };
  }

  if (ruleType === 'forbidden_imports') {
    const name = readRuleStringField(item, 'name', diagnostics);
    const module = readRuleStringField(item, 'module', diagnostics);
    const forbidden = readRuleStringArrayField(item, 'forbidden', diagnostics);
    const severity = validateRuleSeverity(item, diagnostics);

    if (!name || !module || !forbidden || !severity) {
      return undefined;
    }

    return {
      type: 'forbidden_imports',
      name,
      module,
      forbidden,
      severity,
    };
  }

  if (ruleType === 'module_public_api_only') {
    const name = readRuleStringField(item, 'name', diagnostics);
    const module = readRuleStringField(item, 'module', diagnostics);
    const publicApi = readRuleStringField(item, 'public_api', diagnostics);
    const severity = validateRuleSeverity(item, diagnostics);

    if (!name || !module || !publicApi || !severity) {
      return undefined;
    }

    return {
      type: 'module_public_api_only',
      name,
      module,
      publicApi,
      severity,
    };
  }

  return createComplexityRule(item, diagnostics);
}

function parseRuleItems(
  lines: readonly string[],
  startIndex: number,
  lineOffset: number,
  diagnostics: DesignContractDiagnostic[],
): { nextIndex: number; rules: DesignContractRule[] } {
  const rules: DesignContractRule[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const rawLine = lines[index] ?? '';
    if (isIgnorableFrontmatterLine(rawLine)) {
      index += 1;
      continue;
    }

    const indent = countLeadingSpaces(rawLine);
    if (indent === 0) {
      break;
    }

    if (indent !== 2 || !rawLine.trim().startsWith('- ')) {
      diagnostics.push(
        createDiagnostic(
          'invalid-rules-root',
          'rules 必须是以 `-` 开头的 YAML 列表',
          'error',
          { line: lineOffset + index },
        ),
      );
      index += 1;
      continue;
    }

    const item: ParsedRuleItem = {
      line: lineOffset + index,
      fields: {},
    };
    const firstFieldText = rawLine.trim().slice(2).trim();
    if (firstFieldText.length > 0) {
      const parsedField = parseRuleField(firstFieldText, lineOffset + index, diagnostics);
      if (parsedField?.value !== undefined) {
        item.fields[parsedField.key] = parsedField.value;
      }
    }
    index += 1;

    while (index < lines.length) {
      const nestedLine = lines[index] ?? '';
      if (isIgnorableFrontmatterLine(nestedLine)) {
        index += 1;
        continue;
      }

      const nestedIndent = countLeadingSpaces(nestedLine);
      if (nestedIndent === 0 || (nestedIndent === 2 && nestedLine.trim().startsWith('- '))) {
        break;
      }

      if (nestedIndent < 4) {
        diagnostics.push(
          createDiagnostic(
            'invalid-frontmatter',
            'frontmatter 缩进不合法',
            'error',
            { line: lineOffset + index },
          ),
        );
        index += 1;
        continue;
      }

      const parsedField = parseRuleField(nestedLine.trim(), lineOffset + index, diagnostics);
      if (!parsedField) {
        index += 1;
        continue;
      }

      if (parsedField.value !== undefined) {
        item.fields[parsedField.key] = parsedField.value;
        index += 1;
        continue;
      }

      index += 1;
      const listValues: string[] = [];

      while (index < lines.length) {
        const listLine = lines[index] ?? '';
        if (isIgnorableFrontmatterLine(listLine)) {
          index += 1;
          continue;
        }

        const listIndent = countLeadingSpaces(listLine);
        if (listIndent <= nestedIndent) {
          break;
        }

        if (!listLine.trim().startsWith('- ')) {
          diagnostics.push(
            createDiagnostic(
              'invalid-frontmatter',
              `frontmatter 列表字段 ${parsedField.key} 必须使用 '-' 项`,
              'error',
              { line: lineOffset + index },
            ),
          );
          index += 1;
          continue;
        }

        const listValue = parseYamlScalar(listLine.trim().slice(2).trim());
        listValues.push(String(listValue));
        index += 1;
      }

      item.fields[parsedField.key] = listValues;
    }

    const normalizedRule = normalizeRuleItem(item, diagnostics);
    if (normalizedRule) {
      rules.push(normalizedRule);
    }
  }

  return { nextIndex: index, rules };
}

function extractFrontmatter(lines: readonly string[]): ExtractedFrontmatter {
  if (lines[0]?.trim() !== '---') {
    return {
      bodyLines: [...lines],
      bodyLineStart: 1,
      diagnostics: [],
      rules: [],
    };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex === -1) {
    return {
      bodyLines: [...lines],
      bodyLineStart: 1,
      diagnostics: [
        createDiagnostic(
          'invalid-frontmatter',
          'YAML frontmatter 缺少结束分隔符 `---`',
          'error',
          { line: 1 },
        ),
      ],
      rules: [],
    };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const diagnostics: DesignContractDiagnostic[] = [];
  const rules: DesignContractRule[] = [];
  let index = 0;

  while (index < frontmatterLines.length) {
    const rawLine = frontmatterLines[index] ?? '';
    if (isIgnorableFrontmatterLine(rawLine)) {
      index += 1;
      continue;
    }

    if (countLeadingSpaces(rawLine) !== 0) {
      diagnostics.push(
        createDiagnostic(
          'invalid-frontmatter',
          'frontmatter 顶层字段必须从列首开始',
          'error',
          { line: index + 2 },
        ),
      );
      index += 1;
      continue;
    }

    const fieldMatch = rawLine.match(/^([a-z_]+):(.*)$/u);
    if (!fieldMatch) {
      diagnostics.push(
        createDiagnostic(
          'invalid-frontmatter',
          `无法解析 frontmatter 行: ${rawLine.trim()}`,
          'error',
          { line: index + 2 },
        ),
      );
      index += 1;
      continue;
    }

    const fieldName = fieldMatch[1] ?? '';
    const fieldValue = fieldMatch[2]?.trim() ?? '';

    if (fieldName !== 'rules') {
      diagnostics.push(
        createDiagnostic(
          'unknown-frontmatter-field',
          `未知的 frontmatter 字段: ${fieldName}`,
          'error',
          { line: index + 2 },
        ),
      );
      index += 1;
      continue;
    }

    if (fieldValue !== '' && fieldValue !== '[]') {
      diagnostics.push(
        createDiagnostic(
          'invalid-rules-root',
          'rules 必须是 YAML 列表或空列表 []',
          'error',
          { line: index + 2 },
        ),
      );
      index += 1;
      continue;
    }

    if (fieldValue === '[]') {
      index += 1;
      continue;
    }

    const parsedRules = parseRuleItems(frontmatterLines, index + 1, 2, diagnostics);
    rules.push(...parsedRules.rules);
    index = parsedRules.nextIndex;
  }

  return {
    bodyLines: lines.slice(closingIndex + 1),
    bodyLineStart: closingIndex + 2,
    diagnostics,
    rules,
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
  const rawLines = sourceText.split(/\r?\n/u);
  const frontmatter = extractFrontmatter(rawLines);
  const lines = frontmatter.bodyLines;
  const metadata = createMetadata(filePath, extractDocumentTitle(lines));
  const sections: Partial<Record<DesignContractSectionId, DesignContractSection>> = {};
  const orderedSections: DesignContractSection[] = [];
  const diagnostics: DesignContractDiagnostic[] = [...frontmatter.diagnostics];

  let pendingSection: PendingSection | undefined;

  lines.forEach((rawLine, index) => {
    const lineNumber = frontmatter.bodyLineStart + index;
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
    rules: frontmatter.rules,
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
