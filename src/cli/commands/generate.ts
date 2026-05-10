// [META] since:2024-03 | owner:core-team | stable:true
// [WHY] 提供代码地图生成 CLI 命令，协调分析器和生成器创建项目文档
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import chalk from 'chalk';
import ora from 'ora';
import { analyze } from '../../core/analyzer.js';
import { buildAnalysisContext } from '../../composition/parser-composition.js';
import { generateAIMap, generateJSON, generateContext, generateMermaidGraph } from '../../generator/index.js';
import { resolveDataPath, resolveOutputDir } from '../paths.js';
import { storageFactory } from '../../infrastructure/storage/StorageFactory.js';
import { CodeGraphRepositoryImpl } from '../../infrastructure/repositories/CodeGraphRepositoryImpl.js';
import { Project } from '../../domain/entities/Project.js';
import { Module } from '../../domain/entities/Module.js';
import { Symbol as SymbolEntity } from '../../domain/entities/Symbol.js';
import { Dependency } from '../../domain/entities/Dependency.js';
import { CodeGraph } from '../../domain/entities/CodeGraph.js';
import { randomUUID } from 'crypto';
import { PluginSystem } from '../../plugins/index.js';
import type { AnalysisOptions, DependencyEdge, PluginDiagnostic, PluginExecutionReport } from '../../types/index.js';
import type { ModuleInfo } from '../../types/index.js';
import type { CodeMap, DependencyGraph, ModuleSymbol, ProjectSummary, SourceLocation } from '../../interface/types/index.js';
import type {
  IncrementalRefreshAffected,
  IncrementalRefreshDiagnostic,
  IncrementalRefreshDiagnosticCode,
  IncrementalRefreshStatus,
  IncrementalRefreshSummary,
  StorageConfig,
} from '../../interface/types/storage.js';
import { loadCodemapConfig } from '../config-loader.js';
import { formatError } from '../output/index.js';
import { collectIncrementalNeighborhood } from '../../infrastructure/storage/graph-helpers.js';

const execFileAsync = promisify(execFile);

export interface GenerateCommandOptionSources {
  mode?: string;
  output?: string;
}

export interface GenerateCommandOptions {
  mode?: string;
  output?: string;
  watch?: boolean;
  ai?: boolean;
  'ai-context'?: boolean;
  symbolLevel?: boolean;
  incremental?: boolean;
  changedFiles?: string[];
  base?: string;
  against?: string;
  json?: boolean;
  human?: boolean;
  structured?: boolean;
  __optionSources?: GenerateCommandOptionSources;
}

interface SpinnerLike {
  start(): SpinnerLike;
  stop(): SpinnerLike;
  succeed(text?: string): SpinnerLike;
  fail(text?: string): SpinnerLike;
  text: string;
}

interface GenerateCommandResult {
  status: IncrementalRefreshStatus;
  mode: 'full' | 'incremental';
  graph_status: 'complete' | 'partial';
  generated_at: string;
  storage_type: string;
  output_dir: string;
  refresh?: IncrementalRefreshSummary;
}

interface IncrementalScope {
  scopeSource: 'explicit' | 'git-diff';
  changedFiles: string[];
  diagnostics: IncrementalRefreshDiagnostic[];
}

class IncrementalRefreshFailure extends Error {
  constructor(public readonly result: GenerateCommandResult) {
    super(result.refresh?.diagnostics[0]?.message ?? 'Incremental refresh failed');
    this.name = 'IncrementalRefreshFailure';
  }
}

interface SymbolRegistryEntry {
  id: string;
  name: string;
  fileKey: string;
  line: number;
}

interface SymbolCallSite {
  callee: string;
  line: number;
  column?: number;
}

type DependencyEvidenceKind = 'direct-parser' | 'heuristic' | 'ambiguous-target';

function resolveDependencyConfidence(evidenceKind: DependencyEvidenceKind): Dependency['confidence'] {
  switch (evidenceKind) {
    case 'direct-parser':
      return 'EXTRACTED';
    case 'heuristic':
      return 'INFERRED';
    case 'ambiguous-target':
      return 'AMBIGUOUS';
  }
}

function hasExplicitOverride(value: unknown, source?: string): boolean {
  if (source === undefined) {
    return value !== undefined;
  }

  return source !== 'default';
}

function mergePluginDependencyEdges(existingEdges: DependencyEdge[], additionalEdges: DependencyEdge[]): DependencyEdge[] {
  const mergedEdges = [...existingEdges];
  const existingKeys = new Set(existingEdges.map((edge) => `${edge.from}:${edge.to}:${edge.type}`));

  for (const edge of additionalEdges) {
    const edgeKey = `${edge.from}:${edge.to}:${edge.type}`;
    if (!existingKeys.has(edgeKey)) {
      mergedEdges.push(edge);
      existingKeys.add(edgeKey);
    }
  }

  return mergedEdges;
}

function createPluginReport(
  loadedPlugins: string[],
  generatedFiles: string[],
  metrics: Record<string, unknown>,
  diagnostics: PluginDiagnostic[]
): PluginExecutionReport {
  return {
    loadedPlugins,
    generatedFiles,
    metrics,
    diagnostics,
  };
}

function resolvePluginOutputPath(outputDir: string, relativePath: string): string {
  const baseDir = path.resolve(outputDir);
  const absolutePath = path.resolve(baseDir, relativePath);

  if (absolutePath !== baseDir && !absolutePath.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error(`插件输出路径越界: ${relativePath}`);
  }

  return absolutePath;
}

async function writePluginGeneratedFiles(
  files: Array<{ path: string; content: string }>,
  outputDir: string
): Promise<{ writtenFiles: string[]; diagnostics: PluginDiagnostic[] }> {
  const writtenFiles: string[] = [];
  const diagnostics: PluginDiagnostic[] = [];

  for (const file of files) {
    try {
      const outputPath = resolvePluginOutputPath(outputDir, file.path);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, file.content);
      writtenFiles.push(path.relative(outputDir, outputPath));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      diagnostics.push({
        stage: 'generate',
        level: 'error',
        message: `插件输出文件写入失败 (${file.path}): ${reason}`,
      });
    }
  }

  return { writtenFiles, diagnostics };
}

function createGeneratedId(prefix: 'proj' | 'mod' | 'sym' | 'dep'): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function createSilentSpinner(): SpinnerLike {
  return {
    start() {
      return this;
    },
    stop() {
      return this;
    },
    succeed() {
      return this;
    },
    fail() {
      return this;
    },
    text: '',
  };
}

function suppressConsoleNoise(enabled: boolean): () => void {
  if (!enabled) {
    return () => undefined;
  }

  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = () => undefined;
  console.warn = () => undefined;
  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
  };
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/gu, '/');
}

function toAbsolutePath(rootDir: string, filePath: string): string {
  return normalizePath(path.resolve(rootDir, filePath));
}

function toRelativePattern(rootDir: string, filePath: string): string {
  return normalizePath(path.relative(rootDir, filePath));
}

function createRefreshDiagnostic(
  code: IncrementalRefreshDiagnosticCode,
  message: string,
): IncrementalRefreshDiagnostic {
  return { code, message };
}

function createEmptyAffected(): IncrementalRefreshAffected {
  return {
    changed: [],
    reused: [],
    recomputed: [],
    invalidated: [],
    failed: [],
  };
}

function createRefreshSummary(
  input: {
    status: IncrementalRefreshStatus;
    scopeSource: 'explicit' | 'git-diff';
    changedFiles: string[];
    reusedFiles: string[];
    recomputedFiles: string[];
    invalidatedFiles: string[];
    failedFiles: string[];
    diagnostics: IncrementalRefreshDiagnostic[];
    remediation?: string;
  },
): IncrementalRefreshSummary {
  const affected = createEmptyAffected();
  affected.changed = input.changedFiles.map((filePath) => ({
    path: filePath,
    reason: input.scopeSource === 'explicit' ? 'explicit changed file input' : 'git diff changed file',
  }));
  affected.reused = input.reusedFiles.map((filePath) => ({
    path: filePath,
    reason: 'outside invalidation boundary, reused existing truth',
  }));
  affected.recomputed = input.recomputedFiles.map((filePath) => ({
    path: filePath,
    reason: 'recomputed after 2-hop invalidation',
  }));
  affected.invalidated = input.invalidatedFiles.map((filePath) => ({
    path: filePath,
    reason: 'within 2-hop bidirectional invalidation boundary',
  }));
  affected.failed = input.failedFiles.map((filePath) => ({
    path: filePath,
    reason: 'recompute failed; kept previous persisted slice as stale truth',
  }));

  return {
    status: input.status,
    scopeSource: input.scopeSource,
    counts: {
      changed: input.changedFiles.length,
      reused: input.reusedFiles.length,
      recomputed: input.recomputedFiles.length,
      invalidated: input.invalidatedFiles.length,
      failed: input.failedFiles.length,
    },
    diagnostics: input.diagnostics,
    affected,
    remediation: input.remediation,
  };
}

function createResult(
  input: Omit<GenerateCommandResult, 'generated_at'> & { generatedAt?: string },
): GenerateCommandResult {
  return {
    ...input,
    generated_at: input.generatedAt ?? new Date().toISOString(),
  };
}

async function readCodeMapSnapshot(dataPath: string): Promise<CodeMap> {
  const snapshot = await fs.readFile(dataPath, 'utf8');
  return JSON.parse(snapshot) as CodeMap;
}

async function resolveIncrementalScope(options: GenerateCommandOptions, rootDir: string): Promise<IncrementalScope> {
  const diagnostics: IncrementalRefreshDiagnostic[] = [];

  if (options.changedFiles && options.changedFiles.length > 0) {
    if (options.base || options.against) {
      diagnostics.push(createRefreshDiagnostic(
        'INCREMENTAL_CHANGED_FILES_OVERRIDE',
        '--changed-files 已显式提供，忽略 --base/--against'
      ));
    }

    const changedFiles = options.changedFiles.map((filePath) => toAbsolutePath(rootDir, filePath));
    return {
      scopeSource: 'explicit',
      changedFiles,
      diagnostics,
    };
  }

  const diffBase = options.base ?? 'HEAD';
  const diffAgainst = options.against ?? '';
  const diffArgs = diffAgainst
    ? ['-C', rootDir, 'diff', '--name-only', `${diffBase}...${diffAgainst}`]
    : ['-C', rootDir, 'diff', '--name-only', diffBase];

  try {
    const { stdout } = await execFileAsync('git', diffArgs);
    const changedFiles = stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((filePath) => toAbsolutePath(rootDir, filePath));

    return {
      scopeSource: 'git-diff',
      changedFiles,
      diagnostics,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      scopeSource: 'git-diff',
      changedFiles: [],
      diagnostics: [
        createRefreshDiagnostic('INCREMENTAL_SCOPE_UNRELIABLE', `无法从 git diff 解析 changed files: ${message}`),
      ],
    };
  }
}

function normalizeFileKey(rootDir: string, filePath: string): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(rootDir, filePath);

  return path.relative(rootDir, absolutePath).replace(/\\/g, '/');
}

function normalizeSymbolLocation(modulePath: string, location: SourceLocation): SourceLocation {
  const shouldUseModulePath = !location.file
    || location.file === path.basename(modulePath)
    || !location.file.includes('/');

  return {
    ...location,
    file: shouldUseModulePath ? modulePath : location.file,
  };
}

function formatSymbolSignature(symbol: ModuleSymbol): string | undefined {
  if (!symbol.signature) {
    return undefined;
  }

  const parameters = symbol.signature.parameters
    .map((parameter) => `${parameter.name}${parameter.optional ? '?' : ''}: ${parameter.type}`)
    .join(', ');
  const genericParams = symbol.signature.genericParams?.length
    ? `<${symbol.signature.genericParams.join(', ')}>`
    : '';
  const asyncPrefix = symbol.signature.async ? 'async ' : '';

  return `${asyncPrefix}${symbol.name}${genericParams}(${parameters}) => ${symbol.signature.returnType}`;
}

function getRegistryKey(fileKey: string, name: string): string {
  return `${fileKey}::${name}`;
}

function registerSymbolEntry(
  registryByFileAndName: Map<string, SymbolRegistryEntry[]>,
  registryByName: Map<string, SymbolRegistryEntry[]>,
  registryByFileAndLine: Map<string, SymbolRegistryEntry[]>,
  entry: SymbolRegistryEntry
): void {
  const fileAndNameKey = getRegistryKey(entry.fileKey, entry.name);
  const fileAndLineKey = `${entry.fileKey}:${entry.line}`;

  registryByFileAndName.set(fileAndNameKey, [
    ...(registryByFileAndName.get(fileAndNameKey) ?? []),
    entry,
  ]);
  registryByName.set(entry.name, [
    ...(registryByName.get(entry.name) ?? []),
    entry,
  ]);
  registryByFileAndLine.set(fileAndLineKey, [
    ...(registryByFileAndLine.get(fileAndLineKey) ?? []),
    entry,
  ]);
}

function resolveCallTarget(
  moduleInfo: ModuleInfo,
  call: SymbolCallSite,
  rootDir: string,
  registryByFileAndName: Map<string, SymbolRegistryEntry[]>,
  registryByName: Map<string, SymbolRegistryEntry[]>,
  registryByFileAndLine: Map<string, SymbolRegistryEntry[]>
): SymbolRegistryEntry | null {
  const currentFileKey = normalizeFileKey(rootDir, moduleInfo.path);
  const localCandidates = registryByFileAndName.get(getRegistryKey(currentFileKey, call.callee)) ?? [];
  if (localCandidates.length === 1) {
    return localCandidates[0];
  }

  const crossFileMatches = moduleInfo.callGraph?.crossFileCalls?.filter(
    (candidate) => candidate.resolved && candidate.callee === call.callee
  ) ?? [];

  const crossFileCandidates = crossFileMatches.flatMap((candidate) => {
    const fileKey = normalizeFileKey(rootDir, candidate.calleeLocation.file);
    const byLine = registryByFileAndLine.get(`${fileKey}:${candidate.calleeLocation.line}`) ?? [];
    if (byLine.length > 0) {
      return byLine;
    }
    return registryByFileAndName.get(getRegistryKey(fileKey, call.callee)) ?? [];
  });

  if (crossFileCandidates.length === 1) {
    return crossFileCandidates[0];
  }

  const globalCandidates = registryByName.get(call.callee) ?? [];
  return globalCandidates.length === 1 ? globalCandidates[0] : null;
}

export async function generateCommand(options: GenerateCommandOptions) {
  if (options.structured && !options.json) {
    throw new Error('--structured 需要配合 --json 使用');
  }

  const outputMode = options.json ? 'json' : 'human';
  const spinner = (outputMode === 'json' ? createSilentSpinner() : ora('扫描项目文件...')).start();
  const restoreConsole = suppressConsoleNoise(outputMode === 'json');

  try {
    const rootDir = process.cwd();
    const loadedConfig = await loadCodemapConfig(rootDir);
    const mode = hasExplicitOverride(options.mode, options.__optionSources?.mode)
      ? (options.mode as AnalysisOptions['mode'])
      : loadedConfig.config.mode;
    const configuredOutput = hasExplicitOverride(options.output, options.__optionSources?.output)
      ? options.output
      : loadedConfig.config.output;
    const { outputDir, isLegacy } = resolveOutputDir(configuredOutput, rootDir);
    const runIncremental = options.incremental === true
      || (options.changedFiles?.length ?? 0) > 0
      || Boolean(options.base)
      || Boolean(options.against);

    if (outputMode === 'human') {
      console.log(chalk.blue('🔍 使用默认 parser 主路径生成代码地图...'));
    }

    if (outputMode === 'human' && isLegacy) {
      console.warn(chalk.yellow('⚠️  检测到使用旧目录 .codemap，请迁移到 .mycodemap'));
    }

    if (outputMode === 'human' && loadedConfig.exists && loadedConfig.isLegacy) {
      console.warn(chalk.yellow('⚠️  检测到旧配置文件 codemap.config.json，建议迁移到 mycodemap.config.json'));
    }

    const analysisOptions: AnalysisOptions = {
      mode,
      rootDir,
      include: loadedConfig.config.include,
      exclude: loadedConfig.config.exclude,
      output: configuredOutput || '.mycodemap',
      watch: loadedConfig.config.watch,
    };

    let result: GenerateCommandResult;

    if (runIncremental) {
      if (loadedConfig.hasExplicitPluginConfig) {
        const refresh = createRefreshSummary({
          status: 'failed',
          scopeSource: options.changedFiles?.length ? 'explicit' : 'git-diff',
          changedFiles: [],
          reusedFiles: [],
          recomputedFiles: [],
          invalidatedFiles: [],
          failedFiles: [],
          diagnostics: [
            createRefreshDiagnostic(
              'INCREMENTAL_FULL_REBUILD_REQUIRED',
              '插件参与的 generate 当前不支持 scoped incremental refresh，请先运行完整 generate。'
            ),
          ],
          remediation: 'Run `mycodemap generate --symbol-level` to rebuild full truth.',
        });
        throw new IncrementalRefreshFailure(createResult({
          status: 'failed',
          mode: 'incremental',
          graph_status: 'partial',
          storage_type: String(loadedConfig.config.storage.type),
          output_dir: outputDir,
          refresh,
        }));
      }

      spinner.text = '解析 changed files 与增量范围...';
      result = await runIncrementalGenerate({
        options,
        analysisOptions,
        outputDir,
        storageConfig: loadedConfig.config.storage,
      });
      if (outputMode === 'human') {
        spinner.succeed(chalk.green(
          result.status === 'partial' ? '⚠️ 增量刷新完成（partial）' : '✅ 增量刷新完成！'
        ));
      }
    } else {
      const codeMap = await analyze({
        ...analysisOptions,
        ...buildAnalysisContext(analysisOptions.rootDir, analysisOptions.enhanceTypes ?? true),
      });
      let pluginReport: PluginExecutionReport | undefined;

      if (loadedConfig.hasExplicitPluginConfig) {
        const pluginSystem = new PluginSystem(loadedConfig.config);
        const pluginDiagnostics: PluginDiagnostic[] = [];
        let loadedPlugins: string[] = [];
        let generatedPluginFiles: string[] = [];
        let pluginMetrics: Record<string, unknown> = {};

        try {
          pluginDiagnostics.push(...await pluginSystem.initialize(loadedConfig.config.plugins));

          const pluginAnalyzeRun = await pluginSystem.runAnalyze(codeMap.modules);
          codeMap.dependencies.edges = mergePluginDependencyEdges(
            codeMap.dependencies.edges,
            pluginAnalyzeRun.additionalEdges
          );
          pluginMetrics = pluginAnalyzeRun.mergedMetrics;
          pluginDiagnostics.push(...pluginAnalyzeRun.diagnostics);

          const pluginGenerateRun = await pluginSystem.runGenerate(codeMap);
          const writtenPluginFiles = await writePluginGeneratedFiles(pluginGenerateRun.allFiles, outputDir);
          generatedPluginFiles = writtenPluginFiles.writtenFiles;
          pluginDiagnostics.push(...pluginGenerateRun.diagnostics, ...writtenPluginFiles.diagnostics);
          loadedPlugins = pluginSystem.getLoadedPlugins();
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          pluginDiagnostics.push({
            stage: 'generate',
            level: 'error',
            message: `插件运行时主流程失败: ${reason}`,
          });
        } finally {
          try {
            await pluginSystem.dispose();
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            pluginDiagnostics.push({
              stage: 'generate',
              level: 'error',
              message: `插件系统释放失败: ${reason}`,
            });
          }
        }

        pluginReport = createPluginReport(loadedPlugins, generatedPluginFiles, pluginMetrics, pluginDiagnostics);
        codeMap.pluginReport = pluginReport;
      }

      spinner.text = '生成输出文件...';
      await generateAIMap(codeMap, outputDir);
      await generateJSON(codeMap, outputDir);
      await generateMermaidGraph(codeMap, outputDir);
      await generateContext(codeMap, outputDir);

      spinner.text = '保存到代码图存储...';
      const storageSaveResult = await saveToCodeGraphStorage(
        codeMap,
        loadedConfig.config.storage,
        options.symbolLevel === true
      );

      result = createResult({
        status: 'success',
        mode: 'full',
        graph_status: codeMap.graphStatus ?? 'complete',
        storage_type: storageSaveResult.storageType,
        output_dir: outputDir,
        generatedAt: codeMap.generatedAt,
      });

      if (outputMode === 'human') {
        spinner.succeed(chalk.green('✅ 代码地图生成完成！'));
        logHumanGenerateSummary(codeMap, storageSaveResult.storageType, pluginReport);
      }
    }

    emitGenerateResult(result, outputMode, options.structured === true);
    return result;
  } catch (error) {
    if (error instanceof IncrementalRefreshFailure) {
      if (outputMode === 'human') {
        spinner.fail(chalk.red('❌ 增量刷新失败'));
      }
      emitGenerateResult(error.result, outputMode, options.structured === true);
    } else {
      if (outputMode === 'human') {
        spinner.fail(chalk.red('❌ 生成失败'));
      }
      console.error(formatError(error, outputMode, 'mycodemap generate'));
    }
    process.exit(1);
  } finally {
    restoreConsole();
  }
}

function emitGenerateResult(
  result: GenerateCommandResult,
  outputMode: 'human' | 'json',
  structured: boolean,
): void {
  if (outputMode === 'human') {
    if (result.mode === 'incremental' && result.refresh) {
      console.log(chalk.gray('\n🔄 增量刷新摘要:'));
      console.log(chalk.gray(`   状态: ${result.refresh.status}`));
      console.log(chalk.gray(`   changed/reused/recomputed/invalidated/failed: ${result.refresh.counts.changed}/${result.refresh.counts.reused}/${result.refresh.counts.recomputed}/${result.refresh.counts.invalidated}/${result.refresh.counts.failed}`));
      if (result.refresh.diagnostics.length > 0) {
        console.log(chalk.gray('   diagnostics:'));
        for (const diagnostic of result.refresh.diagnostics) {
          console.log(chalk.gray(`   - ${diagnostic.code}: ${diagnostic.message}`));
        }
      }
    }
    return;
  }

  const payload = structured
    ? result
    : {
        status: result.status,
        mode: result.mode,
        graph_status: result.graph_status,
        generated_at: result.generated_at,
        storage_type: result.storage_type,
        output_dir: result.output_dir,
        refresh: result.refresh,
      };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function logHumanGenerateSummary(
  codeMap: CodeMap,
  storageType: string,
  pluginReport?: PluginExecutionReport,
): void {
  console.log(chalk.gray('\n📊 项目统计:'));
  console.log(chalk.gray(`   文件总数: ${codeMap.summary.totalFiles}`));
  console.log(chalk.gray(`   代码行数: ${codeMap.summary.totalLines}`));
  console.log(chalk.gray(`   模块数量: ${codeMap.summary.totalModules}`));
  console.log(chalk.gray(`   导出符号: ${codeMap.summary.totalExports}`));
  console.log(chalk.gray(
    `   图状态: ${codeMap.graphStatus ?? 'complete'}`
    + (codeMap.failedFileCount && codeMap.failedFileCount > 0
      ? ` (${codeMap.failedFileCount} 个文件失败)`
      : '')
  ));

  console.log(chalk.gray('\n📁 输出文件:'));
  console.log(chalk.gray('   AI_MAP.md'));
  console.log(chalk.gray('   codemap.json'));
  console.log(chalk.gray('   dependency-graph.md'));
  console.log(chalk.gray(`   context/ (${codeMap.summary.totalFiles} 个文件)`));
  console.log(chalk.gray(`   治理图存储 (${storageType})`));

  if (!pluginReport) {
    return;
  }

  console.log(chalk.gray('\n🔌 插件摘要:'));
  console.log(chalk.gray(`   已加载插件: ${pluginReport.loadedPlugins.length > 0 ? pluginReport.loadedPlugins.join(', ') : '0 个'}`));
  console.log(chalk.gray(`   插件生成文件: ${pluginReport.generatedFiles.length}`));

  if (pluginReport.diagnostics.length > 0) {
    console.warn(chalk.yellow(`⚠️  插件诊断: ${pluginReport.diagnostics.length} 条`));
    for (const diagnostic of pluginReport.diagnostics.slice(0, 5)) {
      const pluginLabel = diagnostic.plugin ? `${diagnostic.plugin} / ` : '';
      console.warn(chalk.yellow(`   - ${pluginLabel}${diagnostic.stage}: ${diagnostic.message}`));
    }
  }
}

async function runIncrementalGenerate(input: {
  options: GenerateCommandOptions;
  analysisOptions: AnalysisOptions;
  outputDir: string;
  storageConfig: StorageConfig;
}): Promise<GenerateCommandResult> {
  const { options, analysisOptions, outputDir, storageConfig } = input;
  const rootDir = analysisOptions.rootDir;
  const dataPath = resolveDataPath(rootDir, analysisOptions.output);
  const storage = await storageFactory.createForProject(rootDir, storageConfig);

  try {
    const previousGraph = await storage.loadCodeGraph().catch(() => null);
    if (!previousGraph) {
      const refresh = createRefreshSummary({
        status: 'failed',
        scopeSource: options.changedFiles?.length ? 'explicit' : 'git-diff',
        changedFiles: [],
        reusedFiles: [],
        recomputedFiles: [],
        invalidatedFiles: [],
        failedFiles: [],
        diagnostics: [
          createRefreshDiagnostic(
            'INCREMENTAL_FULL_REBUILD_REQUIRED',
            '未检测到已持久化 graph truth，不能安全执行 scoped incremental refresh。'
          ),
        ],
        remediation: 'Run `mycodemap generate --symbol-level` to create the initial full graph.',
      });
      throw new IncrementalRefreshFailure(createResult({
        status: 'failed',
        mode: 'incremental',
        graph_status: 'partial',
        storage_type: String(storage.type),
        output_dir: outputDir,
        refresh,
      }));
    }

    const previousCodeMap = await readCodeMapSnapshot(dataPath).catch(() => null);
    if (!previousCodeMap) {
      const refresh = createRefreshSummary({
        status: 'failed',
        scopeSource: options.changedFiles?.length ? 'explicit' : 'git-diff',
        changedFiles: [],
        reusedFiles: [],
        recomputedFiles: [],
        invalidatedFiles: [],
        failedFiles: [],
        diagnostics: [
          createRefreshDiagnostic(
            'INCREMENTAL_FULL_REBUILD_REQUIRED',
            '缺少现有 codemap.json，不能证明 direct-execution truth 与 SQLite truth 同步。'
          ),
        ],
        remediation: 'Run `mycodemap generate --symbol-level` to rebuild both SQLite and codemap.json truth.',
      });
      throw new IncrementalRefreshFailure(createResult({
        status: 'failed',
        mode: 'incremental',
        graph_status: previousGraph.graphStatus ?? 'partial',
        storage_type: String(storage.type),
        output_dir: outputDir,
        refresh,
      }));
    }

    const scope = await resolveIncrementalScope(options, rootDir);
    const changedFiles = Array.from(new Set(scope.changedFiles));
    const existingModulePaths = new Set(previousGraph.modules.map((module) => normalizePath(module.path)));
    const missingChangedFile = changedFiles.find((filePath) => !existingModulePaths.has(filePath));

    if (scope.diagnostics.some((diagnostic) => diagnostic.code === 'INCREMENTAL_SCOPE_UNRELIABLE')) {
      const refresh = createRefreshSummary({
        status: 'failed',
        scopeSource: scope.scopeSource,
        changedFiles: changedFiles.map((filePath) => toRelativePattern(rootDir, filePath)),
        reusedFiles: [],
        recomputedFiles: [],
        invalidatedFiles: [],
        failedFiles: [],
        diagnostics: scope.diagnostics,
        remediation: 'Run `mycodemap generate --symbol-level` to perform a full rebuild.',
      });
      throw new IncrementalRefreshFailure(createResult({
        status: 'failed',
        mode: 'incremental',
        graph_status: previousGraph.graphStatus ?? 'partial',
        storage_type: String(storage.type),
        output_dir: outputDir,
        refresh,
      }));
    }

    if (changedFiles.length === 0) {
      const refresh = createRefreshSummary({
        status: 'failed',
        scopeSource: scope.scopeSource,
        changedFiles: [],
        reusedFiles: [],
        recomputedFiles: [],
        invalidatedFiles: [],
        failedFiles: [],
        diagnostics: [
          ...scope.diagnostics,
          createRefreshDiagnostic('INCREMENTAL_SCOPE_EMPTY', 'changed-file set 为空，拒绝静默退化为 full generate。'),
        ],
        remediation: 'Provide --changed-files or make workspace changes, otherwise run full generate explicitly.',
      });
      throw new IncrementalRefreshFailure(createResult({
        status: 'failed',
        mode: 'incremental',
        graph_status: previousGraph.graphStatus ?? 'partial',
        storage_type: String(storage.type),
        output_dir: outputDir,
        refresh,
      }));
    }

    if (missingChangedFile) {
      const refresh = createRefreshSummary({
        status: 'failed',
        scopeSource: scope.scopeSource,
        changedFiles: changedFiles.map((filePath) => toRelativePattern(rootDir, filePath)),
        reusedFiles: [],
        recomputedFiles: [],
        invalidatedFiles: [],
        failedFiles: [],
        diagnostics: [
          ...scope.diagnostics,
          createRefreshDiagnostic(
            'INCREMENTAL_INVALIDATION_BOUNDARY_UNRESOLVED',
            `changed file 不在当前 persisted graph truth 中: ${toRelativePattern(rootDir, missingChangedFile)}`
          ),
        ],
        remediation: 'Run `mycodemap generate --symbol-level` to rebuild full truth before retrying incremental refresh.',
      });
      throw new IncrementalRefreshFailure(createResult({
        status: 'failed',
        mode: 'incremental',
        graph_status: previousGraph.graphStatus ?? 'partial',
        storage_type: String(storage.type),
        output_dir: outputDir,
        refresh,
      }));
    }

    const neighborhood = collectIncrementalNeighborhood(previousGraph, changedFiles);
    const invalidatedPaths = Array.from(new Set(neighborhood.invalidatedModulePaths));
    if (invalidatedPaths.length === 0) {
      const refresh = createRefreshSummary({
        status: 'failed',
        scopeSource: scope.scopeSource,
        changedFiles: changedFiles.map((filePath) => toRelativePattern(rootDir, filePath)),
        reusedFiles: [],
        recomputedFiles: [],
        invalidatedFiles: [],
        failedFiles: [],
        diagnostics: [
          ...scope.diagnostics,
          createRefreshDiagnostic(
            'INCREMENTAL_INVALIDATION_BOUNDARY_UNRESOLVED',
            '未能从 persisted graph truth 推导有效的 2-hop invalidation boundary。'
          ),
        ],
        remediation: 'Run `mycodemap generate --symbol-level` to perform a full rebuild.',
      });
      throw new IncrementalRefreshFailure(createResult({
        status: 'failed',
        mode: 'incremental',
        graph_status: previousGraph.graphStatus ?? 'partial',
        storage_type: String(storage.type),
        output_dir: outputDir,
        refresh,
      }));
    }

    const symbolLevel = options.symbolLevel === true || previousGraph.dependencies.some(
      (dependency) => dependency.sourceEntityType === 'symbol' || dependency.targetEntityType === 'symbol'
    );
    const incrementalCodeMap = await analyze({
      ...analysisOptions,
      include: invalidatedPaths.map((filePath) => toRelativePattern(rootDir, filePath)),
      ...buildAnalysisContext(rootDir, analysisOptions.enhanceTypes ?? true),
    });

    const recomputedPaths = Array.from(new Set(
      incrementalCodeMap.modules.map((moduleInfo) => normalizePath(moduleInfo.absolutePath || moduleInfo.path))
    ));
    const failedPaths = invalidatedPaths.filter((filePath) => !recomputedPaths.includes(filePath));
    const invalidatedSet = new Set(invalidatedPaths);
    const recomputedSet = new Set(recomputedPaths);
    const oldFailureSet = new Set(
      (previousCodeMap.parseFailureFiles ?? []).map((filePath) => toAbsolutePath(rootDir, filePath))
    );
    const retainedOldFailures = Array.from(oldFailureSet).filter((filePath) => !recomputedSet.has(filePath));
    const mergedFailurePaths = Array.from(new Set([
      ...retainedOldFailures,
      ...failedPaths,
    ])).sort();

    const previousModules = previousCodeMap.modules.filter(
      (moduleInfo) => !recomputedSet.has(normalizePath(moduleInfo.absolutePath || moduleInfo.path))
    );
    const mergedModules = [
      ...previousModules,
      ...incrementalCodeMap.modules,
    ].sort((left, right) => normalizePath(left.path).localeCompare(normalizePath(right.path)));

    const reusedFiles = previousCodeMap.modules
      .map((moduleInfo) => normalizePath(moduleInfo.absolutePath || moduleInfo.path))
      .filter((filePath) => !invalidatedSet.has(filePath))
      .sort();
    const refreshStatus: IncrementalRefreshStatus = recomputedPaths.length === 0
      ? 'failed'
      : failedPaths.length > 0
        ? 'partial'
        : 'success';
    const diagnostics = [...scope.diagnostics];
    if (failedPaths.length > 0) {
      diagnostics.push(createRefreshDiagnostic(
        'INCREMENTAL_PARTIAL_SLICE_FAILURE',
        `共有 ${failedPaths.length} 个 slice 重算失败，已保留旧 truth。`
      ));
    }
    diagnostics.push(createRefreshDiagnostic(
      'INCREMENTAL_SNAPSHOT_REPLACED',
      '已保留单个 pre-refresh snapshot，并用最新 refresh 覆盖旧 snapshot。'
    ));
    const remediation = refreshStatus === 'failed'
      ? 'Run `mycodemap generate --symbol-level` to perform a full rebuild.'
      : undefined;

    const mergedCodeMap: CodeMap = {
      ...previousCodeMap,
      generatedAt: new Date().toISOString(),
      modules: mergedModules,
      summary: calculateProjectSummary(mergedModules),
      dependencies: buildDependencyGraphForModules(mergedModules),
      graphStatus: mergedFailurePaths.length > 0 ? 'partial' : 'complete',
      failedFileCount: mergedFailurePaths.length,
      parseFailureFiles: mergedFailurePaths.map((filePath) => toRelativePattern(rootDir, filePath)),
    };
    mergedCodeMap.lastRefresh = createRefreshSummary({
      status: refreshStatus,
      scopeSource: scope.scopeSource,
      changedFiles: changedFiles.map((filePath) => toRelativePattern(rootDir, filePath)),
      reusedFiles: reusedFiles.map((filePath) => toRelativePattern(rootDir, filePath)),
      recomputedFiles: recomputedPaths.map((filePath) => toRelativePattern(rootDir, filePath)),
      invalidatedFiles: invalidatedPaths.map((filePath) => toRelativePattern(rootDir, filePath)),
      failedFiles: failedPaths.map((filePath) => toRelativePattern(rootDir, filePath)),
      diagnostics,
      remediation,
    });

    const repository = new CodeGraphRepositoryImpl(storage);
    const mergedGraph = convertToCodeGraph(mergedCodeMap, { symbolLevel });
    try {
      await repository.saveWithRefreshSummary(mergedGraph, mergedCodeMap.lastRefresh);
    } catch (error) {
      const refresh = createRefreshSummary({
        status: 'failed',
        scopeSource: scope.scopeSource,
        changedFiles: changedFiles.map((filePath) => toRelativePattern(rootDir, filePath)),
        reusedFiles: reusedFiles.map((filePath) => toRelativePattern(rootDir, filePath)),
        recomputedFiles: recomputedPaths.map((filePath) => toRelativePattern(rootDir, filePath)),
        invalidatedFiles: invalidatedPaths.map((filePath) => toRelativePattern(rootDir, filePath)),
        failedFiles: failedPaths.map((filePath) => toRelativePattern(rootDir, filePath)),
        diagnostics: [
          ...diagnostics,
          createRefreshDiagnostic(
            'INCREMENTAL_WRITEBACK_FAILED',
            error instanceof Error ? error.message : String(error)
          ),
        ],
        remediation: 'Run `mycodemap generate --symbol-level` to restore persisted truth.',
      });
      throw new IncrementalRefreshFailure(createResult({
        status: 'failed',
        mode: 'incremental',
        graph_status: mergedCodeMap.graphStatus ?? 'partial',
        storage_type: String(storage.type),
        output_dir: outputDir,
        refresh,
      }));
    }

    await generateJSON(mergedCodeMap, outputDir);
    await generateAIMap(mergedCodeMap, outputDir);
    await generateMermaidGraph(mergedCodeMap, outputDir);
    await generateContext(mergedCodeMap, outputDir);

    return createResult({
      status: refreshStatus,
      mode: 'incremental',
      graph_status: mergedCodeMap.graphStatus ?? 'complete',
      storage_type: String(storage.type),
      output_dir: outputDir,
      generatedAt: mergedCodeMap.generatedAt,
      refresh: mergedCodeMap.lastRefresh,
    });
  } finally {
    await storage.close();
  }
}

/**
 * 将旧版 CodeMap 转换为 MVP3 CodeGraph 并保存到 storage
 */
async function saveToCodeGraphStorage(codeMap: {
  project: { name: string; rootDir: string };
  modules: ModuleInfo[];
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
}, storageConfig: StorageConfig, symbolLevel: boolean): Promise<{ storageType: string }> {
  const storage = await storageFactory.createForProject(
    process.cwd(),
    storageConfig
  );

  try {
    const codeGraph = convertToCodeGraph(codeMap, { symbolLevel });
    const repository = new CodeGraphRepositoryImpl(storage);
    await repository.save(codeGraph);

    return {
      storageType: storage.type,
    };
  } finally {
    await storage.close();
  }
}

/**
 * 转换旧版 ModuleInfo 为 MVP3 CodeGraph
 */
function convertToCodeGraph(codeMap: {
  project: { name: string; rootDir: string };
  modules: ModuleInfo[];
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
}, options: { symbolLevel: boolean }): CodeGraph {
  // 创建项目
  const project = new Project(
    createGeneratedId('proj'),
    codeMap.project.name,
    codeMap.project.rootDir
  );

  const codeGraph = new CodeGraph(project);
  codeGraph.graphStatus = codeMap.graphStatus ?? 'complete';
  codeGraph.failedFileCount = codeMap.failedFileCount ?? 0;
  codeGraph.parseFailureFiles = [...(codeMap.parseFailureFiles ?? [])];
  const moduleIdMap = new Map<string, string>(); // path -> id
  const symbolRegistryByFileAndName = new Map<string, SymbolRegistryEntry[]>();
  const symbolRegistryByName = new Map<string, SymbolRegistryEntry[]>();
  const symbolRegistryByFileAndLine = new Map<string, SymbolRegistryEntry[]>();

  // 第一遍：创建模块
  for (const mod of codeMap.modules) {
    const moduleId = createGeneratedId('mod');
    moduleIdMap.set(mod.path, moduleId);

    const module = new Module(
      moduleId,
      project.id,
      mod.path,
      detectLanguage(mod.path),
      {
        lines: mod.stats.lines,
        codeLines: mod.stats.codeLines,
        commentLines: mod.stats.commentLines,
        blankLines: mod.stats.blankLines,
      }
    );

    codeGraph.addModule(module);
  }

  // 第二遍：创建符号
  for (const mod of codeMap.modules) {
    const moduleId = moduleIdMap.get(mod.path);
    if (!moduleId) continue;

    for (const symbol of mod.symbols) {
      const normalizedLocation = normalizeSymbolLocation(mod.path, symbol.location);
      const symbolEntity = new SymbolEntity(
        createGeneratedId('sym'),
        moduleId,
        symbol.name,
        symbol.kind,
        normalizedLocation,
        symbol.visibility,
        formatSymbolSignature(symbol)
      );
      codeGraph.addSymbol(symbolEntity);

      const registryEntry: SymbolRegistryEntry = {
        id: symbolEntity.id,
        name: symbolEntity.name,
        fileKey: normalizeFileKey(codeMap.project.rootDir, normalizedLocation.file),
        line: normalizedLocation.line,
      };
      registerSymbolEntry(
        symbolRegistryByFileAndName,
        symbolRegistryByName,
        symbolRegistryByFileAndLine,
        registryEntry
      );
    }
  }

  // 第三遍：创建依赖关系
  for (const mod of codeMap.modules) {
    const sourceId = moduleIdMap.get(mod.path);
    if (!sourceId) continue;

    for (const depPath of mod.dependencies) {
      const targetId = moduleIdMap.get(depPath);
      if (!targetId) continue; // 外部依赖，跳过

      const dependency = new Dependency(
        createGeneratedId('dep'),
        sourceId,
        targetId,
        'import',
        'module',
        'module',
        resolveDependencyConfidence('direct-parser')
      );

      try {
        codeGraph.addDependency(dependency);
      } catch {
        // 依赖已存在，忽略
      }
    }
  }

  if (options.symbolLevel) {
    for (const mod of codeMap.modules) {
      const currentFileKey = normalizeFileKey(codeMap.project.rootDir, mod.path);

      for (const symbol of mod.symbols) {
        const sourceCandidates = symbolRegistryByFileAndName.get(getRegistryKey(currentFileKey, symbol.name)) ?? [];
        if (sourceCandidates.length !== 1 || !symbol.signature?.calls) {
          continue;
        }

        const sourceEntry = sourceCandidates[0];
        for (const call of symbol.signature.calls) {
          const targetEntry = resolveCallTarget(
            mod,
            call,
            codeMap.project.rootDir,
            symbolRegistryByFileAndName,
            symbolRegistryByName,
            symbolRegistryByFileAndLine
          );

          if (!targetEntry || targetEntry.id === sourceEntry.id) {
            continue;
          }

          try {
            codeGraph.addDependency(new Dependency(
              createGeneratedId('dep'),
              sourceEntry.id,
              targetEntry.id,
              'call',
              'symbol',
              'symbol',
              resolveDependencyConfidence('direct-parser'),
              mod.path,
              call.line
            ));
          } catch {
            // 跳过重复或无法验证的调用边
          }
        }
      }
    }
  }

  return codeGraph;
}

function buildDependencyGraphForModules(modules: ModuleInfo[]): DependencyGraph {
  const nodes: DependencyGraph['nodes'] = [];
  const edges: DependencyGraph['edges'] = [];
  const moduleIndex = new Map<string, ModuleInfo>();

  for (const mod of modules) {
    const absolutePath = normalizePath(mod.absolutePath || mod.path);
    const lookupKeys = buildLookupKeys(absolutePath);
    for (const key of lookupKeys) {
      moduleIndex.set(key, mod);
    }

    nodes.push({
      id: mod.id,
      path: mod.path,
      category: categorizeModule(mod.path),
    });
  }

  const edgeSet = new Set<string>();
  const moduleById = new Map(modules.map((mod) => [mod.id, mod] as const));
  for (const mod of modules) {
    mod.dependents = [];
    const fromPath = normalizePath(mod.absolutePath || mod.path);
    for (const depPath of mod.dependencies) {
      const targetModule = resolveDependencyModule(fromPath, depPath, moduleIndex);
      if (!targetModule || targetModule.id === mod.id) {
        continue;
      }

      const edgeKey = `${mod.id}->${targetModule.id}:import`;
      if (edgeSet.has(edgeKey)) {
        continue;
      }

      edgeSet.add(edgeKey);
      edges.push({
        from: mod.id,
        to: targetModule.id,
        type: 'import',
        weight: 1,
      });

      const target = moduleById.get(targetModule.id);
      if (target && !target.dependents.includes(mod.id)) {
        target.dependents.push(mod.id);
      }
    }
  }

  return { nodes, edges };
}

function calculateProjectSummary(modules: ModuleInfo[]): ProjectSummary {
  let totalLines = 0;
  let totalExports = 0;

  for (const mod of modules) {
    totalLines += mod.stats.lines;
    totalExports += mod.exports.length;
  }

  return {
    totalFiles: modules.length,
    totalLines,
    totalModules: modules.length,
    totalExports,
    totalTypes: modules.filter((moduleInfo) => moduleInfo.type === 'source').length,
  };
}

function buildLookupKeys(filePath: string): string[] {
  const withoutExt = stripKnownExt(filePath);
  const keys = new Set<string>([filePath, withoutExt]);

  if (withoutExt.endsWith('/index')) {
    keys.add(withoutExt.slice(0, -('/index'.length)));
  }

  return Array.from(keys);
}

function stripKnownExt(filePath: string): string {
  return filePath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/iu, '');
}

function resolveDependencyModule(
  importerPath: string,
  depPath: string,
  moduleIndex: Map<string, ModuleInfo>,
): ModuleInfo | undefined {
  const rawDependency = depPath.trim();
  const normalizedDependency = normalizePath(rawDependency);
  const candidates: string[] = [];

  if (
    rawDependency.startsWith('./')
    || rawDependency.startsWith('../')
    || rawDependency.startsWith('.\\')
    || rawDependency.startsWith('..\\')
  ) {
    candidates.push(normalizePath(path.resolve(path.dirname(importerPath), rawDependency)));
  } else if (path.isAbsolute(normalizedDependency)) {
    candidates.push(normalizedDependency);
  } else {
    return undefined;
  }

  for (const candidate of candidates) {
    const withoutExt = stripKnownExt(candidate);
    const expanded = [
      candidate,
      withoutExt,
      `${withoutExt}.ts`,
      `${withoutExt}.tsx`,
      `${withoutExt}.js`,
      `${withoutExt}/index`,
      `${withoutExt}/index.ts`,
      `${withoutExt}/index.tsx`,
      `${withoutExt}/index.js`,
    ];

    for (const key of expanded) {
      const resolved = moduleIndex.get(normalizePath(key));
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

function categorizeModule(filePath: string): 'core' | 'feature' | 'utility' | 'external' {
  const lower = filePath.toLowerCase();
  if (lower.includes('core') || lower.includes('engine')) return 'core';
  if (lower.includes('feature') || lower.includes('module')) return 'feature';
  if (lower.includes('util') || lower.includes('helper')) return 'utility';
  return 'external';
}

/**
 * 根据文件路径检测语言
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';

  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'go': 'go',
    'java': 'java',
    'rs': 'rust',
    'cpp': 'cpp',
    'cc': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
  };

  return languageMap[ext] ?? 'unknown';
}
