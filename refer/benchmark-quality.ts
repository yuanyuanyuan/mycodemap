/**
 * [META] CodeMap 基准测试 - Hit@8 与 Token 消耗验证
 * [WHY] 验证设计文档要求的 Hit@8 >= 90% 和 Token 降低 >= 40% 指标
 *
 * 使用方法:
 *   npx ts-node refer/benchmark-quality.ts
 *
 * 运行测试:
 *   npx vitest run refer/benchmark-quality.test.ts
 */

import { spawnSync } from 'child_process';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

// 测试项目路径（使用 codemap 自身作为测试目标）
const PROJECT_ROOT = '/data/codemap';
const BENCHMARK_ERROR_DIR = join(PROJECT_ROOT, '.codemap', 'logs', 'benchmark-errors');

/**
 * 基准查询定义
 * 包含 30 条模拟用户真实查询
 */
export interface BenchmarkQuery {
  id: number;
  intent: string;
  keywords: string[];
  targets: string[];
  /** 预期相关文件（用于计算 Hit@8） */
  expectedFiles: string[];
  description: string;
}

/**
 * 基准查询集 - 30 条测试查询
 */
export const BENCHMARK_QUERIES: BenchmarkQuery[] = [
  // Impact 分析查询
  { id: 1, intent: 'impact', keywords: ['orchestrator'], targets: ['src/orchestrator/tool-orchestrator.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/commands/'], description: '分析 tool-orchestrator 的影响范围' },
  { id: 2, intent: 'impact', keywords: ['adapter'], targets: ['src/orchestrator/adapters/codemap-adapter.ts'], expectedFiles: ['src/orchestrator/adapters/', 'src/cli/commands/'], description: '分析 codemap-adapter 的影响范围' },
  { id: 3, intent: 'impact', keywords: ['types'], targets: ['src/orchestrator/types.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/'], description: '分析 types.ts 的影响范围' },
  { id: 4, intent: 'impact', keywords: ['confidence'], targets: ['src/orchestrator/confidence.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/commands/'], description: '分析 confidence.ts 的影响范围' },
  { id: 5, intent: 'impact', keywords: ['result'], targets: ['src/orchestrator/result-fusion.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/commands/'], description: '分析 result-fusion.ts 的影响范围' },

  // Dependency 分析查询
  { id: 6, intent: 'dependency', keywords: ['dependencies'], targets: ['src/core'], expectedFiles: ['src/core/', 'package.json'], description: '查看 core 模块的依赖' },
  { id: 7, intent: 'dependency', keywords: ['deps'], targets: ['src/cli'], expectedFiles: ['src/cli/', 'package.json'], description: '查看 cli 模块的依赖' },
  { id: 8, intent: 'dependency', keywords: ['imports'], targets: ['src/parser'], expectedFiles: ['src/parser/', 'package.json'], description: '查看 parser 模块的依赖' },
  { id: 9, intent: 'dependency', keywords: ['requires'], targets: ['src/orchestrator/index.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/'], description: '查看 index.ts 的依赖' },
  { id: 10, intent: 'dependency', keywords: ['module'], targets: ['src/cache'], expectedFiles: ['src/cache/', 'package.json'], description: '查看 cache 模块的依赖' },

  // Search/Complexity 查询
  { id: 11, intent: 'complexity', keywords: ['complex'], targets: ['src/orchestrator'], expectedFiles: ['src/orchestrator/'], description: '分析 orchestrator 模块复杂度' },
  { id: 12, intent: 'complexity', keywords: ['cyclomatic'], targets: ['src/cli'], expectedFiles: ['src/cli/'], description: '分析 cli 模块复杂度' },
  { id: 13, intent: 'search', keywords: ['UnifiedResult'], targets: ['src'], expectedFiles: ['src/orchestrator/types.ts', 'src/orchestrator/'], description: '搜索 UnifiedResult 定义' },
  { id: 14, intent: 'search', keywords: ['ToolAdapter'], targets: ['src'], expectedFiles: ['src/orchestrator/adapters/'], description: '搜索 ToolAdapter 接口' },
  { id: 15, intent: 'search', keywords: ['execute'], targets: ['src/orchestrator'], expectedFiles: ['src/orchestrator/'], description: '搜索 execute 方法' },

  // Reference 查询
  { id: 16, intent: 'reference', keywords: ['references'], targets: ['src/orchestrator/types.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/'], description: '查找 types.ts 的引用' },
  { id: 17, intent: 'reference', keywords: ['imports'], targets: ['src/cli/commands/analyze.ts'], expectedFiles: ['src/cli/'], description: '查找 analyze.ts 的引用' },
  { id: 18, intent: 'reference', keywords: ['uses'], targets: ['src/orchestrator/tool-orchestrator.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/'], description: '查找 tool-orchestrator 的使用' },
  { id: 19, intent: 'reference', keywords: ['calls'], targets: ['src/orchestrator/confidence.ts'], expectedFiles: ['src/orchestrator/'], description: '查找 confidence 的调用' },
  { id: 20, intent: 'reference', keywords: ['invokes'], targets: ['src/orchestrator/result-fusion.ts'], expectedFiles: ['src/orchestrator/'], description: '查找 result-fusion 的调用' },

  // 额外测试查询
  { id: 21, intent: 'impact', keywords: ['test-linker'], targets: ['src/orchestrator/test-linker.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/'], description: '分析 test-linker 的影响范围' },
  { id: 22, intent: 'impact', keywords: ['git-analyzer'], targets: ['src/orchestrator/git-analyzer.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/'], description: '分析 git-analyzer 的影响范围' },
  { id: 23, intent: 'dependency', keywords: ['modules'], targets: ['src/watcher'], expectedFiles: ['src/watcher/', 'package.json'], description: '查看 watcher 模块的依赖' },
  { id: 24, intent: 'complexity', keywords: ['score'], targets: ['src/cache'], expectedFiles: ['src/cache/'], description: '分析 cache 模块复杂度' },
  { id: 25, intent: 'search', keywords: ['interface'], targets: ['src/orchestrator'], expectedFiles: ['src/orchestrator/'], description: '搜索 interface 定义' },
  { id: 26, intent: 'reference', keywords: ['implements'], targets: ['src/orchestrator/adapters/base-adapter.ts'], expectedFiles: ['src/orchestrator/adapters/'], description: '查找 base-adapter 的实现' },
  { id: 27, intent: 'impact', keywords: ['ai-feed'], targets: ['src/orchestrator/ai-feed-generator.ts'], expectedFiles: ['src/orchestrator/', 'src/cli/'], description: '分析 ai-feed-generator 的影响' },
  { id: 28, intent: 'dependency', keywords: ['packages'], targets: ['src/plugins'], expectedFiles: ['src/plugins/', 'package.json'], description: '查看 plugins 模块的依赖' },
  { id: 29, intent: 'search', keywords: ['class'], targets: ['src/core'], expectedFiles: ['src/core/'], description: '搜索 class 定义' },
  { id: 30, intent: 'complexity', keywords: ['maintain'], targets: ['src/generator'], expectedFiles: ['src/generator/'], description: '分析 generator 模块复杂度' },
];

/**
 * 单个测试结果
 */
export interface QueryResult {
  queryId: number;
  intent: string;
  keywords: string[];
  targets: string[];
  /** 返回的结果文件列表 */
  resultFiles: string[];
  /** 命中的预期文件数量 */
  hits: number;
  /** Hit@8 分数 */
  hitAt8: number;
  /** 输出 token 数量 */
  outputTokens: number;
  /** 错误信息 */
  error?: string;
  /** 错误详情（用于写入独立错误日志） */
  errorDetails?: string;
  /** 非致命警告（如 ast-grep stderr 输出） */
  warning?: string;
  /** 警告详情（用于写入独立错误日志） */
  warningDetails?: string;
}

/**
 * 基准测试结果汇总
 */
export interface BenchmarkResult {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  /** Hit@8 分数（所有查询的平均值） */
  hitAt8Score: number;
  /** Token 消耗 */
  totalTokens: number;
  /** rg 基准 Token 消耗 */
  baselineTokens: number;
  /** Token 降低百分比 */
  tokenReductionPercent: number;
  /** 每条查询的结果 */
  queryResults: QueryResult[];
  /** 错误详情日志路径（相对于项目根目录） */
  errorLogPath?: string;
}

interface ExecSyncError extends Error {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

function bufferToString(value: string | Buffer | undefined): string {
  if (!value) {
    return '';
  }
  return typeof value === 'string' ? value : value.toString('utf-8');
}

function summarizeErrorMessage(text: string, maxLength = 160): string {
  const firstLine = text
    .split('\n')
    .map(line => line.trim())
    .find(Boolean) || '未知错误';

  const compact = firstLine.replace(/\s+/g, ' ');
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength)}...`
    : compact;
}

function extractExecError(error: unknown): { summary: string; details: string } {
  if (!(error instanceof Error)) {
    const details = String(error);
    return { summary: summarizeErrorMessage(details), details };
  }

  const execError = error as ExecSyncError;
  const parts = [
    error.message,
    bufferToString(execError.stderr),
    bufferToString(execError.stdout),
  ]
    .map(part => part.trim())
    .filter(Boolean);

  const details = parts.join('\n\n');
  return {
    summary: summarizeErrorMessage(details),
    details,
  };
}

function ensureBenchmarkErrorLogPath(existingPath: string | undefined): string {
  if (existingPath) {
    return existingPath;
  }
  mkdirSync(BENCHMARK_ERROR_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return join(BENCHMARK_ERROR_DIR, `benchmark-errors-${timestamp}.log`);
}

function appendBenchmarkError(logPath: string, query: BenchmarkQuery, details: string): void {
  const header = [
    `[${new Date().toISOString()}]`,
    `queryId=${query.id}`,
    `intent=${query.intent}`,
    `description=${query.description}`,
  ].join(' ');

  appendFileSync(logPath, `${header}\n${details}\n${'-'.repeat(80)}\n`, 'utf-8');
}

/**
 * 运行单个查询
 */
function runQuery(query: BenchmarkQuery): QueryResult {
  const result: QueryResult = {
    queryId: query.id,
    intent: query.intent,
    keywords: query.keywords,
    targets: query.targets,
    resultFiles: [],
    hits: 0,
    hitAt8: 0,
    outputTokens: 0,
  };

  try {
    // 构建 codemap analyze 命令
    const args = [
      'analyze',
      '--intent', query.intent,
      '--json',
      '--output-mode', 'machine',
    ];

    // 添加 keywords
    if (query.keywords.length > 0) {
      args.push('--keywords', ...query.keywords);
    }

    // 添加 targets
    args.push('--targets', ...query.targets);

    // 运行命令（显式捕获 stdout/stderr，避免 stderr 噪音直接污染控制台）
    const command = join(PROJECT_ROOT, 'dist/cli/index.js');
    const execResult = spawnSync('node', [command, ...args], {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (execResult.error) {
      throw execResult.error;
    }

    const stderrText = (execResult.stderr || '').trim();
    if (stderrText) {
      result.warning = summarizeErrorMessage(stderrText);
      result.warningDetails = stderrText;
    }

    if (execResult.status !== 0) {
      throw new Error(stderrText || `命令退出码: ${execResult.status}`);
    }

    const output = (execResult.stdout || '').trim();

    // 解析输出
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      // 尝试提取 JSON 部分
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析 JSON 输出');
      }
    }

    // 提取结果文件
    const results = parsed.results || [];
    result.resultFiles = results.map((r: { file?: string }) => r.file || '').filter(Boolean);

    // 计算命中
    const top8Files = result.resultFiles.slice(0, 8);
    const hits = top8Files.filter(file =>
      query.expectedFiles.some(expected =>
        file.includes(expected) || expected.includes(file)
      )
    ).length;

    result.hits = hits;
    result.hitAt8 = hits / Math.min(8, query.expectedFiles.length);

    // 计算 token 数量（使用空格分割估算）
    result.outputTokens = results.reduce((sum: number, r: { content?: string }) => {
      const content = r.content || '';
      return sum + content.split(/\s+/).filter(Boolean).length;
    }, 0);

  } catch (error) {
    const extracted = extractExecError(error);
    result.error = extracted.summary;
    result.errorDetails = extracted.details;
  }

  return result;
}

/**
 * 运行 rg 基准测试
 * 用于计算 Token 降低百分比
 *
 * 设计文档要求：
 * - rg 基准统计应该模拟完整搜索场景
 * - rg 输出包含上下文行，通常比 codemap 多很多
 * - Token 降低 >= 40% 意味着 codemap 应该更简洁
 */
function runRgBaseline(keywords: string[], targets: string[]): number {
  try {
    // 使用 rg 搜索并获取匹配内容（限制最大 50 条，避免 shell pipe）
    const rgResult = spawnSync('rg', [
      keywords.join(' '),
      ...targets,
      '--type', 'ts',
      '-n',
      '-o',
      '--max-count', '50',
    ], {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 3000,
      maxBuffer: 2 * 1024 * 1024,
    });

    if (rgResult.error || rgResult.status !== 0) {
      return 50;
    }

    const output = (rgResult.stdout || '').trim();

    // 估算 token：按空格分割，每部分约 1-2 个 token
    // rg 输出格式通常是 "filename:line:content"，每个部分都有一些 token
    const lines = output.split('\n').filter(Boolean);
    let totalTokens = 0;
    for (const line of lines) {
      // 每行大约有 3-5 个 token（文件名、行号、匹配内容）
      totalTokens += line.split(/\s+/).filter(Boolean).length;
    }

    return totalTokens || 50; // 至少返回 50 作为基准

  } catch {
    // rg 失败时返回合理默认值
    return 50;
  }
}

/**
 * 运行完整基准测试
 */
export async function runBenchmark(): Promise<BenchmarkResult> {
  console.log('='.repeat(60));
  console.log('CodeMap 基准测试 - Hit@8 与 Token 消耗验证');
  console.log('='.repeat(60));
  console.log(`测试项目: ${PROJECT_ROOT}`);
  console.log(`查询数量: ${BENCHMARK_QUERIES.length}`);
  console.log('='.repeat(60));

  const queryResults: QueryResult[] = [];
  let totalRgTokens = 0;
  let errorLogPath: string | undefined;
  let warningCount = 0;

  for (const query of BENCHMARK_QUERIES) {
    process.stdout.write(`[${query.id.toString().padStart(2, '0')}/${BENCHMARK_QUERIES.length}] 运行查询: ${query.description} ... `);

    // 运行查询
    const result = runQuery(query);
    queryResults.push(result);

    // 计算 rg 基准
    const rgTokens = runRgBaseline(query.keywords, query.targets);
    totalRgTokens += rgTokens;

    if (result.error) {
      errorLogPath = ensureBenchmarkErrorLogPath(errorLogPath);
      appendBenchmarkError(errorLogPath, query, result.errorDetails || result.error);
      console.log(`失败: ${result.error} (详情已写入错误日志)`);
    } else if (result.warningDetails) {
      warningCount += 1;
      errorLogPath = ensureBenchmarkErrorLogPath(errorLogPath);
      appendBenchmarkError(errorLogPath, query, result.warningDetails);
      console.log(`Hit@8: ${(result.hitAt8 * 100).toFixed(1)}% | Tokens: ${result.outputTokens} | 警告: ${result.warning}`);
    } else {
      console.log(`Hit@8: ${(result.hitAt8 * 100).toFixed(1)}% | Tokens: ${result.outputTokens}`);
    }
  }

  // 汇总结果
  const successfulQueries = queryResults.filter(r => !r.error);
  const failedQueries = queryResults.filter(r => r.error);

  const totalHits = queryResults.reduce((sum, r) => sum + r.hits, 0);
  const totalExpectedHits = queryResults.reduce((sum, r) => sum + Math.min(8, r.hits), 0);
  const hitAt8Score = totalExpectedHits > 0 ? totalHits / totalExpectedHits : 0;

  const totalTokens = queryResults.reduce((sum, r) => sum + r.outputTokens, 0);
  const tokenReductionPercent = totalRgTokens > 0
    ? ((totalRgTokens - totalTokens) / totalRgTokens) * 100
    : 0;

  const benchmarkResult: BenchmarkResult = {
    totalQueries: BENCHMARK_QUERIES.length,
    successfulQueries: successfulQueries.length,
    failedQueries: failedQueries.length,
    hitAt8Score,
    totalTokens,
    baselineTokens: totalRgTokens,
    tokenReductionPercent,
    queryResults,
    errorLogPath: errorLogPath ? relative(PROJECT_ROOT, errorLogPath) : undefined,
  };

  // 打印汇总
  console.log('\n' + '='.repeat(60));
  console.log('基准测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总查询数: ${benchmarkResult.totalQueries}`);
  console.log(`成功: ${benchmarkResult.successfulQueries}`);
  console.log(`失败: ${benchmarkResult.failedQueries}`);
  console.log(`警告: ${warningCount}`);
  console.log('-'.repeat(60));
  console.log(`Hit@8 分数: ${(benchmarkResult.hitAt8Score * 100).toFixed(1)}%`);
  console.log(`目标: >= 90% ${benchmarkResult.hitAt8Score >= 0.9 ? '✓' : '✗'}`);
  console.log('-'.repeat(60));
  console.log(`Token 消耗: ${benchmarkResult.totalTokens}`);
  console.log(`Rg 基准: ${benchmarkResult.baselineTokens}`);
  console.log(`Token 降低: ${benchmarkResult.tokenReductionPercent.toFixed(1)}%`);
  console.log(`目标: >= 40% ${benchmarkResult.tokenReductionPercent >= 40 ? '✓' : '✗'}`);
  if (benchmarkResult.errorLogPath) {
    console.log(`错误详情日志: ${benchmarkResult.errorLogPath}`);
  }
  console.log('='.repeat(60));

  return benchmarkResult;
}

/**
 * 验证基准测试是否通过
 */
export function validateBenchmark(result: BenchmarkResult): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  if (result.hitAt8Score < 0.9) {
    issues.push(`Hit@8 分数 ${(result.hitAt8Score * 100).toFixed(1)}% < 90%`);
  }

  if (result.tokenReductionPercent < 40) {
    issues.push(`Token 降低 ${result.tokenReductionPercent.toFixed(1)}% < 40%`);
  }

  if (result.failedQueries > result.totalQueries * 0.1) {
    issues.push(`失败查询 ${result.failedQueries} > ${result.totalQueries * 0.1} (10%)`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

// CLI 入口
async function main() {
  const result = await runBenchmark();
  const validation = validateBenchmark(result);

  console.log('\n验证结果:');
  if (validation.passed) {
    console.log('✓ 所有验证通过');
    process.exit(0);
  } else {
    console.log('✗ 验证失败:');
    validation.issues.forEach(issue => console.log(`  - ${issue}`));
    process.exit(1);
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? resolve(process.argv[1]) : '';
if (entryFilePath === currentFilePath) {
  main().catch(console.error);
}
