/**
 * AnalyzeCommand - 统一分析入口
 * 提供统一的 CLI 接口，支持多种分析意图
 */

import { parseArgs } from 'node:util';
import chalk from 'chalk';
import { ImpactCommand } from './impact.js';
import { DepsCommand } from './deps.js';
import { ComplexityCommand } from './complexity.js';
import type { AnalyzeArgs, IntentType, CodemapOutput, UnifiedResult, Confidence } from '../../orchestrator/types.js';
import { resolveTestFile } from '../../orchestrator/test-linker.js';

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
  'impact',
  'dependency',
  'search',
  'documentation',
  'complexity',
  'overview',
  'refactor',
  'reference',
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
    // 验证 intent
    if (this.args.intent && !VALID_INTENTS.includes(this.args.intent as IntentType)) {
      throw this.createError(
        AnalyzeErrorCode.E0001_INVALID_INTENT,
        `无效的 intent: ${this.args.intent}。支持的选项: ${VALID_INTENTS.join(', ')}`
      );
    }

    // 验证 targets
    if (!this.args.targets || this.args.targets.length === 0) {
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

    const intent = this.args.intent || 'impact';
    const scope = this.args.scope || 'direct';
    const topK = this.args.topK || 8;

    // 根据 intent 路由
    switch (intent) {
      case 'impact':
        return this.executeImpact(scope, topK);
      case 'dependency':
        return this.executeDeps(topK);
      case 'complexity':
        return this.executeComplexity(topK);
      default:
        return this.executeImpact(scope, topK);
    }
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

    const typedResults = resultsWithTests as UnifiedResult[];

    // 输出格式处理
    if (this.args.outputMode === 'machine' || this.args.json) {
      return {
        schemaVersion: 'v1.0.0',
        intent: 'impact',
        tool: 'codemap-impact',
        confidence,
        results: typedResults.slice(0, topK),
        metadata: {
          total: resultsWithTests.length,
          scope,
          resultCount: resultsWithTests.length,
        },
      };
    }

    // 人类可读输出
    this.printHumanOutput(resultsWithTests, 'impact');
    return {
      schemaVersion: 'v1.0.0',
      intent: 'impact',
      tool: 'codemap-impact',
      confidence,
      results: typedResults,
      metadata: {
        total: resultsWithTests.length,
        scope,
        resultCount: resultsWithTests.length,
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

    const typedResults = resultsWithTests as UnifiedResult[];

    // 输出格式处理
    if (this.args.outputMode === 'machine' || this.args.json) {
      return {
        schemaVersion: 'v1.0.0',
        intent: 'dependency',
        tool: 'codemap-deps',
        confidence,
        results: typedResults.slice(0, topK),
        metadata: {
          total: resultsWithTests.length,
          resultCount: resultsWithTests.length,
        },
      };
    }

    // 人类可读输出
    this.printHumanOutput(resultsWithTests, 'dependency');
    return {
      schemaVersion: 'v1.0.0',
      intent: 'dependency',
      tool: 'codemap-deps',
      confidence,
      results: typedResults,
      metadata: {
        total: resultsWithTests.length,
        resultCount: resultsWithTests.length,
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

    const typedResults = resultsWithTests as UnifiedResult[];

    // 输出格式处理
    if (this.args.outputMode === 'machine' || this.args.json) {
      return {
        schemaVersion: 'v1.0.0',
        intent: 'complexity',
        tool: 'codemap-complexity',
        confidence,
        results: typedResults.slice(0, topK),
        metadata: {
          total: resultsWithTests.length,
          resultCount: resultsWithTests.length,
        },
      };
    }

    // 人类可读输出
    this.printHumanOutput(resultsWithTests, 'complexity');
    return {
      schemaVersion: 'v1.0.0',
      intent: 'complexity',
      tool: 'codemap-complexity',
      confidence,
      results: typedResults,
      metadata: {
        total: resultsWithTests.length,
        resultCount: resultsWithTests.length,
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
      content: string;
      relevance: number;
      metadata?: Record<string, unknown>;
    }>;

    for (const result of resultsArray) {
      console.log(chalk.cyan(`📁 ${result.file}`));
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
export function parseAnalyzeArgs(argv: string[]): AnalyzeArgs {
  try {
    const { values, positionals } = parseArgs({
      argv,
      allowPositionals: true,
      options: {
        intent: {
          type: 'string',
          short: 'i',
        },
        targets: {
          type: 'string',
          multiple: true,
          short: 't',
        },
        keywords: {
          type: 'string',
          multiple: true,
          short: 'k',
        },
        scope: {
          type: 'string',
          short: 's',
        },
        topK: {
          type: 'string',
          short: 'n',
        },
        'include-tests': {
          type: 'boolean',
          default: false,
        },
        'include-git-history': {
          type: 'boolean',
          default: false,
        },
        json: {
          type: 'boolean',
          default: false,
        },
        'output-mode': {
          type: 'string',
        },
        help: {
          type: 'boolean',
          short: 'h',
          default: false,
        },
      },
    });

    // 合并位置参数和 --targets 参数作为 targets
    const positionalTargets = positionals?.filter(p => !p.startsWith('-')) || [];
    const explicitTargets = values.targets ? (Array.isArray(values.targets) ? values.targets : [values.targets]) : [];
    const allTargets = [...explicitTargets, ...positionalTargets];

    return {
      intent: values.intent as AnalyzeArgs['intent'],
      targets: allTargets.length > 0 ? allTargets : undefined,
      keywords: values.keywords as AnalyzeArgs['keywords'],
      scope: values.scope as AnalyzeArgs['scope'],
      topK: values.topK ? parseInt(values.topK as string, 10) : undefined,
      includeTests: values['include-tests'] as boolean,
      includeGitHistory: values['include-git-history'] as boolean,
      json: values.json as boolean,
      outputMode: values['output-mode'] as AnalyzeArgs['outputMode'],
    };
  } catch {
    return {};
  }
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

  try {
    const command = new AnalyzeCommand(args);
    await command.execute();
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const analyzeError = error as Error & { code: AnalyzeErrorCode };
      console.error(chalk.red(`❌ ${analyzeError.code}: ${analyzeError.message}`));
      process.exit(1);
    }
    console.error(chalk.red(`❌ ${AnalyzeErrorCode.E0005_EXECUTION_FAILED}: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

/**
 * 打印帮助信息
 */
function printHelp(): void {
  console.log(`
${chalk.bold('codemap analyze')} - 统一分析入口

${chalk.bold('用法:')}
  codemap analyze [选项]

${chalk.bold('选项:')}
  -i, --intent <type>          分析类型 (impact|dependency|search|documentation|complexity|overview|refactor|reference)
  -t, --targets <paths>       目标文件/模块路径 (多个)
  -k, --keywords <words>      搜索关键词 (多个)
  -s, --scope <scope>         范围 (direct|transitive)
  -n, --topK <number>        返回结果数量 (默认 8, 最大 100)
  --include-tests             包含测试文件
  --include-git-history       包含 Git 历史
  --json                     JSON 格式输出
  --output-mode <mode>       输出模式 (machine|human)
  -h, --help                 显示帮助

${chalk.bold('示例:')}
  codemap analyze -i impact -t src/index.ts
  codemap analyze -i dependency -t src/utils --scope transitive --json
  codemap analyze -i complexity -t src/ --include-tests
`);
}

// 导出类型
export type { AnalyzeArgs };
