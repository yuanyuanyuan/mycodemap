/**
 * [META] CodeMap 基准测试 - Vitest 集成
 * [WHY] 将 Hit@8 与 Token 消耗验证集成到 CI 中
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, validateBenchmark, BENCHMARK_QUERIES } from './benchmark-quality';

describe('CodeMap 基准测试', () => {
  it('应该有 30 条基准查询', () => {
    expect(BENCHMARK_QUERIES.length).toBe(30);
  });

  it('Hit@8 应该 >= 90%', async () => {
    const result = await runBenchmark();
    expect(result.hitAt8Score).toBeGreaterThanOrEqual(0.9);
  });

  it('Token 降低应该 >= 40%', async () => {
    const result = await runBenchmark();
    expect(result.tokenReductionPercent).toBeGreaterThanOrEqual(40);
  });

  it('验证函数应该返回通过', async () => {
    const result = await runBenchmark();
    const validation = validateBenchmark(result);
    expect(validation.passed).toBe(true);
  });
});
