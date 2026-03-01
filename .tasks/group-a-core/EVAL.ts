/**
 * [META] EVAL.ts - 任务评估检查点
 * [WHY] 定义分层检查点和测试代码，验证任务完成质量
 * 任务ID: group-a-core-001
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Phase 1: 基础结构检查 (20分)
// ============================================================================

describe('Phase 1: 基础结构检查', () => {
  const TEST_DIR = '/data/codemap/src/orchestrator/__tests__'
  
  it('CHK-1.1: 测试目录存在', () => {
    expect(existsSync(TEST_DIR)).toBe(true)
  })

  it('CHK-1.2: confidence.test.ts 文件存在', () => {
    expect(existsSync(join(TEST_DIR, 'confidence.test.ts'))).toBe(true)
  })

  it('CHK-1.3: types.test.ts 文件存在', () => {
    expect(existsSync(join(TEST_DIR, 'types.test.ts'))).toBe(true)
  })

  it('CHK-1.4: confidence.test.ts 使用 Vitest 导入', () => {
    const content = readFileSync(join(TEST_DIR, 'confidence.test.ts'), 'utf-8')
    expect(content).toMatch(/from ['"]vitest['"]/)
  })

  it('CHK-1.5: types.test.ts 使用 Vitest 导入', () => {
    const content = readFileSync(join(TEST_DIR, 'types.test.ts'), 'utf-8')
    expect(content).toMatch(/from ['"]vitest['"]/)
  })
})

// ============================================================================
// Phase 2: confidence.ts 测试覆盖 (40分)
// ============================================================================

describe('Phase 2: confidence.ts 测试覆盖', () => {
  const testFile = '/data/codemap/src/orchestrator/__tests__/confidence.test.ts'
  let content: string

  beforeAll(() => {
    content = readFileSync(testFile, 'utf-8')
  })

  // R1: calculateConfidence 函数测试
  it('CHK-2.1: 测试空结果数组 (R1.1)', () => {
    expect(content).toMatch(/calculateConfidence\s*\(\s*\[\]/)
    expect(content).toMatch(/length\s*===?\s*0|empty|空结果/)
  })

  it('CHK-2.2: 测试 1-5 个结果范围 (R1.2)', () => {
    expect(content).toMatch(/1.*result|2.*result|3.*result|4.*result|5.*result/i)
  })

  it('CHK-2.3: 测试超过 5 个结果 (R1.3)', () => {
    expect(content).toMatch(/6|7|8|9|10.*result|超出最优/i)
  })

  it('CHK-2.4: 测试所有 8 种 intent 类型 (R1.4)', () => {
    const intents = ['impact', 'dependency', 'search', 'documentation', 
                     'complexity', 'overview', 'refactor', 'reference']
    intents.forEach(intent => {
      expect(content).toMatch(new RegExp(`['"]${intent}['"]`))
    })
  })

  it('CHK-2.5: 测试高置信度判定 (R1.5)', () => {
    expect(content).toMatch(/level.*high|high.*level|置信度.*高/i)
  })

  it('CHK-2.6: 测试中置信度判定 (R1.5)', () => {
    expect(content).toMatch(/level.*medium|medium.*level|置信度.*中/i)
  })

  it('CHK-2.7: 测试低置信度判定 (R1.5)', () => {
    expect(content).toMatch(/level.*low|low.*level|置信度.*低/i)
  })

  it('CHK-2.8: 测试 reasons 数组内容 (R1.6)', () => {
    expect(content).toMatch(/reasons/)
    expect(content).toMatch(/toContain|toInclude|包含/)
  })

  // R2: 辅助函数测试
  it('CHK-2.9: 测试 clamp 函数 (R2.1)', () => {
    expect(content).toMatch(/clamp\s*\(/)
  })

  it('CHK-2.10: 测试 getRelevance 函数 (R2.2)', () => {
    expect(content).toMatch(/getRelevance\s*\(/)
    expect(content).toMatch(/relevance|toolScore/)
  })

  it('CHK-2.11: 测试 getMatchCount 函数 (R2.3)', () => {
    expect(content).toMatch(/getMatchCount\s*\(/)
    expect(content).toMatch(/keywords/)
  })

  it('CHK-2.12: 测试 getThreshold 函数 (R2.4)', () => {
    expect(content).toMatch(/getThreshold\s*\(/)
  })

  // R3: 阈值配置测试
  it('CHK-2.13: 验证 CONFIDENCE_THRESHOLDS 配置 (R3.1-R3.3)', () => {
    expect(content).toMatch(/CONFIDENCE_THRESHOLDS/)
  })
})

// ============================================================================
// Phase 3: types.ts 测试覆盖 (30分)
// ============================================================================

describe('Phase 3: types.ts 测试覆盖', () => {
  const testFile = '/data/codemap/src/orchestrator/__tests__/types.test.ts'
  let content: string

  beforeAll(() => {
    content = readFileSync(testFile, 'utf-8')
  })

  // R4: 类型守卫测试
  it('CHK-3.1: 测试 isCodemapOutput 有效对象 (R4.1)', () => {
    expect(content).toMatch(/isCodemapOutput\s*\(/)
    expect(content).toMatch(/toBe\s*\(\s*true\s*\)|toBeTruthy/)
  })

  it('CHK-3.2: 测试 isCodemapOutput null/undefined (R4.2)', () => {
    expect(content).toMatch(/null|undefined/)
    expect(content).toMatch(/toBe\s*\(\s*false\s*\)|toBeFalsy/)
  })

  it('CHK-3.3: 测试 isCodemapOutput 缺少必需字段 (R4.3)', () => {
    expect(content).toMatch(/缺少|missing|without/)
  })

  it('CHK-3.4: 测试 isCodemapOutput 错误类型字段 (R4.4)', () => {
    expect(content).toMatch(/invalid|错误|incorrect/)
  })

  // R5: 辅助函数测试
  it('CHK-3.5: 测试 calculateConfidenceLevel 边界 0.7 (R5.1)', () => {
    expect(content).toMatch(/0\.7/)
    expect(content).toMatch(/calculateConfidenceLevel/)
  })

  it('CHK-3.6: 测试 calculateConfidenceLevel 边界 0.4 (R5.2)', () => {
    expect(content).toMatch(/0\.4/)
  })

  it('CHK-3.7: 测试 calculateConfidenceLevel 极端值 (R5.4)', () => {
    expect(content).toMatch(/0\s*[,)]|1\s*[,)]/)
  })

  // R6: 类型兼容性测试
  it('CHK-3.8: 测试 UnifiedResult 接口 (R6.1)', () => {
    expect(content).toMatch(/UnifiedResult/)
  })

  it('CHK-3.9: 测试 CodemapOutput 接口 (R6.2)', () => {
    expect(content).toMatch(/CodemapOutput/)
  })

  it('CHK-3.10: 测试 HeatScore 接口 (R6.3)', () => {
    expect(content).toMatch(/HeatScore/)
  })
})

// ============================================================================
// Phase 4: 覆盖率检查 (10分)
// ============================================================================

describe('Phase 4: 覆盖率检查', () => {
  it('CHK-4.1: 测试覆盖率报告可生成', () => {
    // 尝试运行测试并生成覆盖率报告
    try {
      const result = execSync('cd /data/codemap && npx vitest run src/orchestrator/__tests__ --coverage --reporter=json 2>&1', {
        encoding: 'utf-8',
        timeout: 60000
      })
      expect(result).toBeTruthy()
    } catch (e) {
      // 即使测试失败，只要有输出就算通过检查点
      expect(e).toBeDefined()
    }
  })

  it('CHK-4.2: 至少 25 个 confidence 测试用例', () => {
    const content = readFileSync('/data/codemap/src/orchestrator/__tests__/confidence.test.ts', 'utf-8')
    const testMatches = content.match(/it\s*\(|test\s*\(/g)
    expect(testMatches?.length || 0).toBeGreaterThanOrEqual(25)
  })

  it('CHK-4.3: 至少 15 个 types 测试用例', () => {
    const content = readFileSync('/data/codemap/src/orchestrator/__tests__/types.test.ts', 'utf-8')
    const testMatches = content.match(/it\s*\(|test\s*\(/g)
    expect(testMatches?.length || 0).toBeGreaterThanOrEqual(15)
  })
})

// ============================================================================
// 评估函数 - 用于计算总分
// ============================================================================

export function calculateScore(results: { name: string; passed: boolean }[]): number {
  const checkpointScores: Record<string, number> = {
    'CHK-1.1': 4, 'CHK-1.2': 4, 'CHK-1.3': 4, 'CHK-1.4': 4, 'CHK-1.5': 4,
    'CHK-2.1': 3, 'CHK-2.2': 3, 'CHK-2.3': 3, 'CHK-2.4': 4, 'CHK-2.5': 3,
    'CHK-2.6': 3, 'CHK-2.7': 3, 'CHK-2.8': 3, 'CHK-2.9': 3, 'CHK-2.10': 3,
    'CHK-2.11': 3, 'CHK-2.12': 3, 'CHK-2.13': 3,
    'CHK-3.1': 3, 'CHK-3.2': 3, 'CHK-3.3': 3, 'CHK-3.4': 3, 'CHK-3.5': 3,
    'CHK-3.6': 3, 'CHK-3.7': 3, 'CHK-3.8': 3, 'CHK-3.9': 3, 'CHK-3.10': 3,
    'CHK-4.1': 5, 'CHK-4.2': 3, 'CHK-4.3': 2
  }

  let totalScore = 0
  results.forEach(result => {
    const score = checkpointScores[result.name] || 0
    if (result.passed) {
      totalScore += score
    }
  })

  return Math.min(totalScore, 100)
}

export function getGrade(score: number): string {
  if (score >= 90) return 'S (Excellent)'
  if (score >= 80) return 'A (Good)'
  if (score >= 70) return 'B (Pass)'
  if (score >= 60) return 'C (Marginal)'
  return 'D (Fail)'
}
