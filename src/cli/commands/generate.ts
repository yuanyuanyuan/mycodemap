// [META] since:2024-03 | owner:core-team | stable:true
// [WHY] 提供代码地图生成 CLI 命令，协调分析器和生成器创建项目文档
import chalk from 'chalk';
import ora from 'ora';
import { analyze } from '../../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext, generateMermaidGraph } from '../../generator/index.js';
import type { AnalysisOptions } from '../../types/index.js';

export async function generateCommand(options: {
  mode?: string;
  output?: string;
  watch?: boolean;
  ai?: boolean;
  'ai-context'?: boolean;
}) {
  const mode = (options.mode as 'fast' | 'smart' | 'hybrid') || 'hybrid';
  const outputDir = options.output || '.codemap';

  // 显示模式信息
  if (mode === 'hybrid') {
    console.log(chalk.blue(`🔍 使用 Hybrid 模式生成代码地图...`));
  } else {
    console.log(chalk.blue(`🔍 使用 ${mode} 模式生成代码地图...`));
  }

  const spinner = ora('扫描项目文件...').start();

  try {
    // 执行分析
    const analysisOptions: AnalysisOptions = {
      mode,
      rootDir: process.cwd(),
      output: outputDir
    };

    const codeMap = await analyze(analysisOptions);

    spinner.text = '生成输出文件...';

    // 生成输出
    await generateAIMap(codeMap, outputDir);
    await generateJSON(codeMap, outputDir);
    await generateMermaidGraph(codeMap, outputDir);
    
    // 生成上下文文件（不带 AI 描述）
    await generateContext(codeMap, outputDir);

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

  } catch (error) {
    spinner.fail(chalk.red('❌ 生成失败'));
    console.error(chalk.red(`错误: ${error}`));
    process.exit(1);
  }
}
