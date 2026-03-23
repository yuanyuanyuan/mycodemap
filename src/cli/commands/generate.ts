// [META] since:2024-03 | owner:core-team | stable:true
// [WHY] 提供代码地图生成 CLI 命令，协调分析器和生成器创建项目文档
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
import type { AnalysisOptions } from '../../types/index.js';
import type { ModuleInfo } from '../../types/index.js';

export async function generateCommand(options: {
  mode?: string;
  output?: string;
  watch?: boolean;
  ai?: boolean;
  'ai-context'?: boolean;
}) {
  const mode = (options.mode as 'fast' | 'smart' | 'hybrid') || 'hybrid';
  const { outputDir, isLegacy } = resolveOutputDir(options.output);

  // 显示模式信息
  if (mode === 'hybrid') {
    console.log(chalk.blue(`🔍 使用 Hybrid 模式生成代码地图...`));
  } else {
    console.log(chalk.blue(`🔍 使用 ${mode} 模式生成代码地图...`));
  }

  // 显示迁移提示（如果使用旧路径）
  if (isLegacy) {
    console.warn(chalk.yellow('⚠️  检测到使用旧目录 .codemap，请迁移到 .mycodemap'));
  }

  const spinner = ora('扫描项目文件...').start();

  try {
    // 执行分析（保持原始 output 传递以向后兼容）
    const analysisOptions: AnalysisOptions = {
      mode,
      rootDir: process.cwd(),
      output: options.output || '.mycodemap'
    };

    const codeMap = await analyze(analysisOptions);

    spinner.text = '生成输出文件...';

    // 生成输出
    await generateAIMap(codeMap, outputDir);
    await generateJSON(codeMap, outputDir);
    await generateMermaidGraph(codeMap, outputDir);

    // 生成上下文文件（不带 AI 描述）
    await generateContext(codeMap, outputDir);

    // 保存到 MVP3 storage
    spinner.text = '保存到代码图存储...';
    await saveToCodeGraphStorage(codeMap);

    spinner.succeed(chalk.green('✅ 代码地图生成完成！'));

    // 显示摘要
    console.log(chalk.gray('\n📊 项目统计:'));
    console.log(chalk.gray(`   文件总数: ${codeMap.summary.totalFiles}`));
    console.log(chalk.gray(`   代码行数: ${codeMap.summary.totalLines}`));
    console.log(chalk.gray(`   模块数量: ${codeMap.summary.totalModules}`));
    console.log(chalk.gray(`   导出符号: ${codeMap.summary.totalExports}`));

    // 显示实际使用的模式（Hybrid 模式下）
    if (codeMap.actualMode) {
      console.log(chalk.gray(`   解析模式: ${codeMap.actualMode} (自动选择)`));
    }

    console.log(chalk.gray('\n📁 输出文件:'));
    console.log(chalk.gray(`   AI_MAP.md`));
    console.log(chalk.gray(`   codemap.json`));
    console.log(chalk.gray(`   dependency-graph.md`));
    console.log(chalk.gray(`   context/ (${codeMap.summary.totalFiles} 个文件)`));
    console.log(chalk.gray('   MVP3 Storage (CodeGraph)'));

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
}): Promise<void> {
  const storage = await storageFactory.createForProject(
    process.cwd(),
    { type: 'filesystem', outputPath: '.codemap/storage' }
  );

  // 转换 CodeMap 为 CodeGraph
  const codeGraph = convertToCodeGraph(codeMap);

  // 保存到 storage
  const repository = new CodeGraphRepositoryImpl(storage);
  await repository.save(codeGraph);

  await storage.close();
}

/**
 * 转换旧版 ModuleInfo 为 MVP3 CodeGraph
 */
function convertToCodeGraph(codeMap: {
  project: { name: string; rootDir: string };
  modules: ModuleInfo[];
}): CodeGraph {
  // 创建项目
  const project = new Project(
    `proj_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    codeMap.project.name,
    codeMap.project.rootDir
  );

  const codeGraph = new CodeGraph(project);
  const moduleIdMap = new Map<string, string>(); // path -> id

  // 第一遍：创建模块
  for (const mod of codeMap.modules) {
    const moduleId = `mod_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
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
      const symbolEntity = new SymbolEntity(
        `sym_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        moduleId,
        symbol.name,
        symbol.kind,
        symbol.location,
        symbol.visibility
      );
      codeGraph.addSymbol(symbolEntity);
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
        `dep_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
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
