/**
 * [META] CodeMap 基准测试 - Vitest 集成
 * [WHY] 将 Hit@8 与 Token 消耗验证集成到 CI 中
 */

import { beforeAll, describe, it, expect } from 'vitest';
import { runBenchmark, validateBenchmark, BENCHMARK_QUERIES, type BenchmarkResult } from './benchmark-quality';

describe('CodeMap 基准测试', () => {
  let benchmarkResult: BenchmarkResult;

  beforeAll(async () => {
    benchmarkResult = await runBenchmark();
  });

  it('应该有 30 条基准查询', () => {
    expect(BENCHMARK_QUERIES.length).toBe(30);
  });

  it('Hit@8 应该 >= 90%', () => {
    expect(benchmarkResult.hitAt8Score).toBeGreaterThanOrEqual(0.9);
  });

  it('Token 降低应该 >= 40%', () => {
    expect(benchmarkResult.tokenReductionPercent).toBeGreaterThanOrEqual(40);
  });

  it('验证函数应该返回通过', () => {
    const validation = validateBenchmark(benchmarkResult);
    expect(validation.passed).toBe(true);
  });
});
