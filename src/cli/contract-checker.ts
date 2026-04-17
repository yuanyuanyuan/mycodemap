// [META] since:2026-04-15 | owner:cli-team | stable:false
// [WHY] Execute design contract rules against source code and return one canonical check result for CLI and CI consumers

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { cruise } from 'dependency-cruiser';
import type { ICruiseResult, IFlattenedRuleSet, IViolation } from 'dependency-cruiser';
import ts from 'typescript';
import type {
  ContractCheckHistoryMetadata,
  ContractCheckResult,
  ContractCheckSummary,
  ContractCheckWarning,
  ContractScanMode,
  ContractViolation,
  ContractViolationDiagnostic,
  ContractViolationDiagnosticCategory,
  ContractViolationRisk,
  DesignContractRule,
  DesignContractRuleSeverity,
  DesignContractRuleType,
  ModulePublicApiOnlyRule,
} from '../interface/types/index.js';
import type { ComplexityThresholdRule } from '../interface/types/design-contract.js';
import type { FileHistoryAnalysisResult, FileHistorySignal } from '../interface/types/history-risk.js';
import { GitHistoryService } from '../orchestrator/history-risk-service.js';
import { analyzeFileComplexity } from '../core/ast-complexity-analyzer.js';
import { loadDesignContract } from './design-contract-loader.js';
import { CONFIG_FILE_NEW, CONFIG_FILE_OLD } from './paths.js';
import { createConfiguredStorage } from './storage-runtime.js';

export interface DependencyCruiserRuleMetadata {
  originalName: string;
  ruleType: Extract<DesignContractRuleType, 'layer_direction' | 'forbidden_imports'>;
  severity: DesignContractRuleSeverity;
}

export interface RunContractCheckOptions {
  contractPath: string;
  againstPath: string;
  rootDir?: string;
  scanMode?: ContractScanMode;
  changedFiles?: string[];
  warnings?: ContractCheckWarning[];
  historyRiskService?: Pick<GitHistoryService, 'analyzeFiles'>;
}

export interface ContractCheckPaths {
  rootDir: string;
  againstAbsolutePath: string;
  projectRoot: string;
  againstProjectPath: string;
  cruiseStartPath: string;
}

export interface DependencyCruiserRuleSet {
  metadataByGeneratedName: Map<string, DependencyCruiserRuleMetadata>;
  ruleSet?: IFlattenedRuleSet;
}

interface ComplexityEvaluationResult {
  violations: ContractViolation[];
  warnings: ContractCheckWarning[];
}

const CONTRACT_CHECK_EXCLUDE_PATHS = [
  '(^|/)__tests__(/|$)',
  '\\.(?:test|spec)\\.[cm]?[jt]sx?$',
];

interface ResolvedImportLocation {
  rawSpecifier: string;
  resolvedPath: string | null;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

const compilerOptionsCache = new Map<string, ts.CompilerOptions>();
const importLocationCache = new Map<string, ResolvedImportLocation[]>();

function createHistoryRiskBlock(signal: FileHistorySignal): ContractViolationRisk {
  return {
    status: signal.diagnostics.status,
    level: signal.risk.level,
    confidence: signal.diagnostics.confidence,
    freshness: signal.diagnostics.freshness,
    score: signal.risk.score,
    factors: signal.risk.riskFactors,
    analyzed_at: signal.diagnostics.analyzedAt,
  };
}

function summarizeHistoryEnrichment(result: FileHistoryAnalysisResult): ContractCheckHistoryMetadata {
  const unavailableCount = result.files.filter((signal) => signal.risk.level === 'unavailable').length;
  const staleCount = result.files.filter((signal) => signal.diagnostics.freshness === 'stale').length;
  const lowConfidenceCount = result.files.filter(
    (signal) => signal.diagnostics.confidence === 'low' || signal.diagnostics.confidence === 'unavailable'
  ).length;

  return {
    status: result.diagnostics.status,
    confidence: result.diagnostics.confidence,
    freshness: result.diagnostics.freshness,
    scope_mode: result.diagnostics.scopeMode,
    enriched_file_count: result.files.length,
    unavailable_count: unavailableCount,
    stale_count: staleCount,
    low_confidence_count: lowConfidenceCount,
    requires_precompute: result.diagnostics.requiresPrecompute,
  };
}

function createHistoryWarnings(result: FileHistoryAnalysisResult): ContractCheckWarning[] {
  const warnings: ContractCheckWarning[] = [];

  if (result.diagnostics.requiresPrecompute) {
    warnings.push({
      code: 'history-risk-precompute-recommended',
      message: 'history risk 查询范围已收缩，建议预计算或缩小扫描范围',
      details: {
        requested_files: result.diagnostics.requestedFiles,
        analyzed_files: result.diagnostics.analyzedFiles,
      },
    });
  }

  if (result.files.some((signal) => signal.risk.level === 'unavailable')) {
    warnings.push({
      code: 'history-risk-unavailable',
      message: '部分违规文件缺少可用的 history risk 信号',
      details: {
        unavailable_count: result.files.filter((signal) => signal.risk.level === 'unavailable').length,
      },
    });
  }

  if (result.files.some((signal) => signal.diagnostics.freshness === 'stale')) {
    warnings.push({
      code: 'history-risk-stale',
      message: '部分 history risk 信号已过期，需要重新 materialize',
      details: {
        stale_count: result.files.filter((signal) => signal.diagnostics.freshness === 'stale').length,
      },
    });
  }

  return warnings;
}

function enrichViolationsWithHistory(
  violations: readonly ContractViolation[],
  historyResult: FileHistoryAnalysisResult,
): ContractViolation[] {
  const historyByFile = new Map(
    historyResult.files.map((signal) => [normalizePath(signal.file), signal] as const),
  );

  return violations.map((violation) => {
    const signal = historyByFile.get(normalizePath(violation.location));
    if (!signal) {
      return violation;
    }

    return {
      ...violation,
      risk: createHistoryRiskBlock(signal),
    };
  });
}

function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/gu, '/');
}

function normalizeResolvedModuleKey(filePath: string): string {
  return normalizePath(filePath)
    .replace(/\.(?:d\.)?[cm]?[jt]sx?$/u, '')
    .replace(/\/index$/u, '');
}

function createViolationDiagnostic(
  file: string | undefined,
  category: ContractViolationDiagnosticCategory,
  source: ContractViolationDiagnostic['source'],
  location?: Omit<ContractViolationDiagnostic, 'file' | 'category' | 'source' | 'degraded'>,
): ContractViolationDiagnostic {
  const scope = location?.scope ?? 'file';
  return {
    file,
    line: location?.line,
    column: location?.column,
    endLine: location?.endLine,
    endColumn: location?.endColumn,
    scope,
    source,
    category,
    degraded: scope !== 'line',
  };
}

function getDiagnosticCategory(
  ruleType: DesignContractRuleType,
): ContractViolationDiagnosticCategory {
  if (ruleType === 'module_public_api_only') {
    return 'module_boundary';
  }

  if (ruleType === 'complexity_threshold') {
    return 'complexity';
  }

  return 'dependency';
}

function getContractCheckerCompilerOptions(projectRoot: string): ts.CompilerOptions {
  const cachedOptions = compilerOptionsCache.get(projectRoot);
  if (cachedOptions) {
    return cachedOptions;
  }

  const fallbackOptions: ts.CompilerOptions = {
    allowJs: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
  };
  const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists);
  if (!configPath) {
    compilerOptionsCache.set(projectRoot, fallbackOptions);
    return fallbackOptions;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    compilerOptionsCache.set(projectRoot, fallbackOptions);
    return fallbackOptions;
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );
  const compilerOptions = {
    ...fallbackOptions,
    ...parsedConfig.options,
  };
  compilerOptionsCache.set(projectRoot, compilerOptions);
  return compilerOptions;
}

function getImportLocations(fromAbsolutePath: string, projectRoot: string): ResolvedImportLocation[] {
  const cachedLocations = importLocationCache.get(fromAbsolutePath);
  if (cachedLocations) {
    return cachedLocations;
  }

  const sourceText = readFileSync(fromAbsolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    path.basename(fromAbsolutePath),
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const locations: ResolvedImportLocation[] = [];
  const compilerOptions = getContractCheckerCompilerOptions(projectRoot);

  const addLocation = (node: ts.ImportDeclaration | ts.ExportDeclaration): void => {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
      return;
    }

    const rawSpecifier = node.moduleSpecifier.text;
    const resolvedModule = ts.resolveModuleName(
      rawSpecifier,
      fromAbsolutePath,
      compilerOptions,
      ts.sys,
    ).resolvedModule;
    const start = sourceFile.getLineAndCharacterOfPosition(node.moduleSpecifier.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.moduleSpecifier.getEnd());

    locations.push({
      rawSpecifier,
      resolvedPath: resolvedModule && !resolvedModule.isExternalLibraryImport
        ? resolvedModule.resolvedFileName
        : null,
      line: start.line + 1,
      column: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
    });
  };

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addLocation(node);
    }
  });

  importLocationCache.set(fromAbsolutePath, locations);
  return locations;
}

function findViolationDiagnostic(
  fromPath: string,
  toPath: string,
  projectRoot: string,
  category: ContractViolationDiagnosticCategory,
  source: ContractViolationDiagnostic['source'],
): ContractViolationDiagnostic {
  const fromAbsolutePath = path.isAbsolute(fromPath) ? fromPath : path.join(projectRoot, fromPath);
  if (!existsSync(fromAbsolutePath)) {
    return createViolationDiagnostic(fromPath, category, source);
  }

  const targetKey = toPath.includes('/')
    ? normalizeResolvedModuleKey(path.isAbsolute(toPath) ? toPath : path.join(projectRoot, toPath))
    : undefined;
  const targetSpecifier = toPath.replace(/^node:/u, '');

  for (const location of getImportLocations(fromAbsolutePath, projectRoot)) {
    const resolvedKey = location.resolvedPath ? normalizeResolvedModuleKey(location.resolvedPath) : undefined;
    const rawSpecifier = location.rawSpecifier.replace(/^node:/u, '');
    if ((targetKey && resolvedKey === targetKey) || rawSpecifier === targetSpecifier) {
      return createViolationDiagnostic(fromPath, category, source, {
        line: location.line,
        column: location.column,
        endLine: location.endLine,
        endColumn: location.endColumn,
        scope: 'line',
      });
    }
  }

  return createViolationDiagnostic(fromPath, category, source);
}

function ensureAbsolutePath(inputPath: string, rootDir: string): string {
  return path.isAbsolute(inputPath) ? inputPath : path.join(rootDir, inputPath);
}

function isWithinDirectory(targetPath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function resolveAgainstPath(againstPath: string, rootDir: string): string {
  const absolutePath = path.resolve(ensureAbsolutePath(againstPath, rootDir));
  if (!existsSync(absolutePath)) {
    throw new Error(`--against 路径不存在: ${absolutePath}`);
  }
  if (!isWithinDirectory(absolutePath, rootDir)) {
    throw new Error(`--against 必须位于项目根目录内: ${absolutePath}`);
  }
  return absolutePath;
}

function findProjectRoot(againstAbsolutePath: string, rootDir: string): string {
  let currentPath = againstAbsolutePath;
  if (statSync(currentPath).isFile()) {
    currentPath = path.dirname(currentPath);
  }

  while (isWithinDirectory(currentPath, rootDir)) {
    if (existsSync(path.join(currentPath, 'package.json'))) {
      return currentPath;
    }
    if (normalizePath(currentPath) === normalizePath(rootDir)) {
      break;
    }
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }
    currentPath = parentPath;
  }

  return rootDir;
}

function findHistoryStorageRoot(
  againstAbsolutePath: string,
  rootDir: string,
  fallbackRoot: string,
): string {
  let currentPath = statSync(againstAbsolutePath).isFile()
    ? path.dirname(againstAbsolutePath)
    : againstAbsolutePath;

  while (isWithinDirectory(currentPath, rootDir)) {
    if (existsSync(path.join(currentPath, CONFIG_FILE_NEW)) || existsSync(path.join(currentPath, CONFIG_FILE_OLD))) {
      return currentPath;
    }

    if (normalizePath(currentPath) === normalizePath(rootDir)) {
      break;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
  }

  return fallbackRoot;
}

function toRelativeProjectPath(filePath: string, projectRoot: string): string {
  if (path.isAbsolute(filePath) && isWithinDirectory(filePath, projectRoot)) {
    return normalizePath(path.relative(projectRoot, filePath));
  }
  return normalizePath(filePath);
}

export function resolveContractCheckPaths(
  againstPath: string,
  rootDirInput: string = cwd(),
): ContractCheckPaths {
  const rootDir = path.resolve(rootDirInput);
  const againstAbsolutePath = resolveAgainstPath(againstPath, rootDir);
  const projectRoot = findProjectRoot(againstAbsolutePath, rootDir);
  const againstProjectPath = toRelativeProjectPath(againstAbsolutePath, projectRoot);
  const cruiseStartPath = againstProjectPath === '' ? '.' : againstProjectPath;

  return {
    rootDir,
    againstAbsolutePath,
    projectRoot,
    againstProjectPath,
    cruiseStartPath,
  };
}

function globToRegexSource(pattern: string): string {
  const normalizedPattern = normalizePath(pattern).replace(/^\.\//u, '');
  let regexSource = '^';

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const character = normalizedPattern[index];
    const nextCharacter = normalizedPattern[index + 1];

    if (character === '*' && nextCharacter === '*') {
      regexSource += '.*';
      index += 1;
      continue;
    }

    if (character === '*') {
      regexSource += '[^/]*';
      continue;
    }

    if (character === '?') {
      regexSource += '[^/]';
      continue;
    }

    regexSource += character?.replace(/[.+^${}()|[\]\\]/gu, '\\$&') ?? '';
  }

  return `${regexSource}$`;
}

function createGlobMatcher(pattern: string): RegExp {
  return new RegExp(globToRegexSource(pattern));
}

function createGeneratedRuleName(ruleName: string, suffix?: string): string {
  return suffix ? `${ruleName}::${suffix}` : ruleName;
}

export function buildDependencyCruiserRuleSet(
  rules: readonly DesignContractRule[],
): DependencyCruiserRuleSet {
  const metadataByGeneratedName = new Map<string, DependencyCruiserRuleMetadata>();
  const forbiddenRules: NonNullable<IFlattenedRuleSet['forbidden']> = [];

  for (const rule of rules) {
    if (rule.type === 'layer_direction') {
      const generatedRuleName = createGeneratedRuleName(rule.name);
      metadataByGeneratedName.set(generatedRuleName, {
        originalName: rule.name,
        ruleType: 'layer_direction',
        severity: rule.severity,
      });
      forbiddenRules.push({
        name: generatedRuleName,
        severity: rule.severity,
        from: { path: globToRegexSource(rule.from) },
        to: { path: globToRegexSource(rule.to) },
      });
      continue;
    }

    if (rule.type === 'forbidden_imports') {
      rule.forbidden.forEach((forbiddenModule, index) => {
        const generatedRuleName = createGeneratedRuleName(rule.name, String(index + 1));
        metadataByGeneratedName.set(generatedRuleName, {
          originalName: rule.name,
          ruleType: 'forbidden_imports',
          severity: rule.severity,
        });
        const normalizedForbidden = forbiddenModule.trim();
        const targetPattern = normalizedForbidden.includes('*')
          ? globToRegexSource(normalizedForbidden)
          : `^(?:${normalizedForbidden.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}|node:${normalizedForbidden.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')})$`;
        forbiddenRules.push({
          name: generatedRuleName,
          severity: rule.severity,
          from: { path: globToRegexSource(rule.module) },
          to: { path: targetPattern },
        });
      });
    }
  }

  if (forbiddenRules.length === 0) {
    return { metadataByGeneratedName };
  }

  return {
    metadataByGeneratedName,
    ruleSet: {
      forbidden: forbiddenRules,
    },
  };
}

function isLocalResolvedDependency(resolvedPath: string, projectRoot: string): boolean {
  return !path.isAbsolute(resolvedPath) || isWithinDirectory(resolvedPath, projectRoot);
}

function evaluateModulePublicApiOnlyRules(
  rules: readonly ModulePublicApiOnlyRule[],
  cruiseResult: ICruiseResult,
  projectRoot: string,
): ContractViolation[] {
  const violations: ContractViolation[] = [];
  const seenViolations = new Set<string>();

  for (const rule of rules) {
    const moduleMatcher = createGlobMatcher(rule.module);
    const publicApiSuffix = `/${rule.publicApi}`;

    for (const module of cruiseResult.modules) {
      const fromPath = toRelativeProjectPath(module.source, projectRoot);
      const fromIsInsideModule = moduleMatcher.test(fromPath);

      for (const dependency of module.dependencies) {
        if (dependency.coreModule || dependency.couldNotResolve || !dependency.resolved) {
          continue;
        }

        if (!isLocalResolvedDependency(dependency.resolved, projectRoot)) {
          continue;
        }

        const toPath = toRelativeProjectPath(dependency.resolved, projectRoot);
        const toIsInsideModule = moduleMatcher.test(toPath);
        const usesPublicApi = toPath === rule.publicApi || toPath.endsWith(publicApiSuffix);

        if (!toIsInsideModule || fromIsInsideModule || usesPublicApi) {
          continue;
        }

        const violationKey = `${rule.name}:${fromPath}:${toPath}`;
        if (seenViolations.has(violationKey)) {
          continue;
        }
        seenViolations.add(violationKey);

        violations.push({
          rule: rule.name,
          rule_type: 'module_public_api_only',
          severity: rule.severity,
          location: fromPath,
          message: `${fromPath} 只能通过 ${rule.publicApi} 访问 ${rule.module}，当前直接依赖了 ${toPath}`,
          dependency_chain: [fromPath, toPath],
          hard_fail: rule.severity === 'error',
          diagnostic: findViolationDiagnostic(
            fromPath,
            toPath,
            projectRoot,
            'module_boundary',
            'custom-evaluator',
          ),
        });
      }
    }
  }

  return violations;
}

function formatComplexityMetric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getComplexityThresholdBreaches(
  rule: ComplexityThresholdRule,
  metrics: ReturnType<typeof analyzeFileComplexity>,
): string[] {
  const breaches: string[] = [];

  if (rule.maxCyclomatic != null && metrics.cyclomatic > rule.maxCyclomatic) {
    breaches.push(`cyclomatic ${metrics.cyclomatic} > ${rule.maxCyclomatic}`);
  }

  if (rule.maxCognitive != null && metrics.cognitive > rule.maxCognitive) {
    breaches.push(`cognitive ${metrics.cognitive} > ${rule.maxCognitive}`);
  }

  if (rule.minMaintainability != null && metrics.maintainability < rule.minMaintainability) {
    breaches.push(
      `maintainability ${formatComplexityMetric(metrics.maintainability)} < ${formatComplexityMetric(rule.minMaintainability)}`,
    );
  }

  return breaches;
}

function createComplexityThresholdViolation(
  rule: ComplexityThresholdRule,
  projectRelativePath: string,
  breaches: readonly string[],
): ContractViolation {
  return {
    rule: rule.name,
    rule_type: 'complexity_threshold',
    severity: rule.severity,
    location: projectRelativePath,
    message: `${projectRelativePath} 复杂度超限，违反规则 ${rule.name}: ${breaches.join('; ')}`,
    dependency_chain: [projectRelativePath],
    hard_fail: rule.severity === 'error',
    diagnostic: createViolationDiagnostic(
      projectRelativePath,
      'complexity',
      'custom-evaluator',
    ),
  };
}

function evaluateComplexityThresholdRule(
  rule: ComplexityThresholdRule,
  scannedFiles: readonly string[],
  projectFiles: readonly string[],
  projectRoot: string,
): ComplexityEvaluationResult {
  const matcher = createGlobMatcher(rule.module);
  const matchingProjectFiles = projectFiles.filter((filePath) => matcher.test(filePath));

  if (matchingProjectFiles.length === 0) {
    return {
      violations: [],
      warnings: [{
        code: 'complexity-threshold-unavailable',
        message: `规则 ${rule.name} 未匹配到任何项目文件，complexity 结果不可用`,
        details: {
          rule: rule.name,
          matched_files: 0,
        },
      }],
    };
  }

  const matchingScannedFiles = scannedFiles.filter((filePath) => matcher.test(filePath));
  const violations: ContractViolation[] = [];
  const warnings: ContractCheckWarning[] = [];

  for (const projectRelativePath of matchingScannedFiles) {
    try {
      const metrics = analyzeFileComplexity(path.join(projectRoot, projectRelativePath));
      const breaches = getComplexityThresholdBreaches(rule, metrics);
      if (breaches.length > 0) {
        violations.push(createComplexityThresholdViolation(rule, projectRelativePath, breaches));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push({
        code: 'complexity-threshold-unavailable',
        message: `规则 ${rule.name} 无法分析 ${projectRelativePath}: ${message}`,
        details: {
          rule: rule.name,
          location: projectRelativePath,
        },
      });
    }
  }

  return { violations, warnings };
}

function evaluateComplexityThresholdRules(
  rules: readonly ComplexityThresholdRule[],
  scannedFiles: readonly string[],
  projectFiles: readonly string[],
  projectRoot: string,
): ComplexityEvaluationResult {
  return rules.reduce<ComplexityEvaluationResult>((result, rule) => {
    const evaluation = evaluateComplexityThresholdRule(rule, scannedFiles, projectFiles, projectRoot);
    result.violations.push(...evaluation.violations);
    result.warnings.push(...evaluation.warnings);
    return result;
  }, {
    violations: [],
    warnings: [],
  });
}

function isPathWithinAgainstScope(projectRelativePath: string, againstProjectPath: string): boolean {
  if (againstProjectPath === '' || againstProjectPath === '.') {
    return true;
  }

  return projectRelativePath === againstProjectPath || projectRelativePath.startsWith(`${againstProjectPath}/`);
}

function isBarrelFile(projectRelativePath: string): boolean {
  return /(?:^|\/)index\.(?:ts|tsx|js|jsx)$/u.test(projectRelativePath);
}

function expandDiffScannedFiles(
  changedFiles: readonly string[],
  cruiseResult: ICruiseResult,
  againstProjectPath: string,
): {
  scannedFiles: string[];
  warnings: ContractCheckWarning[];
} {
  const moduleBySource = new Map(
    cruiseResult.modules.map((module) => [normalizePath(module.source), module]),
  );
  const scannedFileSet = new Set<string>();

  for (const changedFile of changedFiles) {
    const normalizedChangedFile = normalizePath(changedFile);
    if (!moduleBySource.has(normalizedChangedFile)) {
      continue;
    }
    scannedFileSet.add(normalizedChangedFile);

    const changedModule = moduleBySource.get(normalizedChangedFile);
    for (const dependent of changedModule?.dependents ?? []) {
      const normalizedDependent = normalizePath(dependent);
      if (isPathWithinAgainstScope(normalizedDependent, againstProjectPath)) {
        scannedFileSet.add(normalizedDependent);
      }
    }

    if (isBarrelFile(normalizedChangedFile)) {
      for (const dependent of changedModule?.dependents ?? []) {
        const normalizedDependent = normalizePath(dependent);
        if (isPathWithinAgainstScope(normalizedDependent, againstProjectPath)) {
          scannedFileSet.add(normalizedDependent);
        }
      }
    }
  }

  const scannedFiles = Array.from(scannedFileSet).sort();
  const warnings: ContractCheckWarning[] = scannedFiles.length > changedFiles.length
    ? [{
        code: 'diff-scope-expanded',
        message: `diff scope 从 ${changedFiles.length} 个 changed file 扩展到 ${scannedFiles.length} 个 scanned file`,
      }]
    : [];

  return {
    scannedFiles,
    warnings,
  };
}

function filterViolationsByScannedFiles(
  violations: readonly ContractViolation[],
  scannedFiles: readonly string[],
): ContractViolation[] {
  const scannedFileSet = new Set(scannedFiles.map((filePath) => normalizePath(filePath)));
  return violations.filter((violation) => scannedFileSet.has(normalizePath(violation.location)));
}

function mapDependencyCruiserViolations(
  violations: readonly IViolation[],
  metadataByGeneratedName: Map<string, DependencyCruiserRuleMetadata>,
  projectRoot: string,
): ContractViolation[] {
  return violations.flatMap((violation) => {
    const metadata = metadataByGeneratedName.get(violation.rule.name);
    if (!metadata) {
      return [];
    }

    const fromPath = normalizePath(violation.from);
    const toPath = normalizePath(violation.to);

    return [{
      rule: metadata.originalName,
      rule_type: metadata.ruleType,
      severity: metadata.severity,
      location: fromPath,
      message: `${fromPath} 依赖 ${toPath}，违反规则 ${metadata.originalName}`,
      dependency_chain: [fromPath, toPath],
      hard_fail: metadata.severity === 'error',
      diagnostic: findViolationDiagnostic(
        fromPath,
        toPath,
        projectRoot,
        getDiagnosticCategory(metadata.ruleType),
        'dependency-cruiser',
      ),
    }];
  });
}

function createSummary(
  violations: readonly ContractViolation[],
  scannedFiles: readonly string[],
  ruleCount: number,
): ContractCheckSummary {
  const errorCount = violations.filter((violation) => violation.severity === 'error').length;
  const warnCount = violations.filter((violation) => violation.severity === 'warn').length;

  return {
    total_violations: violations.length,
    error_count: errorCount,
    warn_count: warnCount,
    scanned_file_count: scannedFiles.length,
    rule_count: ruleCount,
  };
}

function getCruiseTsConfigOption(projectRoot: string): { fileName: string } | undefined {
  const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
  if (!existsSync(tsConfigPath)) {
    return undefined;
  }

  return {
    fileName: tsConfigPath,
  };
}

export function hasBlockingContractViolations(result: ContractCheckResult): boolean {
  return result.violations.some((violation) => violation.severity === 'error');
}

async function enrichContractCheckResultWithHistory(
  result: ContractCheckResult,
  paths: ContractCheckPaths,
  historyRiskService?: Pick<GitHistoryService, 'analyzeFiles'>,
): Promise<Pick<ContractCheckResult, 'violations' | 'warnings' | 'history'>> {
  const violationFiles = Array.from(
    new Set(result.violations.map((violation) => normalizePath(violation.location))),
  );

  if (violationFiles.length === 0) {
    return {
      violations: [...result.violations],
      warnings: [...result.warnings],
      history: {
        status: 'not_found',
        confidence: 'medium',
        freshness: 'unknown',
        scope_mode: 'full',
        enriched_file_count: 0,
        unavailable_count: 0,
        stale_count: 0,
        low_confidence_count: 0,
        requires_precompute: false,
      },
    };
  }

  const storageRoot = findHistoryStorageRoot(
    paths.againstAbsolutePath,
    paths.rootDir,
    paths.projectRoot,
  );
  const runtimeWarnings: ContractCheckWarning[] = [];
  let loadedStorage: Awaited<ReturnType<typeof createConfiguredStorage>> | null = null;
  let closeLoadedStorage: (() => Promise<void>) | undefined;

  try {
    const service = historyRiskService ?? await (async () => {
      loadedStorage = await createConfiguredStorage(storageRoot);
      closeLoadedStorage = () => loadedStorage!.storage.close();
      return new GitHistoryService({
        projectRoot: paths.projectRoot,
        storage: loadedStorage.storage,
      });
    })();

    const historyResult = await service.analyzeFiles(violationFiles, {
      persist: true,
    });

    return {
      violations: enrichViolationsWithHistory(result.violations, historyResult),
      warnings: [...result.warnings, ...createHistoryWarnings(historyResult)],
      history: summarizeHistoryEnrichment(historyResult),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtimeWarnings.push({
      code: 'history-risk-enrichment-unavailable',
      message: `history risk enrichment 不可用: ${message}`,
    });

    return {
      violations: [...result.violations],
      warnings: [...result.warnings, ...runtimeWarnings],
      history: {
        status: 'unavailable',
        confidence: 'unavailable',
        freshness: 'unknown',
        scope_mode: 'partial',
        enriched_file_count: 0,
        unavailable_count: violationFiles.length,
        stale_count: 0,
        low_confidence_count: violationFiles.length,
        requires_precompute: false,
      },
    };
  } finally {
    if (closeLoadedStorage) {
      await closeLoadedStorage();
    }
  }
}

export async function runContractCheck(
  options: RunContractCheckOptions,
): Promise<ContractCheckResult> {
  const paths = resolveContractCheckPaths(options.againstPath, options.rootDir);
  const contract = await loadDesignContract({
    filePath: options.contractPath,
    rootDir: paths.rootDir,
  });

  if (!contract.ok) {
    throw new Error(`Contract 文件不合法，请先运行 design validate: ${contract.filePath}`);
  }

  const translatedRules = buildDependencyCruiserRuleSet(contract.contract.rules);
  const tsConfig = getCruiseTsConfigOption(paths.projectRoot);
  const dependencyCruiserOutput = await cruise(
    [paths.cruiseStartPath],
    {
      baseDir: paths.projectRoot,
      validate: Boolean(translatedRules.ruleSet),
      ruleSet: translatedRules.ruleSet,
      tsPreCompilationDeps: 'specify',
      ...(tsConfig ? { tsConfig } : {}),
      exclude: {
        path: CONTRACT_CHECK_EXCLUDE_PATHS,
      },
      doNotFollow: {
        path: 'node_modules',
      },
    },
    undefined,
  );

  if (typeof dependencyCruiserOutput.output === 'string') {
    throw new Error('dependency-cruiser 返回了非结构化输出，无法继续 contract check');
  }

  const dependencyCruiserViolations = mapDependencyCruiserViolations(
    dependencyCruiserOutput.output.summary.violations,
    translatedRules.metadataByGeneratedName,
    paths.projectRoot,
  );
  const publicApiViolations = evaluateModulePublicApiOnlyRules(
    contract.contract.rules.filter(
      (rule): rule is ModulePublicApiOnlyRule => rule.type === 'module_public_api_only',
    ),
    dependencyCruiserOutput.output,
    paths.projectRoot,
  );
  const allScannedFiles = dependencyCruiserOutput.output.modules
    .map((module) => toRelativeProjectPath(module.source, paths.projectRoot))
    .sort();
  const scanMode = options.scanMode ?? 'full';
  const diffScope = scanMode === 'diff'
    ? expandDiffScannedFiles(options.changedFiles ?? [], dependencyCruiserOutput.output, paths.againstProjectPath)
    : { scannedFiles: allScannedFiles, warnings: [] };
  const scannedFiles = diffScope.scannedFiles.length > 0 ? diffScope.scannedFiles : allScannedFiles;
  const complexityEvaluation = evaluateComplexityThresholdRules(
    contract.contract.rules.filter(
      (rule): rule is ComplexityThresholdRule => rule.type === 'complexity_threshold',
    ),
    scannedFiles,
    allScannedFiles,
    paths.projectRoot,
  );
  const allViolations = [
    ...dependencyCruiserViolations,
    ...publicApiViolations,
    ...complexityEvaluation.violations,
  ];
  const violations = scanMode === 'diff'
    ? filterViolationsByScannedFiles(allViolations, scannedFiles)
    : allViolations;
  const summary = createSummary(violations, scannedFiles, contract.contract.rules.length);
  const baseResult: ContractCheckResult = {
    passed: summary.error_count === 0,
    scan_mode: scanMode,
    contract_path: contract.filePath,
    against_path: paths.againstProjectPath,
    changed_files: [...(options.changedFiles ?? [])],
    scanned_files: scannedFiles,
    warnings: [...(options.warnings ?? []), ...diffScope.warnings, ...complexityEvaluation.warnings],
    violations,
    summary,
  };
  const historyEnrichment = await enrichContractCheckResultWithHistory(
    baseResult,
    paths,
    options.historyRiskService,
  );

  return {
    ...baseResult,
    violations: historyEnrichment.violations,
    warnings: historyEnrichment.warnings,
    history: historyEnrichment.history,
  };
}
