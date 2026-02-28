import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { CodeMap, ModuleInfo } from '../../types/index.js';

interface ComplexityOptions {
  file?: string;
  json?: boolean;
}

/**
 * 加载代码地图数据
 */
function loadCodeMap(rootDir: string): CodeMap | null {
  const codemapPath = path.join(rootDir, '.codemap', 'codemap.json');

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
 * 获取模块复杂度信息
 */
function getModuleComplexity(module: ModuleInfo): {
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  functions: number;
  classes: number;
  lines: number;
} {
  // 如果模块已经有复杂度数据
  if (module.complexity) {
    return {
      cyclomatic: module.complexity.cyclomatic,
      cognitive: module.complexity.cognitive,
      maintainability: module.complexity.maintainability,
      functions: module.complexity.details?.functions.length || 0,
      classes: module.symbols.filter(s => s.kind === 'class').length,
      lines: module.stats.codeLines
    };
  }

  // 否则基于符号数量估算
  const functions = module.symbols.filter(s => s.kind === 'function' || s.kind === 'method').length;
  const classes = module.symbols.filter(s => s.kind === 'class').length;
  const cyclomatic = Math.max(1, functions + classes);
  const cognitive = cyclomatic * 1.5;
  const loc = module.stats.codeLines;
  const maintainability = Math.max(0, Math.min(100, 171 - 5.2 * Math.log(loc + 1) - 0.23 * cyclomatic));

  return {
    cyclomatic,
    cognitive: Math.round(cognitive),
    maintainability: Math.round(maintainability),
    functions,
    classes,
    lines: module.stats.codeLines
  };
}

/**
 * 获取复杂度评级
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
 * 格式化复杂度输出
 */
function formatComplexity(
  codeMap: CodeMap,
  targetModule: ModuleInfo | undefined,
  allComplexities: Array<{ module: ModuleInfo; complexity: ReturnType<typeof getModuleComplexity> }>,
  options: ComplexityOptions
): void {
  if (options.json) {
    const output: Record<string, unknown> = {};

    if (options.file && targetModule) {
      output.file = {
        path: targetModule.absolutePath,
        relativePath: path.relative(codeMap.project.rootDir, targetModule.absolutePath),
        complexity: getModuleComplexity(targetModule)
      };
    } else {
      output.modules = allComplexities.map(({ module, complexity }) => ({
        path: path.relative(codeMap.project.rootDir, module.absolutePath),
        ...complexity
      }));
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

  if (options.file && targetModule) {
    // 输出指定文件的复杂度
    const complexity = getModuleComplexity(targetModule);
    console.log(chalk.cyan(`\n📊 文件复杂度: ${path.relative(codeMap.project.rootDir, targetModule.absolutePath)}`));
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
 * Complexity 命令实现
 */
export async function complexityCommand(options: ComplexityOptions) {
  const rootDir = process.cwd();

  // 加载代码地图
  const codeMap = loadCodeMap(rootDir);
  if (!codeMap) {
    process.exit(1);
  }

  // 获取目标模块
  let targetModule: ModuleInfo | undefined;
  const allComplexities: Array<{ module: ModuleInfo; complexity: ReturnType<typeof getModuleComplexity> }> = [];

  if (options.file) {
    targetModule = codeMap.modules.find(m =>
      m.absolutePath.includes(options.file!) ||
      path.relative(codeMap.project.rootDir, m.absolutePath).includes(options.file!)
    );

    if (!targetModule) {
      console.log(chalk.red(`❌ 未找到文件: ${options.file}`));
      process.exit(1);
    }
  } else {
    // 计算所有模块的复杂度
    for (const module of codeMap.modules) {
      allComplexities.push({
        module,
        complexity: getModuleComplexity(module)
      });
    }
  }

  // 输出结果
  formatComplexity(codeMap, targetModule, allComplexities, options);
}
