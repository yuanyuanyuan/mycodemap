// [META] since:2024-03 | owner:core-team | stable:true
// [WHY] 提供代码地图生成 CLI 命令，协调分析器和生成器创建项目文档
import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { analyze } from '../../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext, generateMermaidGraph } from '../../generator/index.js';
import { resolveOutputDir } from '../paths.js';
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
import type { ModuleSymbol, SourceLocation } from '../../interface/types/index.js';
import type { StorageConfig } from '../../interface/types/storage.js';
import { loadCodemapConfig } from '../config-loader.js';

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
  __optionSources?: GenerateCommandOptionSources;
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
  const spinner = ora('扫描项目文件...').start();

  try {
    const loadedConfig = await loadCodemapConfig(process.cwd());
    const mode = hasExplicitOverride(options.mode, options.__optionSources?.mode)
      ? (options.mode as 'fast' | 'smart' | 'hybrid')
      : loadedConfig.config.mode;
    const configuredOutput = hasExplicitOverride(options.output, options.__optionSources?.output)
      ? options.output
      : loadedConfig.config.output;
    const { outputDir, isLegacy } = resolveOutputDir(configuredOutput);

    if (mode === 'hybrid') {
      console.log(chalk.blue(`🔍 使用 Hybrid 模式生成代码地图...`));
    } else {
      console.log(chalk.blue(`🔍 使用 ${mode} 模式生成代码地图...`));
    }

    if (isLegacy) {
      console.warn(chalk.yellow('⚠️  检测到使用旧目录 .codemap，请迁移到 .mycodemap'));
    }

    if (loadedConfig.exists && loadedConfig.isLegacy) {
      console.warn(chalk.yellow('⚠️  检测到旧配置文件 codemap.config.json，建议迁移到 mycodemap.config.json'));
    }

    // 执行分析（保持原始 output 传递以向后兼容）
    const analysisOptions: AnalysisOptions = {
      mode,
      rootDir: process.cwd(),
      include: loadedConfig.config.include,
      exclude: loadedConfig.config.exclude,
      output: configuredOutput || '.mycodemap',
      watch: loadedConfig.config.watch,
    };

    const codeMap = await analyze(analysisOptions);
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

    // 生成输出
    await generateAIMap(codeMap, outputDir);
    await generateJSON(codeMap, outputDir);
    await generateMermaidGraph(codeMap, outputDir);

    // 生成上下文文件（不带 AI 描述）
    await generateContext(codeMap, outputDir);

    // 保存到 MVP3 storage
    spinner.text = '保存到代码图存储...';
    const storageSaveResult = await saveToCodeGraphStorage(
      codeMap,
      loadedConfig.config.storage,
      options.symbolLevel === true
    );

    spinner.succeed(chalk.green('✅ 代码地图生成完成！'));

    // 显示摘要
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

    // 显示实际使用的模式（Hybrid 模式下）
    if (codeMap.actualMode) {
      console.log(chalk.gray(`   解析模式: ${codeMap.actualMode} (自动选择)`));
    }

    console.log(chalk.gray('\n📁 输出文件:'));
    console.log(chalk.gray(`   AI_MAP.md`));
    console.log(chalk.gray(`   codemap.json`));
    console.log(chalk.gray(`   dependency-graph.md`));
    console.log(chalk.gray(`   context/ (${codeMap.summary.totalFiles} 个文件)`));
    console.log(chalk.gray(`   MVP3 Storage (${storageSaveResult.storageType})`));

    if (pluginReport) {
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

  } catch (error) {
    spinner.fail(chalk.red('❌ 生成失败'));
    console.error(chalk.red(`错误: ${error}`));
    process.exit(1);
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
        'import'
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
              'high',
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
