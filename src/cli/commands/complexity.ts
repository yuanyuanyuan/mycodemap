// [META] since:2026-03-03 | owner:orchestrator-team | stable:true
// [WHY] 提供代码复杂度分析命令，支持文件级和函数级复杂度详情

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { resolveDataPath } from '../paths.js';
import type { CodeMap, ModuleInfo, SourceLocation } from '../../types/index.js';
import type { UnifiedResult } from '../../orchestrator/types.js';
import { analyzeFileComplexity, analyzeMultipleFiles, type FileComplexity, type FunctionComplexity } from '../../core/ast-complexity-analyzer.js';

interface ComplexityOptions {
  file?: string;
  json?: boolean;
  detail?: boolean;
  structured?: boolean;
}

// ===== 新增类型定义（供 ToolOrchestrator 使用） =====

export interface ComplexityArgs {
  targets?: string[];
  useAST?: boolean;
}

export interface ComplexityInfo {
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  functions: number;
  classes: number;
  lines: number;
  functionDetails?: FunctionComplexity[];
}

export interface ComplexityResult {
  files: Array<{
    path: string;
    relativePath: string;
    complexity: ComplexityInfo;
    location?: SourceLocation; // 新增：结构化位置信息
  }>;
  summary?: {
    totalModules: number;
    averageCyclomatic: number;
    averageCognitive: number;
    averageMaintainability: number;
  };
}

// ===== 纯逻辑函数（从原有函数提取） =====

/**
 * 加载代码地图数据
 */
function loadCodeMap(rootDir: string): CodeMap | null {
  const codemapPath = resolveDataPath(rootDir);

  if (!fs.existsSync(codemapPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(codemapPath, 'utf-8');
    return JSON.parse(data) as CodeMap;
  } catch {
    return null;
  }
}

/**
 * 计算可维护性指数
 * 
 * 基于微软的可维护性指数公式，进行适应性调整：
 * MI = MAX(0, (171 - 5.2 * ln(Halstead Volume) - 0.23 * Cyclomatic - 16.2 * ln(LOC)) * 100 / 171)
 * 
 * 由于我们没有 Halstead Volume，使用简化但合理的公式：
 * - 基于圈复杂度和代码行数计算
 * - 结果范围 0-100
 * - 考虑了文件大小和复杂度的平衡
 */
function calculateMaintainabilityIndex(loc: number, cyclomatic: number, commentRatio: number): number {
  // 规范化输入
  const normalizedLOC = Math.max(1, loc);
  const normalizedCC = Math.max(1, cyclomatic);
  
  // 基础分 100
  let mi = 100;
  
  // 圈复杂度惩罚（每点复杂度减少2分）
  mi -= (normalizedCC - 1) * 2;
  
  // 代码行数惩罚（对数缩放，避免大文件过度惩罚）
  // 100行: -5分, 500行: -15分, 1000行: -20分
  mi -= Math.log(normalizedLOC / 10 + 1) * 5;
  
  // 注释奖励（最多+10分）
  mi += commentRatio * 15;
  
  // 确保结果在 0-100 范围内
  return Math.max(0, Math.min(100, Math.round(mi)));
}

/**
 * 获取模块复杂度信息
 */
function getModuleComplexity(module: ModuleInfo): ComplexityInfo {
  // 如果模块已经有复杂度数据（来自解析器）
  if (module.complexity && module.complexity.cyclomatic > 0) {
    const commentRatio = module.stats.commentLines / Math.max(1, module.stats.lines);
    const maintainability = calculateMaintainabilityIndex(
      module.stats.codeLines,
      module.complexity.cyclomatic,
      commentRatio
    );

    return {
      cyclomatic: module.complexity.cyclomatic,
      cognitive: module.complexity.cognitive || Math.round(module.complexity.cyclomatic * 1.5),
      maintainability,
      functions: module.complexity.details?.functions.length ||
                 module.symbols.filter(s => s.kind === 'function' || s.kind === 'method').length,
      classes: module.symbols.filter(s => s.kind === 'class').length,
      lines: module.stats.codeLines,
      functionDetails: module.complexity.details?.functions.map(f => ({
        name: f.name,
        kind: 'function' as const,
        line: 1,
        column: 1,
        cyclomatic: f.cyclomatic,
        cognitive: f.cognitive,
        nestingDepth: 0,
        isHighComplexity: f.cyclomatic >= 10
      }))
    };
  }

  // 否则基于符号数量估算
  const functions = module.symbols.filter(s => s.kind === 'function' || s.kind === 'method').length;
  const classes = module.symbols.filter(s => s.kind === 'class').length;

  // 更合理的圈复杂度估算：基于函数数量和代码行数
  // 每个函数基础复杂度1，再加上基于行数的估算
  const cyclomatic = Math.max(1, functions + Math.floor(module.stats.codeLines / 50));
  const cognitive = Math.round(cyclomatic * 1.5);

  const commentRatio = module.stats.commentLines / Math.max(1, module.stats.lines);
  const maintainability = calculateMaintainabilityIndex(module.stats.codeLines, cyclomatic, commentRatio);

  return {
    cyclomatic,
    cognitive,
    maintainability,
    functions,
    classes,
    lines: module.stats.codeLines
  };
}

/**
 * 使用 AST 分析获取精确的模块复杂度信息
 */
function getModuleComplexityWithAST(module: ModuleInfo): ComplexityInfo {
  try {
    const astResult = analyzeFileComplexity(module.absolutePath);

    return {
      cyclomatic: astResult.cyclomatic,
      cognitive: astResult.cognitive,
      maintainability: astResult.maintainability,
      functions: astResult.functions,
      classes: astResult.classes,
      lines: astResult.lines,
      functionDetails: astResult.functionDetails
    };
  } catch (error) {
    // 如果 AST 分析失败，回退到估算方式
    console.warn(`警告: AST 分析失败，回退到估算方式: ${module.absolutePath}`);
    return getModuleComplexity(module);
  }
}

/**
 * 构建 SourceLocation 对象
 */
function buildLocation(filePath: string, line: number = 1, column: number = 1): SourceLocation {
  return {
    file: filePath,
    line,
    column,
  };
}

/**
 * 分析复杂度（纯逻辑函数）
 */
export interface AnalyzeComplexityOptions {
  filePaths?: string[];
  useAST?: boolean;  // 是否使用 AST 精确分析
}

function analyzeComplexity(codeMap: CodeMap, options: AnalyzeComplexityOptions = {}): ComplexityResult {
  const { filePaths, useAST = false } = options;
  const result: ComplexityResult = {
    files: []
  };

  // 筛选目标模块
  let modulesToAnalyze = codeMap.modules;
  if (filePaths && filePaths.length > 0) {
    modulesToAnalyze = codeMap.modules.filter(m =>
      filePaths.some(fp =>
        m.absolutePath.includes(fp) ||
        path.relative(codeMap.project.rootDir, m.absolutePath).includes(fp)
      )
    );
  }

  // 计算每个模块的复杂度
  for (const module of modulesToAnalyze) {
    const complexity = useAST
      ? getModuleComplexityWithAST(module)
      : getModuleComplexity(module);

    const relativePath = path.relative(codeMap.project.rootDir, module.absolutePath);
    
    result.files.push({
      path: module.absolutePath,
      relativePath,
      location: buildLocation(relativePath, 1, 1), // 新增：结构化位置信息
      complexity
    });
  }

  // 计算汇总统计
  if (result.files.length > 0) {
    result.summary = {
      totalModules: codeMap.modules.length,
      averageCyclomatic: result.files.reduce((sum, f) => sum + f.complexity.cyclomatic, 0) / result.files.length,
      averageCognitive: result.files.reduce((sum, f) => sum + f.complexity.cognitive, 0) / result.files.length,
      averageMaintainability: result.files.reduce((sum, f) => sum + f.complexity.maintainability, 0) / result.files.length
    };
  }

  return result;
}

/**
 * 获取复杂度评级（内部使用）
 */
function getComplexityRating(value: number, type: 'cyclomatic' | 'maintainability'): string {
  if (type === 'cyclomatic') {
    if (value <= 10) return chalk.green('低');
    if (value <= 20) return chalk.yellow('中');
    if (value <= 50) return chalk.red('高');
    return chalk.magenta('极高');
  } else {
    if (value >= 80) return chalk.green('高');
    if (value >= 60) return chalk.yellow('中');
    if (value >= 40) return chalk.red('低');
    return chalk.magenta('极低');
  }
}

/**
 * 获取风险等级（内部使用）
 */
function getRiskLevel(complexity: ComplexityInfo): 'high' | 'medium' | 'low' {
  if (complexity.cyclomatic > 20 || complexity.cognitive > 30 || complexity.maintainability < 40) {
    return 'high';
  }
  if (complexity.cyclomatic > 10 || complexity.cognitive > 15 || complexity.maintainability < 60) {
    return 'medium';
  }
  return 'low';
}

// ===== ComplexityCommand 类（供 ToolOrchestrator 调用） =====

export class ComplexityCommand {
  private codeMap: CodeMap | null = null;
  private rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = rootDir || process.cwd();
  }

  /**
   * 加载代码地图
   */
  private loadCodeMap(): CodeMap | null {
    if (this.codeMap) {
      return this.codeMap;
    }
    this.codeMap = loadCodeMap(this.rootDir);
    return this.codeMap;
  }

  /**
   * 运行复杂度分析，返回结构化结果
   */
  async run(args: ComplexityArgs): Promise<ComplexityResult> {
    const codeMap = this.loadCodeMap();
    if (!codeMap) {
      throw new Error('代码地图不存在，请先运行 codemap generate');
    }

    return analyzeComplexity(codeMap, {
      filePaths: args.targets,
      useAST: args.useAST ?? false
    });
  }

  /**
   * 增强模式，返回 UnifiedResult[]
   */
  async runEnhanced(args: ComplexityArgs): Promise<UnifiedResult[]> {
    const result = await this.run(args);
    return this.toUnifiedResults(result);
  }

  /**
   * 将 ComplexityResult 转换为 UnifiedResult[]
   */
  private toUnifiedResults(result: ComplexityResult): UnifiedResult[] {
    return result.files.map(file => {
      const complexity = file.complexity;
      const riskLevel = getRiskLevel(complexity);

      // 基于复杂度计算相关性（复杂度越高相关性越高）
      const relevance = Math.min(1, Math.max(0.3,
        (complexity.cyclomatic / 50) * 0.4 +
        (complexity.cognitive / 75) * 0.3 +
        (1 - complexity.maintainability / 100) * 0.3
      ));

      // 确定类型：复杂度高则标记为 risk-assessment
      const type: UnifiedResult['type'] = riskLevel === 'high' ? 'risk-assessment' : 'file';

      // 生成人类可读的描述
      const content = `圈复杂度: ${complexity.cyclomatic}, 认知复杂度: ${complexity.cognitive}, 可维护性: ${complexity.maintainability}`;

      // 使用已有的 location
      const location: SourceLocation = file.location || {
        file: file.relativePath,
        line: 1,
        column: 1,
      };

      return {
        id: `codemap-${file.path}-0`,
        source: 'codemap',
        toolScore: 0.9,
        type,
        file: file.path,
        line: 1,
        location, // 新增：结构化位置信息
        content,
        relevance,
        keywords: [],
        metadata: {
          symbolType: 'class',
          dependencies: [],
          testFile: '',
          commitCount: 0,
          gravity: 0,
          heatScore: {
            freq30d: 0,
            lastType: '',
            lastDate: null,
            stability: true
          },
          impactCount: 0,
          stability: true,
          riskLevel,
          // 额外添加复杂度详细指标
          complexityMetrics: {
            cyclomatic: complexity.cyclomatic,
            cognitive: complexity.cognitive,
            maintainability: complexity.maintainability,
            functions: complexity.functions,
            classes: complexity.classes,
            lines: complexity.lines
          }
        }
      };
    });
  }
}

// ===== 原有 CLI 命令（保持兼容，使用控制台输出） =====

/**
 * 格式化复杂度输出
 */
function formatComplexity(
  codeMap: CodeMap,
  targetModule: ModuleInfo | undefined,
  allComplexities: Array<{ module: ModuleInfo; complexity: ComplexityInfo }>,
  options: ComplexityOptions
): void {
  // 如果有详细数据，使用已有的复杂度信息
  const activeComplexity = targetModule && allComplexities.length > 0
    ? allComplexities[0].complexity
    : (options.file && allComplexities.length > 0 ? allComplexities[0].complexity : undefined);

  if (options.json) {
    const output: Record<string, unknown> = {};

    if (options.file && targetModule) {
      const relativePath = path.relative(codeMap.project.rootDir, targetModule.absolutePath);
      output.file = {
        path: targetModule.absolutePath,
        relativePath,
        location: buildLocation(relativePath, 1, 1), // 新增：结构化位置信息
        complexity: activeComplexity || getModuleComplexity(targetModule)
      };
    } else {
      output.modules = allComplexities.map(({ module, complexity }) => {
        const relativePath = path.relative(codeMap.project.rootDir, module.absolutePath);
        return {
          path: relativePath,
          location: buildLocation(relativePath, 1, 1), // 新增：结构化位置信息
          ...complexity
        };
      });
      output.summary = {
        totalModules: codeMap.modules.length,
        averageCyclomatic: allComplexities.reduce((sum, c) => sum + c.complexity.cyclomatic, 0) / codeMap.modules.length,
        averageCognitive: allComplexities.reduce((sum, c) => sum + c.complexity.cognitive, 0) / codeMap.modules.length,
        averageMaintainability: allComplexities.reduce((sum, c) => sum + c.complexity.maintainability, 0) / codeMap.modules.length
      };
    }

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // 检查是否需要显示单个文件详情（targetModule 存在 或 allComplexities 只有一个元素且有函数详情）
  const showSingleFile = options.file && (targetModule || (allComplexities.length === 1 && allComplexities[0].complexity.functionDetails));

  if (showSingleFile) {
    // 输出指定文件的复杂度
    // 如果有来自 AST 分析的详细数据则使用它
    const complexity = allComplexities.length > 0 && allComplexities[0].complexity.functionDetails
      ? allComplexities[0].complexity
      : (targetModule ? getModuleComplexity(targetModule) : allComplexities[0].complexity);

    const filePath = targetModule
      ? path.relative(codeMap.project.rootDir, targetModule.absolutePath)
      : (allComplexities.length > 0 ? allComplexities[0].module.absolutePath : options.file!);

    console.log(chalk.cyan(`\n📊 文件复杂度: ${filePath}`));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.yellow('\n圈复杂度 (Cyclomatic Complexity):'));
    console.log(chalk.green(`   ${complexity.cyclomatic}`), getComplexityRating(complexity.cyclomatic, 'cyclomatic'));
    console.log(chalk.gray(`   衡量代码中独立路径的数量`));

    console.log(chalk.yellow('\n认知复杂度 (Cognitive Complexity):'));
    console.log(chalk.green(`   ${complexity.cognitive}`), chalk.gray('(越低越好)'));
    console.log(chalk.gray(`   衡量代码的理解难度`));

    console.log(chalk.yellow('\n可维护性指数 (Maintainability):'));
    console.log(chalk.green(`   ${complexity.maintainability}`), getComplexityRating(complexity.maintainability, 'maintainability'));
    console.log(chalk.gray(`   0-100，越高越易维护`));

    console.log(chalk.yellow('\n统计信息:'));
    console.log(chalk.gray(`   代码行数: ${complexity.lines}`));
    console.log(chalk.gray(`   函数/方法: ${complexity.functions}`));
    console.log(chalk.gray(`   类: ${complexity.classes}`));

    // 显示函数级详情（当有详细数据时）
    if (options.detail && complexity.functionDetails && complexity.functionDetails.length > 0) {
      console.log(chalk.yellow('\n函数级复杂度详情:'));
      console.log(chalk.gray('─'.repeat(50)));

      // 按圈复杂度排序
      const sortedFunctions = [...complexity.functionDetails].sort(
        (a, b) => b.cyclomatic - a.cyclomatic
      );

      for (const func of sortedFunctions) {
        const complexityLevel = func.isHighComplexity
          ? chalk.red(' ⚠️ 高')
          : chalk.green(' ✓');
        console.log(chalk.cyan(`\n   ${func.name} (${func.kind})`));
        console.log(chalk.gray(`      行号: ${func.line}`));
        console.log(chalk.gray(`      圈复杂度: ${func.cyclomatic} ${complexityLevel}`));
        console.log(chalk.gray(`      认知复杂度: ${func.cognitive}`));
        console.log(chalk.gray(`      嵌套深度: ${func.nestingDepth}`));
      }
    }
  } else {
    // 输出所有文件的复杂度
    console.log(chalk.cyan('\n📊 项目复杂度分析'));
    console.log(chalk.gray('─'.repeat(50)));

    // 按圈复杂度排序
    const sorted = allComplexities.sort((a, b) => b.complexity.cyclomatic - a.complexity.cyclomatic);

    console.log(chalk.yellow('\n🔥 复杂度最高的文件 (Top 15):'));
    let rank = 1;
    for (const { module, complexity } of sorted.slice(0, 15)) {
      const relPath = path.relative(codeMap.project.rootDir, module.absolutePath);
      const rating = getComplexityRating(complexity.cyclomatic, 'cyclomatic');
      console.log(chalk.green(`\n   ${rank}. ${relPath}`));
      console.log(chalk.gray(`      圈复杂度: ${complexity.cyclomatic} ${rating}`));
      console.log(chalk.gray(`      认知复杂度: ${complexity.cognitive}`));
      console.log(chalk.gray(`      可维护性: ${complexity.maintainability} ${getComplexityRating(complexity.maintainability, 'maintainability')}`));
      rank++;
    }

    // 统计摘要
    const totalCyclomatic = allComplexities.reduce((sum, c) => sum + c.complexity.cyclomatic, 0);
    const totalCognitive = allComplexities.reduce((sum, c) => sum + c.complexity.cognitive, 0);
    const totalMaintainability = allComplexities.reduce((sum, c) => sum + c.complexity.maintainability, 0);
    const avgCyclomatic = totalCyclomatic / codeMap.modules.length;
    const avgCognitive = totalCognitive / codeMap.modules.length;
    const avgMaintainability = totalMaintainability / codeMap.modules.length;

    console.log(chalk.gray('\n─'.repeat(50)));
    console.log(chalk.cyan('\n📈 项目统计:'));
    console.log(chalk.gray(`   总文件数: ${codeMap.modules.length}`));
    console.log(chalk.gray(`   平均圈复杂度: ${avgCyclomatic.toFixed(2)} ${getComplexityRating(avgCyclomatic, 'cyclomatic')}`));
    console.log(chalk.gray(`   平均认知复杂度: ${avgCognitive.toFixed(2)}`));
    console.log(chalk.gray(`   平均可维护性: ${avgMaintainability.toFixed(2)} ${getComplexityRating(avgMaintainability, 'maintainability')}`));
  }

  console.log('');
}

/**
 * 加载代码地图数据（兼容旧函数，带控制台输出）
 */
function loadCodeMapWithOutput(rootDir: string): CodeMap | null {
  const codemapPath = resolveDataPath(rootDir);

  if (!fs.existsSync(codemapPath)) {
    console.log(chalk.red('❌ 代码地图不存在，请先运行 codemap generate'));
    return null;
  }

  try {
    const data = fs.readFileSync(codemapPath, 'utf-8');
    return JSON.parse(data) as CodeMap;
  } catch (error) {
    console.log(chalk.red('❌ 读取代码地图失败:', error instanceof Error ? error.message : String(error)));
    return null;
  }
}

/**
 * Complexity 命令实现（原有函数，保持兼容）
 */
export async function complexityCommand(options: ComplexityOptions) {
  const rootDir = process.cwd();

  // 加载代码地图
  const codeMap = loadCodeMapWithOutput(rootDir);
  if (!codeMap) {
    process.exit(1);
  }

  // 获取目标模块
  let targetModule: ModuleInfo | undefined;
  const allComplexities: Array<{ module: ModuleInfo; complexity: ComplexityInfo }> = [];

  // 使用 AST 分析时，detail 选项自动启用
  const useAST = options.detail || false;

  if (options.file) {
    targetModule = codeMap.modules.find(m =>
      m.absolutePath.includes(options.file!) ||
      path.relative(codeMap.project.rootDir, m.absolutePath).includes(options.file!)
    );

    if (!targetModule) {
      console.log(chalk.red(`❌ 未找到文件: ${options.file}`));
      process.exit(1);
    }

    // 如果使用 AST 分析，获取精确的函数级复杂度
    if (useAST) {
      const astComplexity = getModuleComplexityWithAST(targetModule);
      allComplexities.push({
        module: targetModule,
        complexity: astComplexity
      });
      targetModule = undefined; // 使用 allComplexities 输出
    } else {
      allComplexities.push({
        module: targetModule,
        complexity: getModuleComplexity(targetModule)
      });
    }
  } else {
    // 计算所有模块的复杂度
    for (const module of codeMap.modules) {
      const complexity = useAST
        ? getModuleComplexityWithAST(module)
        : getModuleComplexity(module);
      allComplexities.push({
        module,
        complexity
      });
    }
  }

  // 输出结果
  formatComplexity(codeMap, targetModule, allComplexities, options);
}
