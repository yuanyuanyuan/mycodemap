// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] Provide the canonical complexity seam for active TS/JS/Python/Go parser flows

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { ComplexityMetrics } from '../interface/types/index.js';
import type { LanguageId } from '../interface/types/parser.js';

type SupportedComplexityLanguage = Extract<LanguageId, 'typescript' | 'javascript' | 'python' | 'go'>;

export interface FunctionComplexity {
  name: string;
  kind: 'function' | 'method' | 'constructor';
  line: number;
  column: number;
  cyclomatic: number;
  cognitive: number;
  lines: number;
  nestingDepth: number;
  isHighComplexity: boolean;
}

export interface FileComplexity {
  filePath: string;
  relativePath: string;
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  functions: number;
  classes: number;
  lines: number;
  functionDetails: FunctionComplexity[];
}

export interface ComplexityAnalysisResult {
  files: FileComplexity[];
  summary: {
    totalFiles: number;
    averageCyclomatic: number;
    averageCognitive: number;
    averageMaintainability: number;
    highComplexityFunctions: number;
  };
}

export interface CanonicalComplexityInput {
  filePath: string;
  content: string;
  language: SupportedComplexityLanguage;
}

interface InternalFunctionDetail {
  name: string;
  kind: FunctionComplexity['kind'];
  line: number;
  cyclomatic: number;
  cognitive: number;
  lines: number;
  nestingDepth: number;
}

interface PythonContextFrame {
  indent: number;
  name: string;
}

interface PythonFunctionState {
  indent: number;
  startLine: number;
  name: string;
  qualifiedName: string;
  kind: FunctionComplexity['kind'];
  branchCount: number;
  maxDepth: number;
}

interface GoFunctionRange {
  name: string;
  startLine: number;
  startOffset: number;
  endOffset: number;
}

const HIGH_COMPLEXITY_THRESHOLD = 10;
const SUPPORTED_EXTENSIONS = new Map<string, SupportedComplexityLanguage>([
  ['.ts', 'typescript'],
  ['.tsx', 'typescript'],
  ['.js', 'javascript'],
  ['.jsx', 'javascript'],
  ['.mjs', 'javascript'],
  ['.cjs', 'javascript'],
  ['.py', 'python'],
  ['.go', 'go'],
]);

function calculateMaintainabilityIndex(loc: number, cyclomatic: number, commentRatio: number): number {
  const normalizedLOC = Math.max(1, loc);
  const normalizedCC = Math.max(1, cyclomatic);

  let mi = 100;
  mi -= (normalizedCC - 1) * 2;
  mi -= Math.log(normalizedLOC / 10 + 1) * 5;
  mi += commentRatio * 15;

  return Math.max(0, Math.min(100, Math.round(mi)));
}

function detectLanguageFromFilePath(filePath: string): SupportedComplexityLanguage {
  const extension = path.extname(filePath).toLowerCase();
  const language = SUPPORTED_EXTENSIONS.get(extension);

  if (!language) {
    throw new Error(`不支持的 complexity 语言: ${filePath}`);
  }

  return language;
}

function toComplexityMetrics(fileComplexity: FileComplexity): ComplexityMetrics {
  return {
    cyclomatic: fileComplexity.cyclomatic,
    cognitive: fileComplexity.cognitive,
    maintainability: fileComplexity.maintainability,
    details: {
      functions: fileComplexity.functionDetails.map((detail) => ({
        name: detail.name,
        cyclomatic: detail.cyclomatic,
        cognitive: detail.cognitive,
        lines: detail.lines,
      })),
    },
  };
}

function buildFileComplexity(
  filePath: string,
  lines: number,
  classes: number,
  functionDetails: InternalFunctionDetail[],
  cyclomatic: number,
  cognitive: number,
  maintainability: number
): FileComplexity {
  return {
    filePath,
    relativePath: path.basename(filePath),
    cyclomatic,
    cognitive,
    maintainability,
    functions: functionDetails.length,
    classes,
    lines,
    functionDetails: functionDetails.map((detail) => ({
      name: detail.name,
      kind: detail.kind,
      line: detail.line,
      column: 1,
      cyclomatic: detail.cyclomatic,
      cognitive: detail.cognitive,
      lines: detail.lines,
      nestingDepth: detail.nestingDepth,
      isHighComplexity: detail.cyclomatic >= HIGH_COMPLEXITY_THRESHOLD,
    })),
  };
}

function countLines(content: string): number {
  return content.split('\n').length;
}

function countCommentLines(content: string, language: SupportedComplexityLanguage): number {
  return content
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (language === 'python') {
        return trimmed.startsWith('#');
      }

      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    })
    .length;
}

function normalizeIndent(rawLine: string): number {
  return rawLine.replace(/\t/g, '    ').match(/^ */)?.[0].length ?? 0;
}

function stripPythonInlineComment(line: string): string {
  let inSingle = false;
  let inDouble = false;

  for (let index = 0; index < line.length; index++) {
    const current = line[index];

    if (current === "'" && !inDouble && line[index - 1] !== '\\') {
      inSingle = !inSingle;
      continue;
    }
    if (current === '"' && !inSingle && line[index - 1] !== '\\') {
      inDouble = !inDouble;
      continue;
    }
    if (current === '#' && !inSingle && !inDouble) {
      return line.slice(0, index);
    }
  }

  return line;
}

function countRegexMatches(value: string, regex: RegExp): number {
  const matches = value.match(regex);
  return matches ? matches.length : 0;
}

function isTypeScriptBranchNode(node: ts.Node): boolean {
  return ts.isIfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isCaseClause(node) ||
    ts.isCatchClause(node) ||
    ts.isConditionalExpression(node) ||
    ts.isSwitchStatement(node) ||
    ts.isTryStatement(node);
}

function measureTypeScriptComplexity(node: ts.Node): { cyclomatic: number; cognitive: number; nestingDepth: number } {
  let branches = 0;
  let maxDepth = 0;

  const visit = (current: ts.Node, depth: number): void => {
    const isBranch = isTypeScriptBranchNode(current);

    if (
      ts.isIfStatement(current) ||
      ts.isWhileStatement(current) ||
      ts.isForStatement(current) ||
      ts.isForInStatement(current) ||
      ts.isForOfStatement(current) ||
      ts.isCaseClause(current) ||
      ts.isCatchClause(current) ||
      ts.isConditionalExpression(current)
    ) {
      branches++;
    }

    if (ts.isBinaryExpression(current)) {
      const operator = current.operatorToken.kind;
      if (
        operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken
      ) {
        branches++;
      }
    }

    const nextDepth = isBranch ? depth + 1 : depth;
    if (isBranch) {
      maxDepth = Math.max(maxDepth, nextDepth);
    }

    ts.forEachChild(current, (child) => visit(child, nextDepth));
  };

  visit(node, 0);

  const cyclomatic = branches + 1;
  return {
    cyclomatic,
    cognitive: cyclomatic + maxDepth * 2,
    nestingDepth: maxDepth,
  };
}

function analyzeTypeScriptFile(filePath: string, sourceCode: string): FileComplexity {
  const sourceFile = ts.createSourceFile(
    path.basename(filePath),
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const functionDetails: InternalFunctionDetail[] = [];
  let classCount = 0;

  const collect = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node)) {
      classCount++;
    }

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const metrics = measureTypeScriptComplexity(node);
      const name = node.name?.getText(sourceFile) || '<anonymous>';

      functionDetails.push({
        name,
        kind: ts.isConstructorDeclaration(node)
          ? 'constructor'
          : ts.isMethodDeclaration(node)
            ? 'method'
            : 'function',
        line: position.line + 1,
        cyclomatic: metrics.cyclomatic,
        cognitive: metrics.cognitive,
        lines: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line - position.line + 1,
        nestingDepth: metrics.nestingDepth,
      });
    }

    ts.forEachChild(node, collect);
  };

  collect(sourceFile);

  const fileMetrics = measureTypeScriptComplexity(sourceFile);
  const lines = countLines(sourceCode);
  const commentRatio = countCommentLines(sourceCode, 'typescript') / Math.max(1, lines);

  return buildFileComplexity(
    filePath,
    lines,
    classCount,
    functionDetails,
    fileMetrics.cyclomatic,
    fileMetrics.cognitive,
    calculateMaintainabilityIndex(lines, fileMetrics.cyclomatic, commentRatio)
  );
}

function countPythonBranchTokens(line: string): number {
  let branches = countRegexMatches(line, /\b(if|elif|for|while|except|assert)\b/g);
  branches += countRegexMatches(line, /\b(and|or)\b/g);

  if (/\bif\b.+\belse\b/.test(line)) {
    branches++;
  }

  return branches;
}

function countPythonClasses(content: string): number {
  return content
    .split('\n')
    .filter((line) => /^\s*class\s+\w+/.test(stripPythonInlineComment(line)))
    .length;
}

function analyzePythonFile(filePath: string, content: string): FileComplexity {
  const lines = content.split('\n');
  const classStack: PythonContextFrame[] = [];
  const functionStack: PythonFunctionState[] = [];
  const functionDetails: InternalFunctionDetail[] = [];
  let fileBranches = 0;
  let fileMaxDepth = 0;

  const finalizeFunctions = (indent: number, lineNumber: number): void => {
    while (functionStack.length > 0 && indent <= functionStack[functionStack.length - 1]!.indent) {
      const current = functionStack.pop()!;
      functionDetails.push({
        name: current.qualifiedName,
        kind: current.kind,
        line: current.startLine,
        cyclomatic: current.branchCount + 1,
        cognitive: current.branchCount + 1 + current.maxDepth * 2,
        lines: Math.max(1, lineNumber - current.startLine),
        nestingDepth: current.maxDepth,
      });
    }
  };

  lines.forEach((rawLine, index) => {
    const line = stripPythonInlineComment(rawLine);
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      return;
    }

    const indent = normalizeIndent(rawLine);
    finalizeFunctions(indent, index + 1);

    while (classStack.length > 0 && indent <= classStack[classStack.length - 1]!.indent) {
      classStack.pop();
    }

    const classMatch = trimmed.match(/^class\s+([A-Za-z_]\w*)/);
    if (classMatch) {
      classStack.push({ indent, name: classMatch[1]! });
      return;
    }

    const functionMatch = trimmed.match(/^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/);
    if (functionMatch) {
      const currentClass = classStack[classStack.length - 1];
      const currentFunction = functionStack[functionStack.length - 1];
      const isMethod = Boolean(currentClass && (!currentFunction || currentClass.indent >= currentFunction.indent));
      const name = functionMatch[1]!;

      functionStack.push({
        indent,
        startLine: index + 1,
        name,
        qualifiedName: isMethod ? `${currentClass!.name}.${name}` : name,
        kind: isMethod ? 'method' : 'function',
        branchCount: 0,
        maxDepth: 0,
      });
      return;
    }

    const branches = countPythonBranchTokens(trimmed);
    if (branches === 0) {
      return;
    }

    fileBranches += branches;
    const fileDepth = Math.floor(indent / 4) + 1;
    fileMaxDepth = Math.max(fileMaxDepth, fileDepth);

    const currentFunction = functionStack[functionStack.length - 1];
    if (!currentFunction) {
      return;
    }

    currentFunction.branchCount += branches;
    const relativeDepth = Math.max(1, Math.floor(Math.max(0, indent - currentFunction.indent - 4) / 4) + 1);
    currentFunction.maxDepth = Math.max(currentFunction.maxDepth, relativeDepth);
  });

  finalizeFunctions(-1, lines.length + 1);

  const totalLines = countLines(content);
  const commentRatio = countCommentLines(content, 'python') / Math.max(1, totalLines);
  const cyclomatic = fileBranches + 1;

  return buildFileComplexity(
    filePath,
    totalLines,
    countPythonClasses(content),
    functionDetails,
    cyclomatic,
    cyclomatic + fileMaxDepth * 2,
    calculateMaintainabilityIndex(totalLines, cyclomatic, commentRatio)
  );
}

function findMatchingBrace(content: string, openBraceIndex: number): number {
  let depth = 0;

  for (let index = openBraceIndex; index < content.length; index++) {
    const current = content[index];
    if (current === '{') {
      depth++;
    } else if (current === '}') {
      depth--;
      if (depth === 0) {
        return index;
      }
    }
  }

  return content.length - 1;
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function countGoBranchTokens(line: string): number {
  let branches = countRegexMatches(line, /\b(if|for|switch|case|select)\b/g);
  branches += countRegexMatches(line, /&&|\|\|/g);
  return branches;
}

function extractGoFunctions(content: string): GoFunctionRange[] {
  const functions: GoFunctionRange[] = [];
  const functionRegex = /func\s+(?:\([^)]+\)\s+)?([A-Za-z_]\w*)\s*\([^)]*\)\s*[^{]*\{/g;
  let match: RegExpExecArray | null;

  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1];
    const braceIndex = content.indexOf('{', match.index);
    if (!name || braceIndex === -1) {
      continue;
    }

    functions.push({
      name,
      startLine: getLineNumber(content, match.index),
      startOffset: braceIndex,
      endOffset: findMatchingBrace(content, braceIndex),
    });
  }

  return functions;
}

function measureGoFunctionComplexity(content: string, range: GoFunctionRange): InternalFunctionDetail {
  const body = content.slice(range.startOffset + 1, range.endOffset);
  const lines = body.split('\n');
  let branchCount = 0;
  let maxDepth = 0;
  let braceDepth = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      braceDepth += countRegexMatches(rawLine, /{/g) - countRegexMatches(rawLine, /}/g);
      continue;
    }

    const branches = countGoBranchTokens(trimmed);
    if (branches > 0) {
      branchCount += branches;
      maxDepth = Math.max(maxDepth, braceDepth + 1);
    }

    braceDepth += countRegexMatches(rawLine, /{/g) - countRegexMatches(rawLine, /}/g);
  }

  const cyclomatic = branchCount + 1;
  return {
    name: range.name,
    kind: 'function',
    line: range.startLine,
    cyclomatic,
    cognitive: cyclomatic + maxDepth * 2,
    lines: Math.max(1, body.split('\n').length),
    nestingDepth: maxDepth,
  };
}

function analyzeGoFile(filePath: string, content: string): FileComplexity {
  const functionRanges = extractGoFunctions(content);
  const functionDetails = functionRanges.map((range) => measureGoFunctionComplexity(content, range));
  const totalLines = countLines(content);
  const commentRatio = countCommentLines(content, 'go') / Math.max(1, totalLines);
  const totalBranches = countRegexMatches(content, /\b(if|for|switch|case|select)\b/g) + countRegexMatches(content, /&&|\|\|/g);
  const maxDepth = functionDetails.reduce((highest, detail) => Math.max(highest, detail.nestingDepth), 0);
  const cyclomatic = totalBranches + 1;

  return buildFileComplexity(
    filePath,
    totalLines,
    0,
    functionDetails,
    cyclomatic,
    cyclomatic + maxDepth * 2,
    calculateMaintainabilityIndex(totalLines, cyclomatic, commentRatio)
  );
}

export function analyzeFileComplexityFromContent(input: CanonicalComplexityInput): FileComplexity {
  switch (input.language) {
    case 'typescript':
    case 'javascript':
      return analyzeTypeScriptFile(input.filePath, input.content);
    case 'python':
      return analyzePythonFile(input.filePath, input.content);
    case 'go':
      return analyzeGoFile(input.filePath, input.content);
    default: {
      const exhaustiveCheck: never = input.language;
      throw new Error(`不支持的 complexity 语言: ${exhaustiveCheck}`);
    }
  }
}

export function analyzeComplexityFromContent(input: CanonicalComplexityInput): ComplexityMetrics {
  return toComplexityMetrics(analyzeFileComplexityFromContent(input));
}

export function analyzeFileComplexity(filePath: string): FileComplexity {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const language = detectLanguageFromFilePath(filePath);
  return analyzeFileComplexityFromContent({
    filePath,
    content: sourceCode,
    language,
  });
}

export function analyzeMultipleFiles(filePaths: string[], rootDir?: string): ComplexityAnalysisResult {
  const files: FileComplexity[] = [];

  for (const filePath of filePaths) {
    try {
      const result = analyzeFileComplexity(filePath);
      if (rootDir) {
        result.relativePath = path.relative(rootDir, filePath);
      }
      files.push(result);
    } catch (error) {
      console.warn(`警告: 无法分析文件 ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (files.length === 0) {
    return {
      files: [],
      summary: {
        totalFiles: 0,
        averageCyclomatic: 0,
        averageCognitive: 0,
        averageMaintainability: 0,
        highComplexityFunctions: 0,
      },
    };
  }

  const totalCyclomatic = files.reduce((sum, file) => sum + file.cyclomatic, 0);
  const totalCognitive = files.reduce((sum, file) => sum + file.cognitive, 0);
  const totalMaintainability = files.reduce((sum, file) => sum + file.maintainability, 0);
  const highComplexityFunctions = files.reduce(
    (sum, file) => sum + file.functionDetails.filter((detail) => detail.isHighComplexity).length,
    0
  );

  return {
    files,
    summary: {
      totalFiles: files.length,
      averageCyclomatic: Math.round(totalCyclomatic / files.length),
      averageCognitive: Math.round(totalCognitive / files.length),
      averageMaintainability: Math.round(totalMaintainability / files.length),
      highComplexityFunctions,
    },
  };
}
