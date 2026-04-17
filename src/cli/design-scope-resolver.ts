// [META] since:2026-03-25 | owner:cli-team | stable:false
// [WHY] Translate validated design contracts into auditable candidate code scope with reason chains and blocker diagnostics

import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cwd } from 'node:process';
import { globby } from 'globby';
import type {
  CodeMap,
  DesignContractDiagnostic,
  DesignContractSection,
  DesignContractSectionId,
  DesignMappingCandidate,
  DesignMappingDiagnostic,
  DesignMappingDiagnosticCode,
  DesignMappingEvidenceType,
  DesignMappingReason,
  DesignMappingResult,
  DesignMappingSummary,
} from '../interface/types/index.js';
import { calculateConfidenceLevel, type CodemapOutput } from '../orchestrator/types.js';
import { resolveTestFile, resolveTestFiles } from '../orchestrator/test-linker.js';
import { AnalyzeCommand } from './commands/analyze.js';
import { loadDesignContract } from './design-contract-loader.js';
import { resolveDataPath } from './paths.js';

const POSITIVE_SECTION_IDS: readonly DesignContractSectionId[] = [
  'goal',
  'constraints',
  'acceptanceCriteria',
];
const HIGH_RISK_PATHS = new Set<string>([
  'src/cli/index.ts',
  'src/cli/commands/analyze.ts',
  'src/orchestrator/workflow/workflow-orchestrator.ts',
]);
const SOURCE_GLOBS = ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}', 'scripts/**/*.js'];
const SOURCE_IGNORE = ['dist/**', 'node_modules/**', '.mycodemap/**', '.codemap/**'];
const TEST_GLOBS = ['src/**/*.{test,spec}.{ts,tsx,js,jsx}', 'tests/**/*.{test,spec}.{ts,tsx,js,jsx}'];
const FIND_KEYWORD_LIMIT = 6;
const FIND_RESULTS_PER_KEYWORD = 6;
const OVER_BROAD_PATH_LIMIT = 6;
const OVER_BROAD_SUBSYSTEM_LIMIT = 3;
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const KEYWORD_STOPWORDS = new Set<string>([
  'acceptance',
  'criteria',
  'constraint',
  'constraints',
  'feature',
  'goal',
  'goals',
  'human',
  'machine',
  'provide',
  'provides',
  'return',
  'returns',
  'section',
  'sections',
  'should',
  'system',
  'with',
]);

interface ResolveDesignScopeOptions {
  filePath?: string;
  rootDir?: string;
}

interface AnchorSignal {
  section: DesignContractSectionId;
  matchedText: string;
  value: string;
  evidenceType: DesignMappingEvidenceType;
}

interface CandidateDraft extends DesignMappingCandidate {
  absolutePath?: string;
}

interface EnrichmentData {
  dependencies: string[];
  risk: DesignMappingCandidate['risk'];
  confidence: DesignMappingCandidate['confidence'];
  testImpact: string[];
  unknowns: string[];
}

interface SourceSnapshot {
  files: string[];
  contents: Map<string, string>;
  indexedPaths: Set<string>;
  testFiles: string[];
}

const codeMapSnapshotCache = new Map<string, CodeMap | null>();
const sourceSnapshotCache = new Map<string, Promise<SourceSnapshot>>();
const designScopeResultCache = new Map<string, Promise<DesignMappingResult>>();

function normalizeSlashes(value: string): string {
  return value.replace(/\\/gu, '/');
}

function isTestLikePath(filePath: string): boolean {
  const normalizedPath = normalizeSlashes(filePath).replace(/^\.\//u, '');
  return normalizedPath.includes('/__tests__/') || /\.(test|spec)\.[cm]?[jt]sx?$/iu.test(normalizedPath);
}

function stripKnownExtension(filePath: string): string {
  return filePath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/iu, '');
}

function toRelativePath(filePath: string, rootDir: string): string {
  if (!path.isAbsolute(filePath)) {
    return normalizeSlashes(filePath).replace(/^\.\//u, '');
  }

  return normalizeSlashes(path.relative(rootDir, filePath));
}

function toAbsolutePath(filePath: string, rootDir: string): string {
  if (path.isAbsolute(filePath)) {
    return normalizeSlashes(filePath);
  }

  return normalizeSlashes(path.join(rootDir, filePath));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function uniq<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function collectCodeSpans(text: string): string[] {
  const matches = text.match(/`([^`]+)`/gu) ?? [];
  return matches
    .map((match) => match.slice(1, -1).trim())
    .filter((match) => match.length > 0);
}

function collectPathAnchors(text: string): string[] {
  const matches = text.match(/(?:\.planning|src|tests|docs|scripts)\/[A-Za-z0-9_./-]+/gu) ?? [];
  return uniq(matches.map((match) => match.replace(/[),.:;!?]+$/u, '')));
}

function looksLikeIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value);
}

function looksLikeModuleAnchor(value: string): boolean {
  return value.includes('/') && !/\.[A-Za-z0-9]+$/u.test(value);
}

function collectKeywordSignals(section: DesignContractSection, text: string): AnchorSignal[] {
  const sanitized = text.replace(/`[^`]+`/gu, ' ');
  const matches = sanitized.match(/[A-Za-z][A-Za-z0-9_-]{2,}/gu) ?? [];
  return uniq(matches.map((match) => match.toLowerCase()))
    .filter((match) => match.length >= 4)
    .filter((match) => !KEYWORD_STOPWORDS.has(match))
    .map((match) => ({
      section: section.id,
      matchedText: match,
      value: match,
      evidenceType: 'keyword-match',
    }));
}

function collectSectionSignals(section: DesignContractSection): AnchorSignal[] {
  const signals: AnchorSignal[] = [];

  for (const line of section.content) {
    const codeSpans = collectCodeSpans(line);
    const pathAnchors = uniq([...collectPathAnchors(line), ...codeSpans.filter(looksLikeModuleAnchor)]);

    for (const pathAnchor of pathAnchors) {
      const evidenceType = /\.[A-Za-z0-9]+$/u.test(pathAnchor) ? 'path-anchor' : 'module-anchor';
      signals.push({
        section: section.id,
        matchedText: pathAnchor,
        value: pathAnchor,
        evidenceType,
      });
    }

    for (const codeSpan of codeSpans.filter(looksLikeIdentifier)) {
      signals.push({
        section: section.id,
        matchedText: codeSpan,
        value: codeSpan,
        evidenceType: 'symbol-anchor',
      });
    }

    if (pathAnchors.length === 0 && codeSpans.length === 0) {
      signals.push(...collectKeywordSignals(section, line));
    }
  }

  return signals;
}

function toMappingDiagnostic(diagnostic: DesignContractDiagnostic): DesignMappingDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    blocker: diagnostic.severity === 'error',
    message: diagnostic.message,
    section: diagnostic.section,
    suggestion: diagnostic.suggestion,
  };
}

function createMappingDiagnostic(
  code: DesignMappingDiagnosticCode,
  message: string,
  options: Partial<DesignMappingDiagnostic> = {},
): DesignMappingDiagnostic {
  return {
    code,
    severity: options.severity ?? 'error',
    blocker: options.blocker ?? true,
    message,
    section: options.section,
    suggestion: options.suggestion,
    candidatePaths: options.candidatePaths,
  };
}

function createSummary(
  candidates: readonly DesignMappingCandidate[],
  diagnostics: readonly DesignMappingDiagnostic[],
): DesignMappingSummary {
  const blocked = diagnostics.some((diagnostic) => diagnostic.blocker);
  const unknownCount = candidates.reduce((total, candidate) => total + candidate.unknowns.length, 0);

  return {
    candidateCount: candidates.length,
    blocked,
    unknownCount,
    diagnosticCount: diagnostics.length,
  };
}

function defaultConfidence(reasons: readonly DesignMappingReason[]): DesignMappingCandidate['confidence'] {
  const baseScore = reasons.reduce((score, reason) => {
    if (reason.evidenceType === 'path-anchor') {
      return Math.max(score, 0.92);
    }

    if (reason.evidenceType === 'module-anchor') {
      return Math.max(score, 0.82);
    }

    if (reason.evidenceType === 'symbol-anchor') {
      return Math.max(score, 0.86);
    }

    if (reason.evidenceType === 'analyze-find') {
      return Math.max(score, 0.55);
    }

    return Math.max(score, 0.45);
  }, 0.35);
  const reasonBonus = Math.min(0.15, Math.max(0, reasons.length - 1) * 0.05);
  const score = Math.min(0.97, Math.round((baseScore + reasonBonus) * 100) / 100);

  return {
    score,
    level: calculateConfidenceLevel(score),
  };
}

function createCandidate(
  kind: DesignMappingCandidate['kind'],
  relativePath: string,
  reason: DesignMappingReason,
  absolutePath: string | undefined,
  moduleName?: string,
  symbolName?: string,
): CandidateDraft {
  return {
    kind,
    path: relativePath,
    moduleName,
    symbolName,
    reasons: [reason],
    dependencies: [],
    testImpact: [],
    risk: HIGH_RISK_PATHS.has(relativePath) ? 'high' : 'low',
    confidence: defaultConfidence([reason]),
    unknowns: [],
    absolutePath,
  };
}

function mergeReason(
  existing: CandidateDraft,
  reason: DesignMappingReason,
): CandidateDraft {
  const hasReason = existing.reasons.some(
    (item) =>
      item.section === reason.section &&
      item.matchedText === reason.matchedText &&
      item.evidenceType === reason.evidenceType,
  );

  if (!hasReason) {
    existing.reasons.push(reason);
    existing.confidence = defaultConfidence(existing.reasons);
  }

  return existing;
}

function candidateKey(candidate: {
  kind: DesignMappingCandidate['kind'];
  path: string;
  moduleName?: string;
  symbolName?: string;
}): string {
  return [candidate.kind, candidate.path, candidate.moduleName ?? '', candidate.symbolName ?? ''].join('::');
}

function addCandidate(
  candidates: Map<string, CandidateDraft>,
  candidate: CandidateDraft,
): void {
  const key = candidateKey(candidate);
  const existing = candidates.get(key);

  if (!existing) {
    candidates.set(key, candidate);
    return;
  }

  for (const reason of candidate.reasons) {
    mergeReason(existing, reason);
  }
}

function loadCodeMapSnapshot(rootDir: string): CodeMap | null {
  if (codeMapSnapshotCache.has(rootDir)) {
    return codeMapSnapshotCache.get(rootDir) ?? null;
  }

  const dataPath = resolveDataPath(rootDir);

  if (!existsSync(dataPath)) {
    codeMapSnapshotCache.set(rootDir, null);
    return null;
  }

  try {
    const snapshot = JSON.parse(readFileSync(dataPath, 'utf8')) as CodeMap;
    codeMapSnapshotCache.set(rootDir, snapshot);
    return snapshot;
  } catch {
    codeMapSnapshotCache.set(rootDir, null);
    return null;
  }
}

function discoverModuleCandidates(anchor: string, rootDir: string): string[] {
  const normalizedAnchor = normalizeSlashes(anchor).replace(/^\.\//u, '');
  const absoluteBase = path.isAbsolute(normalizedAnchor)
    ? normalizeSlashes(normalizedAnchor)
    : normalizeSlashes(path.join(rootDir, normalizedAnchor));
  const candidates = EXTENSIONS.map((extension) => `${absoluteBase}${extension}`);
  candidates.push(...EXTENSIONS.map((extension) => normalizeSlashes(path.join(absoluteBase, `index${extension}`))));

  return candidates.filter((candidate) => existsSync(candidate));
}

function buildPathReason(signal: AnchorSignal): DesignMappingReason {
  return {
    section: signal.section,
    matchedText: signal.matchedText,
    evidenceType: signal.evidenceType,
  };
}

function resolveExactPathSignals(
  candidates: Map<string, CandidateDraft>,
  signals: readonly AnchorSignal[],
  rootDir: string,
): void {
  for (const signal of signals.filter((item) => item.evidenceType === 'path-anchor')) {
    for (const absolutePath of discoverModuleCandidates(signal.value, rootDir).concat(
      existsSync(toAbsolutePath(signal.value, rootDir)) ? [toAbsolutePath(signal.value, rootDir)] : [],
    )) {
      const relativePath = toRelativePath(absolutePath, rootDir);
      addCandidate(
        candidates,
        createCandidate('file', relativePath, buildPathReason(signal), absolutePath),
      );
    }
  }
}

function resolveExactModuleSignals(
  candidates: Map<string, CandidateDraft>,
  signals: readonly AnchorSignal[],
  rootDir: string,
  codeMap: CodeMap | null,
): void {
  for (const signal of signals.filter((item) => item.evidenceType === 'module-anchor')) {
    const exactMatches = discoverModuleCandidates(signal.value, rootDir);

    for (const absolutePath of exactMatches) {
      const relativePath = toRelativePath(absolutePath, rootDir);
      addCandidate(
        candidates,
        createCandidate(
          'module',
          relativePath,
          buildPathReason(signal),
          absolutePath,
          stripKnownExtension(relativePath),
        ),
      );
    }

    if (!codeMap) {
      continue;
    }

    for (const module of codeMap.modules) {
      const relativePath = toRelativePath(module.absolutePath || module.path, rootDir);
      const moduleName = stripKnownExtension(relativePath);
      const matched = moduleName === signal.value || moduleName.endsWith(`/${signal.value}`);

      if (matched) {
        addCandidate(
          candidates,
          createCandidate('module', relativePath, buildPathReason(signal), module.absolutePath, moduleName),
        );
      }
    }
  }
}

async function discoverSourceFiles(rootDir: string): Promise<string[]> {
  const files = await globby(SOURCE_GLOBS, {
    cwd: rootDir,
    absolute: true,
    gitignore: true,
    ignore: SOURCE_IGNORE,
  });

  return files.filter((filePath) => !isTestLikePath(toRelativePath(filePath, rootDir)));
}

function indexedPathsFrom(codeMap: CodeMap | null, rootDir: string): Set<string> {
  if (!codeMap) {
    return new Set<string>();
  }

  return new Set(
    codeMap.modules
      .map((module) => toRelativePath(module.absolutePath || module.path, rootDir))
      .filter((filePath) => !isTestLikePath(filePath)),
  );
}

async function buildSourceSnapshot(rootDir: string, codeMap: CodeMap | null): Promise<SourceSnapshot> {
  const cachedSnapshot = sourceSnapshotCache.get(rootDir);
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const snapshotPromise = (async () => {
    const files = await discoverSourceFiles(rootDir);
    const testFiles = await globby(TEST_GLOBS, {
      cwd: rootDir,
      absolute: true,
      gitignore: true,
      ignore: SOURCE_IGNORE,
    });
    const entries = await Promise.all(
      files.map(async (filePath) => [filePath, await readFile(filePath, 'utf8')] as const),
    );

    return {
      files,
      contents: new Map(entries),
      indexedPaths: indexedPathsFrom(codeMap, rootDir),
      testFiles,
    };
  })();

  sourceSnapshotCache.set(rootDir, snapshotPromise);

  try {
    return await snapshotPromise;
  } catch (error) {
    sourceSnapshotCache.delete(rootDir);
    throw error;
  }
}

async function resolveSymbolSignals(
  candidates: Map<string, CandidateDraft>,
  signals: readonly AnchorSignal[],
  rootDir: string,
  codeMap: CodeMap | null,
  sourceSnapshot: SourceSnapshot,
): Promise<void> {
  for (const signal of signals.filter((item) => item.evidenceType === 'symbol-anchor')) {
    const matchedFiles = new Set<string>();

    if (codeMap) {
      for (const module of codeMap.modules) {
        const relativePath = toRelativePath(module.absolutePath || module.path, rootDir);
        if (isTestLikePath(relativePath)) {
          continue;
        }

        if (module.symbols.some((symbol) => symbol.name === signal.value)) {
          matchedFiles.add(module.absolutePath || module.path);
        }
      }
    }

    const declarationPattern = new RegExp(
      `\\b(?:function|class|interface|type|enum|const|let|var)\\s+${escapeRegExp(signal.value)}\\b`,
      'u',
    );
    const identifierPattern = new RegExp(`\\b${escapeRegExp(signal.value)}\\b`, 'u');

    for (const sourceFile of sourceSnapshot.files) {
      const content = sourceSnapshot.contents.get(sourceFile) ?? '';
      if (declarationPattern.test(content) || identifierPattern.test(content)) {
        matchedFiles.add(sourceFile);
      }
    }

    for (const matchedFile of Array.from(matchedFiles).slice(0, FIND_RESULTS_PER_KEYWORD)) {
      const relativePath = toRelativePath(matchedFile, rootDir);
      addCandidate(
        candidates,
        createCandidate(
          'symbol',
          relativePath,
          buildPathReason(signal),
          matchedFile,
          stripKnownExtension(relativePath),
          signal.value,
        ),
      );
    }
  }
}

function normalizeAnalyzePaths(output: CodemapOutput, rootDir: string): string[] {
  return uniq(
    output.results
      .map((result) => result.file)
      .filter((result): result is string => typeof result === 'string' && result.length > 0)
      .map((result) => toRelativePath(result, rootDir)),
  );
}

async function runAnalyzeFind(keyword: string): Promise<CodemapOutput | null> {
  try {
    const command = new AnalyzeCommand({
      intent: 'find',
      keywords: [keyword],
      includeTests: false,
      json: true,
      structured: true,
    });
    const output = await command.execute();
    return typeof output === 'object' && output !== null && 'results' in output
      ? output as CodemapOutput
      : null;
  } catch {
    return null;
  }
}

async function fallbackKeywordPaths(
  keyword: string,
  rootDir: string,
  sourceSnapshot: SourceSnapshot,
): Promise<string[]> {
  const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'iu');
  const matches: string[] = [];

  for (const sourceFile of sourceSnapshot.files) {
    const relativePath = toRelativePath(sourceFile, rootDir);
    if (relativePath.toLowerCase().includes(keyword.toLowerCase())) {
      matches.push(relativePath);
      continue;
    }

    const content = sourceSnapshot.contents.get(sourceFile) ?? '';
    if (pattern.test(content)) {
      matches.push(relativePath);
    }
  }

  return uniq(matches).slice(0, FIND_RESULTS_PER_KEYWORD);
}

async function resolveKeywordSignals(
  candidates: Map<string, CandidateDraft>,
  signals: readonly AnchorSignal[],
  rootDir: string,
  sourceSnapshot: SourceSnapshot,
): Promise<void> {
  if (candidates.size > 0) {
    return;
  }

  for (const signal of signals.slice(0, FIND_KEYWORD_LIMIT)) {
    const fallbackPaths = await fallbackKeywordPaths(signal.value, rootDir, sourceSnapshot);
    const analyzeOutput = fallbackPaths.length > 0 ? null : await runAnalyzeFind(signal.value);
    const matchedPaths = analyzeOutput ? normalizeAnalyzePaths(analyzeOutput, rootDir) : [];
    const paths = matchedPaths.length > 0 ? matchedPaths : fallbackPaths;

    for (const relativePath of paths) {
      const absolutePath = toAbsolutePath(relativePath, rootDir);
      addCandidate(
        candidates,
        createCandidate(
          'file',
          relativePath,
          {
            section: signal.section,
            matchedText: signal.matchedText,
            evidenceType: matchedPaths.length > 0 ? 'analyze-find' : 'keyword-match',
          },
          absolutePath,
        ),
      );
    }
  }
}

function matchesNegativeSignal(candidate: CandidateDraft, signal: AnchorSignal): boolean {
  const haystacks = [
    candidate.path,
    candidate.moduleName ?? '',
    candidate.symbolName ?? '',
  ].map((item) => item.toLowerCase());
  const needle = signal.value.toLowerCase();

  return haystacks.some((item) => item.includes(needle));
}

function applyNegativeFiltering(
  candidates: readonly CandidateDraft[],
  negativeSignals: readonly AnchorSignal[],
): CandidateDraft[] {
  return candidates.filter(
    (candidate) => !negativeSignals.some((signal) => matchesNegativeSignal(candidate, signal)),
  );
}

async function readEnrichment(candidate: CandidateDraft): Promise<CodemapOutput | null> {
  try {
    const command = new AnalyzeCommand({
      intent: 'read',
      targets: [candidate.path],
      includeTests: true,
      json: true,
      structured: true,
    });
    const output = await command.execute();
    return typeof output === 'object' && output !== null && 'results' in output
      ? output as CodemapOutput
      : null;
  } catch {
    return null;
  }
}

async function linkEnrichment(candidate: CandidateDraft): Promise<CodemapOutput | null> {
  try {
    const command = new AnalyzeCommand({
      intent: 'link',
      targets: [candidate.path],
      includeTests: true,
      json: true,
      structured: true,
    });
    const output = await command.execute();
    return typeof output === 'object' && output !== null && 'results' in output
      ? output as CodemapOutput
      : null;
  } catch {
    return null;
  }
}

function resolveImportTarget(
  importerPath: string,
  importPath: string,
  rootDir: string,
): string | null {
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return null;
  }

  const absoluteBase = normalizeSlashes(path.resolve(path.dirname(importerPath), importPath));
  const possiblePaths = [
    absoluteBase,
    ...EXTENSIONS.map((extension) => `${absoluteBase}${extension}`),
    ...EXTENSIONS.map((extension) => normalizeSlashes(path.join(absoluteBase, `index${extension}`))),
  ];
  const existingPath = possiblePaths.find((candidate) => existsSync(candidate));

  return existingPath ? toRelativePath(existingPath, rootDir) : null;
}

function localDependencies(
  candidate: CandidateDraft,
  rootDir: string,
  sourceSnapshot: SourceSnapshot,
  codeMap: CodeMap | null,
): string[] {
  if (!candidate.absolutePath) {
    return [];
  }

  const content = sourceSnapshot.contents.get(candidate.absolutePath) ?? '';
  const imports = Array.from(content.matchAll(/(?:import|export)\s+[^'"]*from\s+['"](.+?)['"]/gu))
    .map((match) => match[1] ?? '')
    .map((match) => resolveImportTarget(candidate.absolutePath!, match, rootDir))
    .filter((match): match is string => typeof match === 'string' && match.length > 0);
  const bareImports = Array.from(content.matchAll(/import\s+['"](.+?)['"]/gu))
    .map((match) => match[1] ?? '')
    .map((match) => resolveImportTarget(candidate.absolutePath!, match, rootDir))
    .filter((match): match is string => typeof match === 'string' && match.length > 0);
  const dependents = !codeMap
    ? []
    : codeMap.modules
      .filter((module) =>
        module.dependencies.some((dependency) =>
          resolveImportTarget(module.absolutePath || module.path, dependency, rootDir) === candidate.path))
      .map((module) => toRelativePath(module.absolutePath || module.path, rootDir));

  return uniq([...imports, ...bareImports, ...dependents]).filter((item) => item !== candidate.path);
}

function localRisk(
  candidate: CandidateDraft,
  dependencies: readonly string[],
): DesignMappingCandidate['risk'] {
  if (HIGH_RISK_PATHS.has(candidate.path)) {
    return 'high';
  }

  if (dependencies.length > 8) {
    return 'high';
  }

  if (dependencies.length > 3) {
    return 'medium';
  }

  return candidate.risk;
}

function mergeDependencies(
  candidate: CandidateDraft,
  readOutput: CodemapOutput | null,
  linkOutput: CodemapOutput | null,
  rootDir: string,
  fallbackDependencies: readonly string[],
): string[] {
  const fromRead = readOutput?.results
    .find((result) => toRelativePath(result.file, rootDir) === candidate.path)
    ?.metadata?.dependencies ?? [];
  const fromLinkAnalysis = linkOutput?.analysis && 'dependency' in linkOutput.analysis
    ? (linkOutput.analysis.dependency ?? []).flatMap((item) => [...item.imports, ...item.importedBy])
    : [];
  const fromLinkMetadata = linkOutput?.results
    .find((result) => toRelativePath(result.file, rootDir) === candidate.path)
    ?.metadata?.dependencies ?? [];

  return uniq(
    [...fallbackDependencies, ...fromRead, ...fromLinkAnalysis, ...fromLinkMetadata]
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .map((item) => toRelativePath(item, rootDir)),
  ).filter((item) => item !== candidate.path);
}

function resolveRisk(
  candidate: CandidateDraft,
  readOutput: CodemapOutput | null,
  rootDir: string,
  fallbackRisk: DesignMappingCandidate['risk'],
): DesignMappingCandidate['risk'] {
  if (HIGH_RISK_PATHS.has(candidate.path)) {
    return 'high';
  }

  const fromAnalysis = readOutput?.analysis && 'impact' in readOutput.analysis
    ? (readOutput.analysis.impact ?? []).find((item) => toRelativePath(item.file, rootDir) === candidate.path)?.risk
    : undefined;
  const fromMetadata = readOutput?.results
    .find((result) => toRelativePath(result.file, rootDir) === candidate.path)
    ?.metadata?.riskLevel;

  return fromAnalysis ?? fromMetadata ?? fallbackRisk;
}

function resolveConfidence(
  candidate: CandidateDraft,
  readOutput: CodemapOutput | null,
  linkOutput: CodemapOutput | null,
): DesignMappingCandidate['confidence'] {
  const scores = [candidate.confidence.score];

  if (readOutput?.confidence?.score) {
    scores.push(readOutput.confidence.score);
  }

  if (linkOutput?.confidence?.score) {
    scores.push(linkOutput.confidence.score);
  }

  const score = Math.max(...scores);
  return {
    score,
    level: calculateConfidenceLevel(score),
  };
}

function localTestImpact(
  candidate: CandidateDraft,
  rootDir: string,
  sourceSnapshot: SourceSnapshot,
): string[] {
  const rawBase = path.basename(stripKnownExtension(candidate.path)).toLowerCase();
  const kebabBase = rawBase.replace(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
  const needles = uniq([rawBase, kebabBase]);

  return sourceSnapshot.testFiles
    .map((filePath) => toRelativePath(filePath, rootDir))
    .filter((filePath) => {
      const fileName = path.basename(filePath).toLowerCase();
      return needles.some((needle) =>
        fileName === `${needle}.test.ts` ||
        fileName === `${needle}.spec.ts` ||
        fileName.includes(`${needle}.test`) ||
        fileName.includes(`${needle}.spec`) ||
        fileName.includes(`${needle}-`) ||
        fileName.includes(`${needle}_`));
    });
}

async function resolveTestImpact(
  candidate: CandidateDraft,
  rootDir: string,
  sourceSnapshot: SourceSnapshot,
): Promise<string[]> {
  const localMatches = localTestImpact(candidate, rootDir, sourceSnapshot);
  if (localMatches.length > 0 || !sourceSnapshot.indexedPaths.has(candidate.path)) {
    return uniq(localMatches);
  }

  const direct = await resolveTestFile(candidate.path);
  const mappings = await resolveTestFiles([candidate.path]);
  const mappedTests = mappings
    .map((mapping) => mapping.testFile)
    .filter((item): item is string => typeof item === 'string' && item.length > 0);

  return uniq([
    ...localMatches,
    ...[direct, ...mappedTests].filter((item): item is string => typeof item === 'string'),
  ]);
}

function detectPartialImplementation(
  candidate: CandidateDraft,
  sourceSnapshot: SourceSnapshot,
): boolean {
  if (!candidate.absolutePath) {
    return false;
  }

  const content = sourceSnapshot.contents.get(candidate.absolutePath) ?? '';
  return /TODO-DEBT|throw new Error\(|Not implemented|stub/iu.test(content);
}

function synthesizeUnknowns(
  candidate: CandidateDraft,
  testImpact: readonly string[],
  hasOpenQuestions: boolean,
  sourceSnapshot: SourceSnapshot,
): string[] {
  const unknowns: string[] = [];

  if (testImpact.length === 0) {
    unknowns.push(`未找到与 ${candidate.path} 对应的测试文件`);
  }

  if (candidate.confidence.level === 'low') {
    unknowns.push(`候选 ${candidate.path} 置信度偏低，建议补充更明确的 design anchors`);
  }

  if (hasOpenQuestions) {
    unknowns.push('design contract 仍包含 Open Questions，需要人工确认');
  }

  if (detectPartialImplementation(candidate, sourceSnapshot)) {
    unknowns.push(`候选 ${candidate.path} 可能仍处于 partial/stubbed implementation 状态`);
  }

  return uniq(unknowns);
}

function hasWeakEvidence(candidate: CandidateDraft): boolean {
  return candidate.reasons.some(
    (reason) => reason.evidenceType === 'keyword-match' || reason.evidenceType === 'analyze-find',
  );
}

async function enrichCandidate(
  candidate: CandidateDraft,
  rootDir: string,
  hasOpenQuestions: boolean,
  sourceSnapshot: SourceSnapshot,
  codeMap: CodeMap | null,
): Promise<CandidateDraft> {
  const fallbackDependencies = localDependencies(candidate, rootDir, sourceSnapshot, codeMap);
  const fallbackRisk = localRisk(candidate, fallbackDependencies);
  const shouldRunAnalyze = sourceSnapshot.indexedPaths.has(candidate.path) && hasWeakEvidence(candidate);
  const [readOutput, linkOutput, testImpact] = await Promise.all([
    shouldRunAnalyze ? readEnrichment(candidate) : Promise.resolve(null),
    shouldRunAnalyze ? linkEnrichment(candidate) : Promise.resolve(null),
    resolveTestImpact(candidate, rootDir, sourceSnapshot),
  ]);
  const confidence = shouldRunAnalyze
    ? resolveConfidence(candidate, readOutput, linkOutput)
    : candidate.confidence;
  const enriched: EnrichmentData = {
    dependencies: shouldRunAnalyze
      ? mergeDependencies(candidate, readOutput, linkOutput, rootDir, fallbackDependencies)
      : fallbackDependencies,
    risk: shouldRunAnalyze
      ? resolveRisk(candidate, readOutput, rootDir, fallbackRisk)
      : fallbackRisk,
    confidence,
    testImpact,
    unknowns: synthesizeUnknowns({ ...candidate, confidence }, testImpact, hasOpenQuestions, sourceSnapshot),
  };

  return {
    ...candidate,
    dependencies: enriched.dependencies,
    risk: enriched.risk,
    confidence: enriched.confidence,
    testImpact: enriched.testImpact,
    unknowns: enriched.unknowns,
  };
}

async function enrichCandidates(
  candidates: readonly CandidateDraft[],
  rootDir: string,
  hasOpenQuestions: boolean,
  sourceSnapshot: SourceSnapshot,
  codeMap: CodeMap | null,
): Promise<CandidateDraft[]> {
  const enriched: CandidateDraft[] = [];

  for (const candidate of candidates) {
    enriched.push(await enrichCandidate(candidate, rootDir, hasOpenQuestions, sourceSnapshot, codeMap));
  }

  return enriched;
}

function subsystemOf(candidatePath: string): string {
  const parts = candidatePath.split('/');
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return candidatePath;
}

function buildScopeDiagnostics(candidates: readonly CandidateDraft[]): DesignMappingDiagnostic[] {
  const uniquePaths = uniq(candidates.map((candidate) => candidate.path));
  const diagnostics: DesignMappingDiagnostic[] = [];

  if (uniquePaths.length === 0) {
    diagnostics.push(
      createMappingDiagnostic(
        'no-candidates',
        '未能从当前 design contract 中解析出可信的候选范围；请补充更明确的路径、模块或符号 anchors。',
        { candidatePaths: [] },
      ),
    );
    return diagnostics;
  }

  const highRiskMatches = uniquePaths.filter((candidatePath) => HIGH_RISK_PATHS.has(candidatePath));
  if (highRiskMatches.length > 0) {
    diagnostics.push(
      createMappingDiagnostic(
        'high-risk-scope',
        '候选范围命中了高 blast-radius 文件；请先补充更具体的 design scope，再继续执行。',
        { candidatePaths: highRiskMatches },
      ),
    );
  }

  const subsystemCount = new Set(uniquePaths.map((candidatePath) => subsystemOf(candidatePath))).size;
  const hasBroadEvidence = candidates.some((candidate) =>
    candidate.reasons.some((reason) => reason.evidenceType === 'keyword-match' || reason.evidenceType === 'analyze-find'));

  if (uniquePaths.length > OVER_BROAD_PATH_LIMIT || (hasBroadEvidence && subsystemCount > OVER_BROAD_SUBSYSTEM_LIMIT)) {
    diagnostics.push(
      createMappingDiagnostic(
        'over-broad-scope',
        '当前 design contract 解析出的候选范围过宽，已跨越多个子系统；请补充更具体的路径、模块或符号 anchors。',
        { candidatePaths: uniquePaths },
      ),
    );
  }

  return diagnostics;
}

function sortCandidates(candidates: readonly CandidateDraft[]): CandidateDraft[] {
  const kindOrder: Record<DesignMappingCandidate['kind'], number> = {
    file: 0,
    module: 1,
    symbol: 2,
  };

  return [...candidates].sort((left, right) => {
    if (left.path !== right.path) {
      return left.path.localeCompare(right.path);
    }

    return kindOrder[left.kind] - kindOrder[right.kind];
  });
}

function positiveSignalsFrom(contractSections: Partial<Record<DesignContractSectionId, DesignContractSection>>): AnchorSignal[] {
  return POSITIVE_SECTION_IDS.flatMap((sectionId) => {
    const section = contractSections[sectionId];
    return section ? collectSectionSignals(section) : [];
  });
}

function negativeSignalsFrom(contractSections: Partial<Record<DesignContractSectionId, DesignContractSection>>): AnchorSignal[] {
  const section = contractSections.nonGoals;
  return section ? collectSectionSignals(section) : [];
}

function toResult(
  filePath: string,
  candidates: readonly CandidateDraft[],
  diagnostics: readonly DesignMappingDiagnostic[],
): DesignMappingResult {
  const summary = createSummary(candidates, diagnostics);
  return {
    ok: !summary.blocked,
    filePath,
    summary,
    candidates: sortCandidates(candidates),
    diagnostics: [...diagnostics],
  };
}

export async function resolveDesignScope(
  options: ResolveDesignScopeOptions = {},
): Promise<DesignMappingResult> {
  const rootDir = options.rootDir ?? cwd();
  const loadedContract = await loadDesignContract({
    filePath: options.filePath,
    rootDir,
  });
  const cacheKey = `${rootDir}::${loadedContract.filePath}`;
  const cachedResult = designScopeResultCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const resultPromise = (async () => {
  const baseDiagnostics = loadedContract.diagnostics.map(toMappingDiagnostic);

  if (!loadedContract.ok) {
    return toResult(loadedContract.filePath, [], baseDiagnostics);
  }

  const codeMap = loadCodeMapSnapshot(rootDir);
  const sourceSnapshot = await buildSourceSnapshot(rootDir, codeMap);
  const positiveSignals = positiveSignalsFrom(loadedContract.contract.sections);
  const negativeSignals = negativeSignalsFrom(loadedContract.contract.sections);
  const keywordSignals = positiveSignals.filter((signal) => signal.evidenceType === 'keyword-match');
  const candidates = new Map<string, CandidateDraft>();

  resolveExactPathSignals(candidates, positiveSignals, rootDir);
  resolveExactModuleSignals(candidates, positiveSignals, rootDir, codeMap);
  await resolveSymbolSignals(candidates, positiveSignals, rootDir, codeMap, sourceSnapshot);
  await resolveKeywordSignals(candidates, keywordSignals, rootDir, sourceSnapshot);

  const filteredCandidates = applyNegativeFiltering(Array.from(candidates.values()), negativeSignals);
  const earlyDiagnostics = buildScopeDiagnostics(filteredCandidates);

  if (earlyDiagnostics.some((diagnostic) => diagnostic.blocker)) {
    return toResult(
      loadedContract.filePath,
      filteredCandidates,
      [...baseDiagnostics, ...earlyDiagnostics],
    );
  }

  const enrichedCandidates = await enrichCandidates(
    filteredCandidates,
    rootDir,
    Boolean(loadedContract.contract.sections.openQuestions),
    sourceSnapshot,
    codeMap,
  );
  const scopeDiagnostics = buildScopeDiagnostics(enrichedCandidates);

    return toResult(
      loadedContract.filePath,
      enrichedCandidates,
      [...baseDiagnostics, ...scopeDiagnostics],
    );
  })();

  designScopeResultCache.set(cacheKey, resultPromise);

  try {
    return await resultPromise;
  } catch (error) {
    designScopeResultCache.delete(cacheKey);
    throw error;
  }
}
