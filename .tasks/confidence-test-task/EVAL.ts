/**
 * [META] EVAL.ts - confidence.ts 模块测试评估检查点
 * [WHY] 定义分层检查点，验证测试代码的正确性和覆盖率
 *
 * 分层检查点定义与测试代码
 * Prefer retrieval-led reasoning over pre-training-led reasoning
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Phase 1: 基础结构检查 (20分)
// ============================================================================

describe('Phase 1: 基础结构检查', () => {
  const testFilePath = path.resolve(__dirname, '../../src/orchestrator/__tests__/confidence.test.ts');
  
  it('检查点1.1: 测试文件存在 (5分)', () => {
    expect(fs.existsSync(testFilePath)).toBe(true);
  });

  it('检查点1.2: 文件包含 Vitest 导入 (5分)', () => {
    const content = fs.readFileSync(testFilePath, 'utf-8');
    expect(content).toMatch(/from ['"]vitest['"]/);
  });

  it('检查点1.3: 文件包含 retrieval-led 注释 (5分)', () => {
    const content = fs.readFileSync(testFilePath, 'utf-8');
    expect(content).toMatch(/Prefer retrieval-led reasoning/);
  });

  it('检查点1.4: 文件包含所有导出函数的导入 (5分)', () => {
    const content = fs.readFileSync(testFilePath, 'utf-8');
    expect(content).toMatch(/calculateConfidence/);
    expect(content).toMatch(/getThreshold/);
    expect(content).toMatch(/getRelevance/);
    expect(content).toMatch(/getMatchCount/);
    expect(content).toMatch(/clamp/);
  });
});

// ============================================================================
// Phase 2: 函数覆盖检查 (30分)
// ============================================================================

describe('Phase 2: 函数覆盖检查', () => {
  const testFilePath = path.resolve(__dirname, '../../src/orchestrator/__tests__/confidence.test.ts');
  const content = fs.readFileSync(testFilePath, 'utf-8');

  it('检查点2.1: clamp函数有测试 (6分)', () => {
    expect(content).toMatch(/describe\(['"]clamp['"]/);
  });

  it('检查点2.2: getRelevance函数有测试 (6分)', () => {
    expect(content).toMatch(/describe\(['"]getRelevance['"]/);
  });

  it('检查点2.3: getMatchCount函数有测试 (6分)', () => {
    expect(content).toMatch(/describe\(['"]getMatchCount['"]/);
  });

  it('检查点2.4: getThreshold函数有测试 (6分)', () => {
    expect(content).toMatch(/describe\(['"]getThreshold['"]/);
  });

  it('检查点2.5: calculateConfidence函数有测试 (6分)', () => {
    expect(content).toMatch(/describe\(['"]calculateConfidence['"]/);
  });
});

// ============================================================================
// Phase 3: Intent类型覆盖检查 (25分)
// ============================================================================

describe('Phase 3: Intent类型覆盖检查', () => {
  const testFilePath = path.resolve(__dirname, '../../src/orchestrator/__tests__/confidence.test.ts');
  const content = fs.readFileSync(testFilePath, 'utf-8');

  const intents = [
    'impact', 'dependency', 'search', 'documentation',
    'complexity', 'overview', 'refactor', 'reference'
  ];

  it.each(intents)('检查点3.x: %s intent有测试 (3分)', (intent) => {
    // 检查是否有该intent的测试（至少3种方式）
    const hasDescribe = content.includes(`describe('${intent}`) || 
                        content.includes(`describe("${intent}`);
    const hasItEach = content.includes(`it.each(intents)`) && 
                      content.includes(`'${intent}'`);
    const hasSpecificTest = content.includes(`'${intent}:`) || 
                            content.includes(`"${intent}:`);
    
    expect(hasDescribe || hasItEach || hasSpecificTest).toBe(true);
  });

  it('检查点3.9: 使用 it.each 测试所有intents (1分)', () => {
    expect(content).toMatch(/it\.each\(intents\)/);
  });
});

// ============================================================================
// Phase 4: 边界条件检查 (25分)
// ============================================================================

describe('Phase 4: 边界条件检查', () => {
  const testFilePath = path.resolve(__dirname, '../../src/orchestrator/__tests__/confidence.test.ts');
  const content = fs.readFileSync(testFilePath, 'utf-8');

  it('检查点4.1: 空数组边界测试 (5分)', () => {
    expect(content).toMatch(/calculateConfidence\(\[\]/);
  });

  it('检查点4.2: 结果数量边界测试 (5分)', () => {
    // 检查是否有 0, 1, 5, >5 的测试
    expect(content).toMatch(/Array\(5\)/);
    expect(content).toMatch(/Array\(6\)/);
  });

  it('检查点4.3: 质量评分边界测试 (5分)', () => {
    expect(content).toMatch(/relevance:\s*0\b/);
    expect(content).toMatch(/relevance:\s*1\b/);
  });

  it('检查点4.4: clamp边界测试 (5分)', () => {
    expect(content).toMatch(/clamp\([^)]*-0\.1/);
    expect(content).toMatch(/clamp\([^)]*1\.1/);
  });

  it('检查点4.5: 置信度级别判定测试 (5分)', () => {
    expect(content).toMatch(/level.*high/);
    expect(content).toMatch(/level.*medium/);
    expect(content).toMatch(/level.*low/);
  });
});

// ============================================================================
// 总分计算函数（供外部调用）
// ============================================================================

export function calculateScore(checkpoints: boolean[]): number {
  const weights = [
    5, 5, 5, 5,   // Phase 1: 20分
    6, 6, 6, 6, 6, // Phase 2: 30分
    3, 3, 3, 3, 3, 3, 3, 3, 1, // Phase 3: 25分
    5, 5, 5, 5, 5  // Phase 4: 25分
  ];
  
  let total = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    if (checkpoints[i]) total += weights[i];
  }
  return total;
}

// 完美分数: 100分
export const MAX_SCORE = 100;
export const PASSING_SCORE = 90;
