/**
 * [META] 工作流模块集成配置
 * [WHY] 集中管理工作流与各模块的集成配置
 */

/**
 * CI 门禁集成配置
 */
export const PHASE_CI_CONFIG = {
  /** CI 命令超时时间（毫秒） */
  ciTimeout: 300000,
  /** 风险阈值 */
  riskThreshold: 0.7,
  /** CI 检查项 */
  checks: [
    'check-commits',
    'check-headers',
    'assess-risk',
    'check-output-contract'
  ] as const
};

/**
 * Git 分析器集成配置
 */
export const PHASE_GIT_CONFIG = {
  /** 历史分析时间范围（天） */
  historyDays: 90,
  /** 热度计算权重 */
  heatWeights: {
    freq30d: 0.4,
    commitCount: 0.3,
    impactCount: 0.3
  },
  /** 风险评估因子 */
  riskFactors: [
    'fileHeat',
    'dependencyComplexity',
    'testCoverage',
    'changeFrequency'
  ] as const
};

/**
 * 测试关联器集成配置
 */
export const PHASE_TEST_STRATEGY = {
  /** 测试文件匹配模式 */
  testPatterns: [
    '*.test.ts',
    '*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  /** 最小测试覆盖率阈值 */
  minCoverageThreshold: 0.7,
  /** 测试关联策略 */
  strategies: {
    exact: true,
    fuzzy: true,
    structural: true
  }
};

/**
 * 置信度要求配置
 */
export const CONFIDENCE_REQUIREMENTS = {
  /** 各阶段最低置信度要求 */
  phaseThresholds: {
    reference: { min: 0.3, high: 0.6 },
    impact: { min: 0.4, high: 0.7 },
    risk: { min: 0, high: 0 },
    implementation: { min: 0, high: 0 },
    commit: { min: 0, high: 0 },
    ci: { min: 0, high: 0 }
  },
  /** 自动推进阈值 */
  autoProceedThreshold: 0.7,
  /** 回退阈值 */
  fallbackThreshold: 0.25
};

/**
 * 工作流全局配置
 */
export const WORKFLOW_CONFIG = {
  /** 是否启用工作流 */
  enabled: true,
  /** 持久化路径 */
  persistencePath: '.codemap/workflow',
  /** 最大并发阶段数 */
  maxConcurrentPhases: 1,
  /** 是否自动保存检查点 */
  autoCheckpoint: true,
  /** 检查点间隔（秒） */
  checkpointInterval: 300
};
