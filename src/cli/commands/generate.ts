import chalk from 'chalk';
import ora from 'ora';
import { analyze } from '../../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext, generateContextWithAI, generateMermaidGraph } from '../../generator/index.js';
import { createAIOverviewGenerator } from '../../generator/ai-overview.js';
import { createSubagentCaller } from '../../ai/subagent-caller.js';
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
  const enableAI = options.ai ?? true; // 默认启用 AI 生成
  const enableAIContext = options['ai-context'] ?? false; // 默认不启用文件级 AI 描述

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
    
    // 生成上下文文件（可选择是否启用 AI 描述）
    if (enableAIContext) {
      spinner.text = '生成 AI 文件描述（这可能需要一些时间）...';
      await generateContextWithAI(codeMap, outputDir, {
        concurrency: 5,
        enableCache: true,
        maxDescriptionLength: 500
      }, (stage, completed, total) => {
        if (stage === 'ai-descriptions') {
          spinner.text = `生成 AI 文件描述... (${completed}/${total})`;
        } else {
          spinner.text = '写入上下文文件...';
        }
      });
    } else {
      await generateContext(codeMap, outputDir);
    }

    // AI 概述生成
    let aiOverviewPath: string | undefined;
    if (enableAI) {
      // 检测是否在 Claude Code 会话中运行
      const inClaudeCodeSession = process.env.CLAUDECODE !== undefined;
      // 检查是否强制启用 AI（通过环境变量）
      const forceEnableAI = process.env.CODEMAP_ENABLE_AI === 'true';

      if (inClaudeCodeSession && !forceEnableAI) {
        console.log(chalk.yellow('⚠️  检测到在 Claude Code 会话中运行，跳过 AI 概述生成'));
        console.log(chalk.gray('   如需强制生成 AI 概要，请设置环境变量: CODEMAP_ENABLE_AI=true'));
      } else {
        if (forceEnableAI) {
          console.log(chalk.cyan('✨ 环境变量 CODEMAP_ENABLE_AI=true 已设置，强制生成 AI 概述...'));
        }
        spinner.text = '生成 AI 概述...';

        try {
          const subagentCaller = createSubagentCaller({
            timeout: 120000 // 2 分钟超时
          });

          // 检查 CLI 是否可用
          const isAvailable = await subagentCaller.isAvailable();
          if (isAvailable) {
            const aiOutput = await subagentCaller.generateOverview(codeMap);

            const aiOverviewGenerator = createAIOverviewGenerator({
              outputDir,
              enabled: true,
              filename: 'AI_OVERVIEW.md'
            });

            aiOverviewPath = await aiOverviewGenerator.generate(codeMap, aiOutput);
          } else {
            console.log(chalk.yellow('⚠️  Claude CLI 不可用，跳过 AI 概述生成'));
          }
        } catch (error) {
          console.log(chalk.yellow(`⚠️  AI 概述生成失败: ${error instanceof Error ? error.message : String(error)}`));
        }
      }
    }

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

    if (aiOverviewPath) {
      console.log(chalk.gray(`   AI_OVERVIEW.md`));
    }

  } catch (error) {
    spinner.fail(chalk.red('❌ 生成失败'));
    console.error(chalk.red(`错误: ${error}`));
    process.exit(1);
  }
}
