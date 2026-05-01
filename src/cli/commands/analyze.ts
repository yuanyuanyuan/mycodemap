/**
 * [META] AnalyzeCommand - 统一分析入口
 * [WHY] 为 CI 与人工调用提供统一分析输出，支持 machine/json 契约
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import chalk from 'chalk';
import { ImpactCommand } from './impact.js';
import { DepsCommand } from './deps.js';
import { ComplexityCommand } from './complexity.js';
import {
  ANALYZE_PARSE_OPTIONS,
  getAnalyzeHelpText
} from './analyze-options.js';
import {
  PUBLIC_INTENTS,
  type AnalyzeArgs,
  type IntentType,
  type CodemapOutput,
  type UnifiedResult,
  type Confidence,
  type CodemapIntent,
  type AnalyzeWarning,
  type AnalyzeDiagnostic,
  type AnalyzeDiagnostics,
  type IntentCompatibility,
  type ReadAnalysis,
  type LinkAnalysis,
  type LinkDependencyAnalysisItem,
  type LinkReferenceAnalysisItem,
  type ShowAnalysis,
  calculateConfidenceLevel
} from '../../orchestrator/types.js';
import type { SourceLocation, CodeMap, ModuleInfo } from '../../types/index.js';
import { resolveTestFile } from '../../orchestrator/test-linker.js';
import { ToolOrchestrator } from '../../orchestrator/tool-orchestrator.js';
import { ResultFusion } from '../../orchestrator/result-fusion.js';
import { CodemapAdapter } from '../../orchestrator/adapters/codemap-adapter.js';
import { AstGrepAdapter } from '../../orchestrator/adapters/ast-grep-adapter.js';
import { IntentRouter } from '../../orchestrator/intent-router.js';
import { resolveDataPath, resolveOutputDir } from '../paths.js';
import { discoverProjectFiles } from '../../core/file-discovery.js';
import { loadCodemapConfig } from '../config-loader.js';
import { resolveOutputMode, renderOutput, createProgressEmitter, formatError } from '../output/index.js';
import type { OutputMode } from '../output/index.js';

/**
 * 错误码定义
 */
export enum AnalyzeErrorCode {
  /** E0001: 无效 intent 值 */
  E0001_INVALID_INTENT = 'E0001',
  /** E0002: 缺少必要参数 */
  E0002_MISSING_REQUIRED_PARAM = 'E0002',
  /** E0003: 目标路径不存在 */
  E0003_TARGET_NOT_FOUND = 'E0003',
  /** E0004: 工具执行超时 */
  E0004_EXECUTION_TIMEOUT = 'E0004',
  /** E0005: 工具执行失败 */
  E0005_EXECUTION_FAILED = 'E0005',
  /** E0006: 置信度过低 */
  E0006_LOW_CONFIDENCE = 'E0006',
}

/**
 * 错误信息映射
 */
export const ERROR_MESSAGES: Record<AnalyzeErrorCode, string> = {
  [AnalyzeErrorCode.E0001_INVALID_INTENT]: '无效的 intent 参数值',
  [AnalyzeErrorCode.E0002_MISSING_REQUIRED_PARAM]: '缺少必要参数',
  [AnalyzeErrorCode.E0003_TARGET_NOT_FOUND]: '目标路径不存在',
  [AnalyzeErrorCode.E0004_EXECUTION_TIMEOUT]: '工具执行超时',
  [AnalyzeErrorCode.E0005_EXECUTION_FAILED]: '工具执行失败',
  [AnalyzeErrorCode.E0006_LOW_CONFIDENCE]: '置信度过低',
};

/**
 * 支持的 intent 列表
 */
export const VALID_INTENTS: IntentType[] = [
  ...PUBLIC_INTENTS,
];

/**
 * AnalyzeCommand 分析命令类
 */
export class AnalyzeCommand {
  private args: AnalyzeArgs;

  /**
   * 构造函数
   * @param args 分析命令参数
   */
  constructor(args: AnalyzeArgs) {
    this.args = args;
  }

  /**
   * 验证参数
   * @throws AnalyzeError 当参数无效时
   */
  private validate(): void {
    if (!this.args.intent) {
      throw this.createError(
        AnalyzeErrorCode.E0002_MISSING_REQUIRED_PARAM,
        '缺少必要参数: intent'
      );
    }

    const intentRouter = new IntentRouter();

    // 验证 intent
    if (!intentRouter.isValidIntent(this.args.intent)) {
      throw this.createError(
        AnalyzeErrorCode.E0001_INVALID_INTENT,
        `无效的 intent: ${this.args.intent}。支持的选项: ${VALID_INTENTS.join(', ')}`
      );
    }

    const routedIntent = intentRouter.route(this.args);
    const normalizedIntent = routedIntent.intent;
    const hasTargets = Boolean(this.args.targets && this.args.targets.length > 0);
    const hasKeywords = Boolean(this.args.keywords && this.args.keywords.length > 0);

    if (normalizedIntent === 'find') {
      if (!hasTargets && !hasKeywords) {
        throw this.createError(
          AnalyzeErrorCode.E0002_MISSING_REQUIRED_PARAM,
          '缺少必要参数: targets 或 keywords'
        );
      }
      return;
    }

    if (
      normalizedIntent === 'link' &&
      routedIntent.compatibility?.normalizedFrom === 'reference' &&
      hasKeywords
    ) {
      return;
    }

    if (!hasTargets) {
      throw this.createError(
        AnalyzeErrorCode.E0002_MISSING_REQUIRED_PARAM,
        '缺少必要参数: targets'
      );
    }
  }

  /**
   * 创建错误对象
   */
  private createError(code: AnalyzeErrorCode, message: string): Error {
    const error = new Error(`[${code}] ${message}`) as Error & { code: AnalyzeErrorCode };
    error.code = code;
    return error;
  }

  /**
   * 执行分析
   */
  async execute(): Promise<unknown> {
    this.validate();

    const intentRouter = new IntentRouter();
    const intentObj = intentRouter.route(this.args);
    const scope = intentObj.scope;
    const topK = this.args.topK || 8;

    switch (intentObj.intent) {
      case 'read':
        return this.executeRead(intentObj, scope, topK);
      case 'link':
        return this.executeLink(intentObj, topK);
      case 'show':
        return this.executeShow(intentObj, topK);
      case 'find':
        return this.executeFindWithFallback(intentObj, topK);
      default:
        throw this.createError(
          AnalyzeErrorCode.E0001_INVALID_INTENT,
          `无效的 intent: ${intentObj.intent}`
        );
    }
  }

  /**
   * `find` 优先走 orchestrator，失败时回退到 AstGrep 搜索
   */
  private async executeFindWithFallback(intentObj: CodemapIntent, topK: number): Promise<CodemapOutput> {
    try {
      const orchestratedOutput = await this.executeWithOrchestrator(intentObj, topK);

      if (orchestratedOutput.results.length > 0) {
        return this.withCompatibility(
          this.withDiagnostics(orchestratedOutput, this.createSuccessDiagnostics()),
          intentObj.compatibility
        );
      }

      try {
        await this.executeFind(intentObj, topK, { failOnScanError: true });
      } catch (scanError) {
        return this.withCompatibility(
          await this.executeConfigAwareTextFallback(intentObj, topK, scanError, undefined),
          intentObj.compatibility
        );
      }

      return this.withCompatibility(
        this.withDiagnostics(orchestratedOutput, this.createSuccessDiagnostics()),
        intentObj.compatibility
      );
    } catch (orchestratorError) {
      console.warn('[Analyze] Orchestrator not available, falling back to AstGrep search');

      try {
        return await this.executeFind(intentObj, topK, { failOnScanError: true });
      } catch (scanError) {
        return this.withCompatibility(
          await this.executeConfigAwareTextFallback(intentObj, topK, scanError, orchestratorError),
          intentObj.compatibility
        );
      }
    }
  }

  /**
   * 使用编排器执行分析
   */
  private async executeWithOrchestrator(intentObj: CodemapIntent, topK: number): Promise<CodemapOutput> {
    const orchestrator = new ToolOrchestrator();

    // 注册适配器
    const codemapAdapter = new CodemapAdapter({ codemapPath: resolveOutputDir().outputDir });
    const astGrepAdapter = new AstGrepAdapter({ includeTests: this.args.includeTests ?? true });
    orchestrator.registerAdapter(codemapAdapter);
    orchestrator.registerAdapter(astGrepAdapter);

    const fusion = new ResultFusion();
    const effectiveIntent = intentObj.executionIntent ?? intentObj.intent;

    let orchestratedResults: UnifiedResult[] = [];
    let confidence: Confidence;

    if (intentObj.secondary) {
      const tools = Array.from(new Set([intentObj.tool, intentObj.secondary]));
      const resultsByTool = await orchestrator.executeParallel(intentObj, tools);
      orchestratedResults = fusion.fuse(resultsByTool, {
        topK,
        intent: effectiveIntent,
        keywordWeights: {},
        maxTokens: 160,
      });
      const confidenceScore = this.calculateConfidence(orchestratedResults);
      confidence = {
        score: confidenceScore,
        level: confidenceScore >= 0.7 ? 'high' : confidenceScore >= 0.4 ? 'medium' : 'low',
      };
    } else {
      const result = await orchestrator.executeWithFallback(intentObj, intentObj.tool);
      orchestratedResults = result.results.slice(0, topK);
      confidence = {
        score: result.confidence?.score || 0,
        level: result.confidence?.level || 'low',
      };
    }

    // 为结果添加 location 字段
    const resultsWithLocation = this.enrichWithLocation(orchestratedResults);

    return {
      schemaVersion: 'v1.0.0',
      intent: intentObj.intent,
      tool: 'codemap-orchestrated',
      confidence,
      results: resultsWithLocation,
      metadata: {
        total: orchestratedResults.length,
        scope: intentObj.scope,
        resultCount: orchestratedResults.length,
      },
    };
  }

  /**
   * 为输出添加兼容期 warning
   */
  private withCompatibility(
    output: CodemapOutput,
    compatibility?: IntentCompatibility
  ): CodemapOutput {
    const warnings = this.buildCompatibilityWarnings(compatibility);
    if (warnings.length === 0) {
      return output;
    }

    return {
      ...output,
      warnings
    };
  }

  /**
   * 生成结构化兼容 warning
   */
  private buildCompatibilityWarnings(compatibility?: IntentCompatibility): AnalyzeWarning[] {
    if (!compatibility?.isDeprecated || !compatibility.normalizedFrom) {
      return [];
    }

    const replacementIntent = compatibility.normalizedFrom === 'search'
      ? 'find'
      : compatibility.normalizedFrom === 'impact' || compatibility.normalizedFrom === 'complexity'
        ? 'read'
        : compatibility.normalizedFrom === 'dependency' || compatibility.normalizedFrom === 'reference'
          ? 'link'
          : 'show';

    return [{
      code: 'deprecated-intent',
      severity: 'warning',
      message: `legacy intent "${compatibility.normalizedFrom}" 已弃用，请改用 "${replacementIntent}"`,
      deprecatedIntent: compatibility.normalizedFrom,
      replacementIntent,
      sunsetPolicy: '2-minor-window'
    }];
  }

  /**
   * find fallback
   */
  private async executeFind(
    intentObj: CodemapIntent,
    topK: number,
    options: { failOnScanError?: boolean } = {}
  ): Promise<CodemapOutput> {
    const searchTerms = intentObj.keywords.length > 0 ? intentObj.keywords : intentObj.targets;
    const adapter = new AstGrepAdapter({
      includeTests: this.args.includeTests ?? true,
      failOnScanError: options.failOnScanError ?? false
    });
    const rawResults = await adapter.execute(searchTerms, {
      topK,
      includeTests: this.args.includeTests,
      keywords: searchTerms
    });
    const results = this.enrichWithLocation(rawResults).slice(0, topK);
    const confidence = this.buildConfidence(this.calculateConfidence(results));

    return this.withCompatibility({
      schemaVersion: 'v1.0.0',
      intent: 'find',
      tool: 'ast-grep-find',
      confidence,
      results,
      diagnostics: this.createSuccessDiagnostics(),
      metadata: {
        total: results.length,
        resultCount: results.length,
        scope: intentObj.scope
      }
    }, intentObj.compatibility);
  }

  private async executeConfigAwareTextFallback(
    intentObj: CodemapIntent,
    topK: number,
    scanError: unknown,
    orchestratorError: unknown
  ): Promise<CodemapOutput> {
    try {
      const results = await this.runConfigAwareTextFallback(intentObj, topK);
      const diagnostics = this.createPartialFailureDiagnostics(scanError, orchestratorError);

      return {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'codemap-find-fallback',
        confidence: this.buildConfidence(results.length > 0 ? 0.65 : 0),
        results,
        diagnostics,
        metadata: {
          total: results.length,
          resultCount: results.length,
          scope: intentObj.scope
        }
      };
    } catch (fallbackError) {
      if (this.isMachineOutputMode()) {
        process.exitCode = 1;
      }

      return {
        schemaVersion: 'v1.0.0',
        intent: 'find',
        tool: 'codemap-find-fallback',
        confidence: this.buildConfidence(0),
        results: [],
        diagnostics: this.createFailureDiagnostics(scanError, fallbackError, orchestratorError),
        metadata: {
          total: 0,
          resultCount: 0,
          scope: intentObj.scope
        }
      };
    }
  }

  private async runConfigAwareTextFallback(
    intentObj: CodemapIntent,
    topK: number
  ): Promise<UnifiedResult[]> {
    const { config } = await loadCodemapConfig(process.cwd());
    const discoveredFiles = await discoverProjectFiles({
      rootDir: process.cwd(),
      include: config.include,
      exclude: config.exclude,
      absolute: true,
      gitignore: true
    });
    const { files, searchTerms, explicitPathMode } = this.resolveFallbackSearchScope(discoveredFiles, intentObj);
    const results: UnifiedResult[] = [];

    for (const file of files) {
      const fileResults = await this.searchFileWithFallback(file, searchTerms, topK - results.length);
      results.push(...fileResults);

      if (results.length >= topK) {
        return results.slice(0, topK);
      }
    }

    if (explicitPathMode && intentObj.keywords.length === 0 && results.length === 0) {
      const anchoredResults = await this.createExplicitPathFallbackResults(files, searchTerms, topK);
      results.push(...anchoredResults);
    }

    return results.slice(0, topK);
  }

  private resolveFallbackSearchScope(
    discoveredFiles: string[],
    intentObj: CodemapIntent
  ): { files: string[]; searchTerms: string[]; explicitPathMode: boolean } {
    const explicitPathTargets = intentObj.targets.filter(target => this.isPathLikeTarget(target));
    const matchedTargetFiles = this.matchDiscoveredTargetFiles(discoveredFiles, explicitPathTargets);

    if (matchedTargetFiles.length > 0) {
      const pathTerms = explicitPathTargets.flatMap(target => {
        const basename = path.basename(target);
        return [basename, this.stripModuleExtension(basename)];
      });
      return {
        files: matchedTargetFiles,
        searchTerms: this.uniqueNonEmptyStrings(intentObj.keywords.length > 0 ? intentObj.keywords : pathTerms),
        explicitPathMode: true
      };
    }

    return {
      files: discoveredFiles,
      searchTerms: this.uniqueNonEmptyStrings(intentObj.keywords.length > 0 ? intentObj.keywords : intentObj.targets),
      explicitPathMode: false
    };
  }

  private async searchFileWithFallback(
    file: string,
    searchTerms: string[],
    remainingSlots: number
  ): Promise<UnifiedResult[]> {
    if (remainingSlots <= 0 || searchTerms.length === 0) {
      return [];
    }

    const content = await readFile(file, 'utf-8');
    const lines = content.split(/\r?\n/);
    const results: UnifiedResult[] = [];

    for (const [index, line] of lines.entries()) {
      const matchedTerms = searchTerms.filter(term => line.includes(term));
      if (matchedTerms.length === 0) {
        continue;
      }

      const relativeFile = this.toProjectRelativePath(file);
      const lineNumber = index + 1;
      results.push(this.createFallbackResult(relativeFile, lineNumber, line, matchedTerms));

      if (results.length >= remainingSlots) {
        break;
      }
    }

    return results;
  }

  private async createExplicitPathFallbackResults(
    files: string[],
    searchTerms: string[],
    topK: number
  ): Promise<UnifiedResult[]> {
    const results: UnifiedResult[] = [];

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
      const relativeFile = this.toProjectRelativePath(file);
      results.push(this.createFallbackResult(
        relativeFile,
        1,
        firstLine || `Matched file path ${relativeFile}`,
        searchTerms
      ));

      if (results.length >= topK) {
        break;
      }
    }

    return results;
  }

  private createFallbackResult(
    relativeFile: string,
    lineNumber: number,
    content: string,
    keywords: string[]
  ): UnifiedResult {
    return {
      id: `codemap-fallback:${relativeFile}:${lineNumber}`,
      source: 'codemap-fallback',
      toolScore: 0.65,
      type: 'code',
      file: relativeFile,
      line: lineNumber,
      location: {
        file: relativeFile,
        line: lineNumber,
        column: 1
      },
      content: content.substring(0, 200),
      relevance: 0.65,
      keywords,
      metadata: {
        stability: true,
        riskLevel: 'low'
      }
    };
  }

  private matchDiscoveredTargetFiles(discoveredFiles: string[], targets: string[]): string[] {
    const normalizedTargets = new Set(targets.flatMap(target => {
      const absoluteTarget = path.resolve(process.cwd(), target);
      return [
        this.toPosixPath(absoluteTarget),
        this.toPosixPath(path.relative(process.cwd(), absoluteTarget)),
        this.toPosixPath(target)
      ];
    }));

    return discoveredFiles.filter(file => {
      const absoluteFile = path.resolve(file);
      const relativeFile = path.relative(process.cwd(), absoluteFile);
      return normalizedTargets.has(this.toPosixPath(absoluteFile))
        || normalizedTargets.has(this.toPosixPath(relativeFile));
    });
  }

  private isPathLikeTarget(target: string): boolean {
    return target.includes('/') || target.includes('\\') || /\.[cm]?[jt]sx?$/i.test(target);
  }

  private uniqueNonEmptyStrings(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
  }

  private toProjectRelativePath(file: string): string {
    return this.toPosixPath(path.relative(process.cwd(), path.resolve(file)));
  }

  private toPosixPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  private withDiagnostics(output: CodemapOutput, diagnostics: AnalyzeDiagnostics): CodemapOutput {
    return {
      ...output,
      diagnostics
    };
  }

  private createSuccessDiagnostics(): AnalyzeDiagnostics {
    return {
      status: 'success',
      items: []
    };
  }

  private createPartialFailureDiagnostics(
    scanError: unknown,
    orchestratorError: unknown
  ): AnalyzeDiagnostics {
    return {
      status: 'partialFailure',
      items: [
        this.createDiagnostic(
          'find-scanner-degraded',
          'warning',
          `find 主扫描退化，已使用配置感知文本 fallback: ${this.errorMessage(scanError)}`,
          'ast-grep',
          true,
          { orchestratorError: this.errorMessage(orchestratorError) }
        )
      ],
      degradedTools: ['ast-grep']
    };
  }

  private createFailureDiagnostics(
    scanError: unknown,
    fallbackError: unknown,
    orchestratorError: unknown
  ): AnalyzeDiagnostics {
    return {
      status: 'failure',
      items: [
        this.createDiagnostic(
          'find-scanner-failed',
          'error',
          `find 主扫描失败: ${this.errorMessage(scanError)}`,
          'ast-grep',
          false,
          { orchestratorError: this.errorMessage(orchestratorError) }
        ),
        this.createDiagnostic(
          'find-fallback-failed',
          'error',
          `配置感知文本 fallback 失败: ${this.errorMessage(fallbackError)}`,
          'codemap-find-fallback',
          false
        )
      ],
      failedTools: ['ast-grep', 'codemap-find-fallback']
    };
  }

  private createDiagnostic(
    code: string,
    severity: AnalyzeDiagnostic['severity'],
    message: string,
    source: string,
    recoverable: boolean,
    details?: Record<string, unknown>
  ): AnalyzeDiagnostic {
    return {
      code,
      severity,
      message,
      source,
      recoverable,
      ...(details ? { details } : {})
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isMachineOutputMode(): boolean {
    return this.args.json === true || this.args.structured === true || this.args.outputMode === 'machine';
  }

  /**
   * 执行 read 聚合
   */
  private async executeRead(
    intentObj: CodemapIntent,
    scope: string,
    topK: number
  ): Promise<CodemapOutput> {
    const [impactOutput, complexityOutput] = await Promise.all([
      this.executeImpact(scope, topK),
      this.executeComplexity(topK)
    ]);

    const mergedResults = this.mergeUnifiedResults(impactOutput.results, complexityOutput.results);
    const results = mergedResults.slice(0, topK);
    const analysis: ReadAnalysis = {
      intent: 'read',
      impact: impactOutput.results
        .filter(result => result.content.startsWith('被 '))
        .map(result => ({
          file: result.file,
          location: result.location,
          changedFiles: [result.file],
          transitiveDependencies: result.metadata?.dependencies ?? [],
          impactCount: result.metadata?.impactCount ?? 0,
          risk: result.metadata?.riskLevel ?? 'low'
        })),
      complexity: complexityOutput.results
        .filter(result => Boolean(result.metadata?.complexityMetrics))
        .map(result => ({
          file: result.file,
          location: result.location,
          metrics: result.metadata?.complexityMetrics ?? {
            cyclomatic: 0,
            cognitive: 0,
            maintainability: 0
          },
          risk: result.metadata?.riskLevel ?? 'low'
        }))
    };

    return this.withCompatibility({
      schemaVersion: 'v1.0.0',
      intent: 'read',
      tool: 'codemap-read',
      confidence: this.combineConfidence([impactOutput.confidence, complexityOutput.confidence], results),
      results,
      analysis,
      metadata: {
        total: mergedResults.length,
        resultCount: results.length,
        scope
      }
    }, intentObj.compatibility);
  }

  /**
   * 执行 link 聚合
   */
  private async executeLink(intentObj: CodemapIntent, topK: number): Promise<CodemapOutput> {
    const dependencyOutput = intentObj.targets.length > 0
      ? await this.executeDeps(Math.max(topK, intentObj.targets.length))
      : this.createEmptyOutput('link', 'codemap-link', intentObj.scope);
    const codeMap = await this.loadCodeMap();
    const dependency = codeMap
      ? this.buildLinkDependencyAnalysis(codeMap, intentObj.targets)
      : [];
    const reference = codeMap
      ? this.buildLinkReferenceAnalysis(codeMap, intentObj.targets, intentObj.keywords)
      : [];
    const referenceResults = this.buildReferenceResults(reference);
    const mergedResults = this.mergeUnifiedResults(dependencyOutput.results, referenceResults);
    const results = mergedResults.slice(0, topK);
    const confidence = this.combineConfidence([
      dependencyOutput.confidence,
      this.buildConfidence(this.calculateConfidence(referenceResults))
    ], results);
    const analysis: LinkAnalysis = {
      intent: 'link',
      ...(reference.length > 0 ? { reference } : {}),
      ...(dependency.length > 0 ? { dependency } : {})
    };

    return this.withCompatibility({
      schemaVersion: 'v1.0.0',
      intent: 'link',
      tool: 'codemap-link',
      confidence,
      results,
      analysis,
      metadata: {
        total: mergedResults.length,
        resultCount: results.length,
        scope: intentObj.scope
      }
    }, intentObj.compatibility);
  }

  /**
   * 执行 show 聚合
   */
  private async executeShow(intentObj: CodemapIntent, topK: number): Promise<CodemapOutput> {
    const codeMap = await this.loadCodeMap();
    const modules = codeMap ? this.findMatchingModules(codeMap, intentObj.targets) : [];
    const analysis: ShowAnalysis = {
      intent: 'show',
      overview: modules.map(module => ({
        title: path.basename(module.absolutePath),
        file: this.toRelativePath(codeMap!, module.absolutePath),
        overview: module.overview ?? `模块 ${this.toRelativePath(codeMap!, module.absolutePath)}，导出 ${module.exports.length} 个符号，依赖 ${module.dependencies.length} 个模块`,
        exports: module.exports.map(exp => exp.name)
      })),
      documentation: modules.map(module => ({
        title: path.basename(module.absolutePath),
        file: this.toRelativePath(codeMap!, module.absolutePath),
        content: module.overview
          ?? `类型: ${module.type}; 代码行: ${module.stats.codeLines}; 导出: ${module.exports.map(exp => exp.name).join(', ') || '无'}`
      }))
    };
    const results = this.buildShowResults(analysis).slice(0, topK);

    return this.withCompatibility({
      schemaVersion: 'v1.0.0',
      intent: 'show',
      tool: 'codemap-show',
      confidence: this.buildConfidence(this.calculateConfidence(results)),
      results,
      analysis,
      metadata: {
        total: results.length,
        resultCount: results.length,
        scope: intentObj.scope
      }
    }, intentObj.compatibility);
  }

  /**
   * 创建空输出
   */
  private createEmptyOutput(
    intent: IntentType,
    tool: string,
    scope: 'direct' | 'transitive'
  ): CodemapOutput {
    return {
      schemaVersion: 'v1.0.0',
      intent,
      tool,
      confidence: this.buildConfidence(0),
      results: [],
      metadata: {
        total: 0,
        resultCount: 0,
        scope
      }
    };
  }

  /**
   * 聚合多个 Confidence
   */
  private combineConfidence(confidences: Confidence[], results: UnifiedResult[]): Confidence {
    const effective = confidences.filter(confidence => Number.isFinite(confidence.score));
    if (effective.length === 0) {
      return this.buildConfidence(this.calculateConfidence(results));
    }

    const score = Math.round(
      (effective.reduce((sum, confidence) => sum + confidence.score, 0) / effective.length) * 100
    ) / 100;

    return this.buildConfidence(score);
  }

  /**
   * 构建 Confidence
   */
  private buildConfidence(score: number): Confidence {
    const normalizedScore = Math.round(Math.max(0, Math.min(score, 1)) * 100) / 100;
    return {
      score: normalizedScore,
      level: calculateConfidenceLevel(normalizedScore)
    };
  }

  /**
   * 合并 UnifiedResult
   */
  private mergeUnifiedResults(...collections: UnifiedResult[][]): UnifiedResult[] {
    const merged = new Map<string, UnifiedResult>();

    for (const results of collections) {
      for (const result of results) {
        const key = `${result.file}:${result.location?.line ?? result.line ?? 1}`;
        const existing = merged.get(key);
        if (!existing || result.relevance > existing.relevance) {
          merged.set(key, result);
        }
      }
    }

    return Array.from(merged.values()).sort((left, right) => right.relevance - left.relevance);
  }

  /**
   * 加载 CodeMap 数据
   */
  private async loadCodeMap(): Promise<CodeMap | null> {
    try {
      const dataPath = resolveDataPath();
      const raw = await readFile(dataPath, 'utf-8');
      return JSON.parse(raw) as CodeMap;
    } catch {
      return null;
    }
  }

  /**
   * 查找目标模块
   */
  private findMatchingModules(codeMap: CodeMap, targets: string[]): ModuleInfo[] {
    const seen = new Set<string>();
    const modules: ModuleInfo[] = [];

    for (const target of targets) {
      const module = this.findMatchingModule(codeMap, target);
      if (module && !seen.has(module.id)) {
        seen.add(module.id);
        modules.push(module);
      }
    }

    return modules;
  }

  /**
   * 查找单个匹配模块
   */
  private findMatchingModule(codeMap: CodeMap, target: string): ModuleInfo | undefined {
    return codeMap.modules.find(module => {
      const relativePath = this.toRelativePath(codeMap, module.absolutePath);
      return module.absolutePath.includes(target) || relativePath.includes(target);
    });
  }

  /**
   * 构建 link dependency analysis
   */
  private buildLinkDependencyAnalysis(codeMap: CodeMap, targets: string[]): LinkDependencyAnalysisItem[] {
    return this.findMatchingModules(codeMap, targets).map(module => ({
      file: this.toRelativePath(codeMap, module.absolutePath),
      location: {
        file: this.toRelativePath(codeMap, module.absolutePath),
        line: 1,
        column: 1
      },
      imports: module.dependencies,
      importedBy: module.dependents.map(id => {
        const dependent = codeMap.modules.find(candidate => candidate.id === id);
        return dependent ? this.toRelativePath(codeMap, dependent.absolutePath) : id;
      }),
      cycles: []
    }));
  }

  /**
   * 构建 link reference analysis
   */
  private buildLinkReferenceAnalysis(
    codeMap: CodeMap,
    targets: string[],
    keywords: string[]
  ): LinkReferenceAnalysisItem[] {
    const items: LinkReferenceAnalysisItem[] = [];

    for (const module of this.findMatchingModules(codeMap, targets)) {
      items.push(this.buildModuleReferenceItem(codeMap, module));
    }

    for (const keyword of keywords) {
      items.push(this.buildKeywordReferenceItem(codeMap, keyword));
    }

    const merged = new Map<string, LinkReferenceAnalysisItem>();
    for (const item of items) {
      const existing = merged.get(item.target);
      if (!existing) {
        merged.set(item.target, item);
        continue;
      }

      merged.set(item.target, {
        target: item.target,
        callers: Array.from(new Set([...existing.callers, ...item.callers])),
        callees: Array.from(new Set([...existing.callees, ...item.callees])),
        matches: [...existing.matches, ...item.matches]
      });
    }

    return Array.from(merged.values());
  }

  /**
   * 基于模块构建 reference item
   */
  private buildModuleReferenceItem(codeMap: CodeMap, module: ModuleInfo): LinkReferenceAnalysisItem {
    const relativePath = this.toRelativePath(codeMap, module.absolutePath);
    const exportedSymbols = new Set(module.exports.map(exp => exp.name));
    const matchTokens = new Set([
      relativePath,
      this.stripModuleExtension(relativePath),
      path.basename(relativePath),
      this.stripModuleExtension(path.basename(relativePath)),
      module.id
    ]);

    const callers = new Set<string>();
    const matches: LinkReferenceAnalysisItem['matches'] = [];

    for (const candidate of codeMap.modules) {
      if (candidate.id === module.id) {
        continue;
      }

      const candidatePath = this.toRelativePath(codeMap, candidate.absolutePath);
      for (const entry of candidate.imports) {
        const sourceMatched = this.matchesModuleSource(entry.source, matchTokens);
        const symbolMatched = entry.specifiers.some(specifier => exportedSymbols.has(specifier.name));
        if (!sourceMatched && !symbolMatched) {
          continue;
        }

        callers.add(candidatePath);
        matches.push({
          file: candidatePath,
          line: 1,
          snippet: entry.source
        });
      }
    }

    return {
      target: relativePath,
      callers: Array.from(callers),
      callees: module.dependencies,
      matches
    };
  }

  /**
   * 基于关键词构建 reference item
   */
  private buildKeywordReferenceItem(codeMap: CodeMap, keyword: string): LinkReferenceAnalysisItem {
    const callers = new Set<string>();
    const callees = new Set<string>();
    const matches: LinkReferenceAnalysisItem['matches'] = [];

    for (const module of codeMap.modules) {
      const relativePath = this.toRelativePath(codeMap, module.absolutePath);
      const definesKeyword = module.exports.some(exp => exp.name === keyword)
        || module.symbols.some(symbol => symbol.name === keyword);

      if (definesKeyword) {
        callees.add(relativePath);
      }

      for (const entry of module.imports) {
        const sourceMatched = entry.source.toLowerCase().includes(keyword.toLowerCase());
        const specifierMatched = entry.specifiers.some(specifier => specifier.name === keyword || specifier.alias === keyword);
        if (!sourceMatched && !specifierMatched) {
          continue;
        }

        callers.add(relativePath);
        matches.push({
          file: relativePath,
          line: 1,
          snippet: entry.source
        });
      }
    }

    return {
      target: keyword,
      callers: Array.from(callers),
      callees: Array.from(callees),
      matches
    };
  }

  /**
   * 将 reference analysis 转为 results
   */
  private buildReferenceResults(items: LinkReferenceAnalysisItem[]): UnifiedResult[] {
    return items.map(item => ({
      id: `reference-${item.target}`,
      source: 'codemap',
      toolScore: 0.8,
      type: 'symbol',
      file: item.matches[0]?.file ?? item.callees[0] ?? item.target,
      line: item.matches[0]?.line ?? 1,
      location: {
        file: item.matches[0]?.file ?? item.callees[0] ?? item.target,
        line: item.matches[0]?.line ?? 1,
        column: 1
      },
      content: `发现 ${item.callers.length} 个引用方，${item.callees.length} 个关联目标`,
      relevance: Math.min(0.4 + item.callers.length * 0.1, 0.95),
      keywords: [item.target],
      metadata: {
        dependencies: item.callees,
        impactCount: item.callers.length,
        stability: true,
        riskLevel: item.callers.length > 10 ? 'high' : item.callers.length > 3 ? 'medium' : 'low'
      }
    }));
  }

  /**
   * 构建 show 结果
   */
  private buildShowResults(analysis: ShowAnalysis): UnifiedResult[] {
    const results: UnifiedResult[] = [];

    for (const section of analysis.overview ?? []) {
      results.push({
        id: `show-overview-${section.file}`,
        source: 'codemap',
        toolScore: 0.75,
        type: 'documentation',
        file: section.file,
        line: 1,
        location: {
          file: section.file,
          line: 1,
          column: 1
        },
        content: section.overview,
        relevance: 0.75,
        keywords: section.exports,
        metadata: {
          stability: true,
          riskLevel: 'low'
        }
      });
    }

    for (const section of analysis.documentation ?? []) {
      results.push({
        id: `show-documentation-${section.file}`,
        source: 'codemap',
        toolScore: 0.7,
        type: 'documentation',
        file: section.file,
        line: 1,
        location: {
          file: section.file,
          line: 1,
          column: 1
        },
        content: section.content,
        relevance: 0.7,
        keywords: [],
        metadata: {
          stability: true,
          riskLevel: 'low'
        }
      });
    }

    return this.mergeUnifiedResults(results);
  }

  /**
   * 转为相对路径
   */
  private toRelativePath(codeMap: CodeMap, filePath: string): string {
    return path.relative(codeMap.project.rootDir, filePath).replace(/\\/g, '/');
  }

  /**
   * 去除模块扩展名
   */
  private stripModuleExtension(value: string): string {
    return value.replace(/\.[cm]?[jt]sx?$/i, '');
  }

  /**
   * 判断 import source 是否引用目标模块
   */
  private matchesModuleSource(source: string, tokens: Set<string>): boolean {
    const normalizedSource = this.stripModuleExtension(source).replace(/\\/g, '/').toLowerCase();
    for (const token of tokens) {
      const normalizedToken = this.stripModuleExtension(token).replace(/\\/g, '/').toLowerCase();
      if (!normalizedToken) {
        continue;
      }
      if (
        normalizedSource === normalizedToken
        || normalizedSource.endsWith(normalizedToken)
        || normalizedSource.includes(normalizedToken)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * 为 UnifiedResult 添加 location 字段
   */
  private enrichWithLocation(results: UnifiedResult[]): UnifiedResult[] {
    return results.map(result => {
      // 如果已经有 line 字段，构建完整的 location
      if (result.line && result.line > 0) {
        const location: SourceLocation = {
          file: result.file,
          line: result.line,
          column: 1, // 默认列号
        };
        return { ...result, location };
      }
      // 否则只添加 file
      const location: SourceLocation = {
        file: result.file,
        line: 1,
        column: 1,
      };
      return { ...result, location };
    });
  }

  /**
   * 执行影响分析
   */
  private async executeImpact(scope: string, topK: number): Promise<CodemapOutput> {
    const command = new ImpactCommand();
    const args = {
      targets: this.args.targets || [],
      scope: scope as 'direct' | 'transitive',
    };

    const results = await command.runEnhanced(args);

    // 关联测试文件
    const resultsWithTests = await this.attachTestFiles(results);

    // 计算置信度
    const confidenceScore = this.calculateConfidence(resultsWithTests);
    const confidence: Confidence = {
      score: confidenceScore,
      level: confidenceScore >= 0.7 ? 'high' : confidenceScore >= 0.4 ? 'medium' : 'low',
    };

    // 添加 location 字段
    const resultsWithLocation = this.enrichWithLocation(resultsWithTests as UnifiedResult[]);

    const typedResults = resultsWithLocation;

    return {
      schemaVersion: 'v1.0.0',
      intent: 'read',
      tool: 'codemap-impact',
      confidence,
      results: typedResults.slice(0, topK),
      metadata: {
        total: resultsWithTests.length,
        scope,
        resultCount: typedResults.slice(0, topK).length,
      },
    };
  }

  /**
   * 计算置信度分数
   */
  private calculateConfidence(results: unknown[]): number {
    if (!results || results.length === 0) {
      return 0;
    }
    // 基于结果数量和质量计算置信度
    const resultCount = results.length;
    // 假设至少有结果的情况下，基础置信度为 0.5
    // 结果越多置信度越高
    const score = Math.min(0.5 + (resultCount / 10), 1);
    return Math.round(score * 100) / 100;
  }

  /**
   * 执行依赖分析
   */
  private async executeDeps(topK: number): Promise<CodemapOutput> {
    const command = new DepsCommand();
    const args = {
      targets: this.args.targets || [],
    };

    const results = await command.runEnhanced(args);

    // 关联测试文件
    const resultsWithTests = await this.attachTestFiles(results);

    // 计算置信度
    const confidenceScore = this.calculateConfidence(resultsWithTests);
    const confidence: Confidence = {
      score: confidenceScore,
      level: confidenceScore >= 0.7 ? 'high' : confidenceScore >= 0.4 ? 'medium' : 'low',
    };

    // 添加 location 字段
    const resultsWithLocation = this.enrichWithLocation(resultsWithTests as UnifiedResult[]);

    const typedResults = resultsWithLocation;

    return {
      schemaVersion: 'v1.0.0',
      intent: 'link',
      tool: 'codemap-deps',
      confidence,
      results: typedResults.slice(0, topK),
      metadata: {
        total: resultsWithTests.length,
        resultCount: typedResults.slice(0, topK).length,
      },
    };
  }

  /**
   * 执行复杂度分析
   */
  private async executeComplexity(topK: number): Promise<CodemapOutput> {
    const command = new ComplexityCommand();
    const args = {
      targets: this.args.targets || [],
    };

    const results = await command.runEnhanced(args);

    // 关联测试文件
    const resultsWithTests = await this.attachTestFiles(results);

    // 计算置信度
    const confidenceScore = this.calculateConfidence(resultsWithTests);
    const confidence: Confidence = {
      score: confidenceScore,
      level: confidenceScore >= 0.7 ? 'high' : confidenceScore >= 0.4 ? 'medium' : 'low',
    };

    // 添加 location 字段
    const resultsWithLocation = this.enrichWithLocation(resultsWithTests as UnifiedResult[]);

    const typedResults = resultsWithLocation;

    return {
      schemaVersion: 'v1.0.0',
      intent: 'read',
      tool: 'codemap-complexity',
      confidence,
      results: typedResults.slice(0, topK),
      metadata: {
        total: resultsWithTests.length,
        resultCount: typedResults.slice(0, topK).length,
      },
    };
  }

  /**
   * 关联测试文件
   */
  private async attachTestFiles(results: unknown[]): Promise<unknown[]> {
    if (!this.args.includeTests) {
      return results;
    }

    // 为每个结果附加测试文件信息
    for (const result of results as Array<{ file?: string; metadata?: Record<string, unknown> }>) {
      if (result.file) {
        const testFile = await resolveTestFile(result.file);
        if (testFile) {
          result.metadata = result.metadata || {};
          result.metadata.testFile = testFile;
        }
      }
    }

    return results;
  }

  /**
   * 打印人类可读输出
   */
  private printHumanOutput(results: unknown[], intent: string): void {
    console.log(chalk.bold(`\n📊 ${intent.toUpperCase()} 分析结果\n`));

    const resultsArray = results as Array<{
      file: string;
      line?: number;
      location?: SourceLocation;
      content: string;
      relevance: number;
      metadata?: Record<string, unknown>;
    }>;

    for (const result of resultsArray) {
      const lineInfo = result.location?.line ? `:${result.location.line}` : '';
      console.log(chalk.cyan(`📁 ${result.file}${lineInfo}`));
      console.log(`   ${result.content}`);
      console.log(chalk.gray(`   相关度: ${(result.relevance * 100).toFixed(1)}%`));
      if (result.metadata?.testFile) {
        console.log(chalk.green(`   🧪 测试: ${result.metadata.testFile}`));
      }
      console.log();
    }
  }
}

/**
 * 解析 CLI 参数
 */
function normalizeStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

export function parseAnalyzeArgs(argv: string[]): AnalyzeArgs {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: ANALYZE_PARSE_OPTIONS,
    });

    // 合并位置参数和 --targets 参数作为 targets
    const positionalTargets = positionals?.filter(p => !p.startsWith('-')) || [];
    const explicitTargets = normalizeStringArray(values.targets);
    const allTargets = [...explicitTargets, ...positionalTargets];
    const keywords = normalizeStringArray(values.keywords);

    return {
      intent: values.intent as AnalyzeArgs['intent'],
      targets: allTargets.length > 0 ? allTargets : undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      scope: values.scope as AnalyzeArgs['scope'],
      topK: values.topK ? parseInt(values.topK as string, 10) : undefined,
      includeTests: values['include-tests'] as boolean,
      includeGitHistory: values['include-git-history'] as boolean,
      json: values.json as boolean,
      human: values.human as boolean,
      structured: values.structured as boolean,
      outputMode: values['output-mode'] as AnalyzeArgs['outputMode'],
    };
  } catch {
    return {};
  }
}

/**
 * Human-readable renderer for analyze output (chalk + padEnd table pattern)
 */
function formatAnalyzeHuman(output: CodemapOutput): string {
  const lines: string[] = [];

  // Warnings
  for (const warning of output.warnings || []) {
    lines.push(chalk.yellow(`Warning: ${warning.message}`));
  }

  // Header
  const intentLabel = output.intent?.toUpperCase() || 'ANALYSIS';
  lines.push(chalk.bold(`\n${intentLabel} Analysis Results\n`));

  // Table header
  const TYPE_WIDTH = 12;
  const NAME_WIDTH = 30;
  const PATH_WIDTH = 40;
  const header =
    'TYPE'.padEnd(TYPE_WIDTH) +
    'NAME'.padEnd(NAME_WIDTH) +
    'PATH'.padEnd(PATH_WIDTH) +
    'RELEVANCE';
  lines.push(header);
  lines.push('-'.repeat(header.length));

  // Data rows
  for (const result of output.results || []) {
    const type = (result.type || '').padEnd(TYPE_WIDTH);
    const name = (result.id || '').substring(0, NAME_WIDTH - 1).padEnd(NAME_WIDTH);
    const lineInfo = result.location?.line ? `:${result.location.line}` : '';
    const filePath = `${result.file}${lineInfo}`.substring(0, PATH_WIDTH - 1).padEnd(PATH_WIDTH);
    const relevance = `${(result.relevance * 100).toFixed(1)}%`;
    lines.push(`${type}${name}${filePath}${relevance}`);
  }

  // Summary
  if (output.results.length > 0) {
    lines.push('');
  }
  lines.push(chalk.gray(`Tools: ${output.tool}, Confidence: ${output.confidence.level} (${output.confidence.score})`));

  return lines.join('\n');
}

/**
 * CLI 入口函数
 */
export async function analyzeCommand(argv: string[]): Promise<void> {
  // 过滤掉 'analyze' 命令名
  const filteredArgv = argv.filter(arg => arg !== 'analyze');
  const args = parseAnalyzeArgs(filteredArgv);

  // 显示帮助
  if (args.intent === 'help' || !args.intent) {
    printHelp();
    return;
  }

  // Resolve output mode: --human/--json/no-flag = TTY auto-detect
  const mode: OutputMode = resolveOutputMode({ json: args.json, human: args.human });
  const progress = createProgressEmitter(mode, 'Analyzing...');

  try {
    progress.update(10, 'Starting analysis...');
    const command = new AnalyzeCommand(args);
    const output = await command.execute() as CodemapOutput;

    // If structured mode, strip content field from results
    let data: CodemapOutput = output;
    if (args.structured) {
      const structuredOutput = JSON.parse(JSON.stringify(output)) as CodemapOutput;
      if (structuredOutput.results) {
        structuredOutput.results = structuredOutput.results.map(r => {
          const { content, ...rest } = r;
          void content;
          return rest as UnifiedResult;
        });
      }
      data = structuredOutput;
    }

    progress.complete();
    renderOutput(data, formatAnalyzeHuman, mode);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap analyze') + '\n');
    process.exitCode = 1;
  }
}

/**
 * 打印帮助信息
 */
function printHelp(): void {
  console.log(getAnalyzeHelpText());
}

// 导出类型
export type { AnalyzeArgs };
