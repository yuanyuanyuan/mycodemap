/**
 * [META] since:2026-03 | owner:codemap-team | stable:false
 * [WHY] @version 2.5
 */

/**
 * 工作流测试关联器
 * 根据工作流阶段提供测试建议
 *
 * @module WorkflowTestLinker
 * @version 2.5
 *
 * 设计参考: REFACTOR_TEST_LINKER_DESIGN.md §7.2
 */

import type { WorkflowPhase } from './types.js';
import type { UnifiedResult } from '../types.js';

// ============================================
// 类型定义
// ============================================

/**
 * 测试策略
 */
export interface TestStrategy {
  /** 策略模式 */
  mode: TestMode;
  /** 包含模式 */
  includePatterns: string[];
  /** 排除模式 */
  excludePatterns: string[];
  /** 优先级（可选） */
  priority?: TestPriority;
}

/**
 * 测试模式
 */
export type TestMode =
  | 'find-similar'    // 查找相似测试作为参考
  | 'find-affected'   // 查找受影响的测试
  | 'focus-high-risk' // 关注高风险测试
  | 'required-tests'  // 必需的测试
  | 'verify'          // 验证测试
  | 'full-suite';     // 完整测试套件

/**
 * 测试优先级
 */
export type TestPriority = 'high-risk-first' | 'relevance-first' | 'recent-first';

/**
 * 测试建议
 */
export interface TestSuggestion {
  /** 测试文件路径 */
  file: string;
  /** 相关度分数 */
  relevance: number;
  /** 建议动作 */
  action: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 关联的源文件 */
  sourceFiles: string[];
  /** 风险等级（如适用） */
  riskLevel?: 'high' | 'medium' | 'low';
}

/**
 * 测试配置
 */
export interface TestConfig {
  /** 测试框架 */
  framework: 'jest' | 'vitest' | 'none';
  /** 测试模式 */
  patterns: {
    testFile: string[];
    testDir: string[];
  };
  /** 源文件到测试文件映射 */
  sourceToTestMap: Map<string, string[]>;
}

// ============================================
// 阶段测试策略配置
// ============================================

/**
 * 工作流阶段与测试策略的映射
 * 定义每个阶段应该采用什么样的测试策略
 */
const PHASE_TEST_STRATEGY: Record<WorkflowPhase, TestStrategy> = {
  'find': {
    mode: 'find-similar',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts'],
    excludePatterns: [],
  },
  'read': {
    mode: 'find-affected',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts'],
    excludePatterns: [],
  },
  'link': {
    mode: 'required-tests',
    includePatterns: ['**/*.test.ts'],
    excludePatterns: [],
    priority: 'relevance-first',
  },
  'show': {
    mode: 'verify',
    includePatterns: ['**/*.test.ts', '**/*.spec.ts'],
    excludePatterns: [],
  },
};

// ============================================
// WorkflowTestLinker 类
// ============================================

export class WorkflowTestLinker {
  private config: TestConfig | null = null;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * 加载测试配置
   * 自动检测 jest.config.js / vitest.config.ts
   */
  async loadConfig(): Promise<TestConfig> {
    const fsPromises = await import('fs').then(m => m.promises);
    const path = await import('path');

    // 1. 尝试读取 vitest.config.ts
    const vitestPath = path.join(this.projectRoot, 'vitest.config.ts');
    if (await this.pathExists(vitestPath)) {
      this.config = await this.parseVitestConfig(vitestPath);
      return this.config;
    }

    // 2. 尝试读取 jest.config.js
    const jestPath = path.join(this.projectRoot, 'jest.config.js');
    if (await this.pathExists(jestPath)) {
      this.config = await this.parseJestConfig(jestPath);
      return this.config;
    }

    // 3. 使用默认配置 (Vitest)
    this.config = {
      framework: 'vitest',
      patterns: {
        testFile: ['**/*.test.ts', '**/*.spec.ts'],
        testDir: ['__tests__', 'test', 'tests'],
      },
      sourceToTestMap: new Map(),
    };

    return this.config;
  }

  /**
   * 根据当前工作流阶段生成测试建议
   *
   * @param phase - 当前工作流阶段
   * @param sourceFiles - 源文件列表
   * @param analysisResults - 分析结果（用于风险分析）
   * @returns 测试建议列表
   */
  async getTestSuggestions(
    phase: WorkflowPhase,
    sourceFiles: string[],
    analysisResults?: UnifiedResult[]
  ): Promise<TestSuggestion[]> {
    // 确保配置已加载
    if (!this.config) {
      await this.loadConfig();
    }

    const strategy = PHASE_TEST_STRATEGY[phase];
    const testFiles = await this.findRelatedTests(sourceFiles, strategy);

    return testFiles.map((testFile) => ({
      file: testFile,
      relevance: this.calculateRelevance(testFile, sourceFiles),
      action: this.getSuggestedAction(phase, testFile),
      priority: this.getPriority(phase, testFile, analysisResults),
      sourceFiles: this.getSourceFilesForTest(testFile, sourceFiles),
      riskLevel: this.getRiskLevel(testFile, analysisResults),
    }));
  }

  /**
   * 查找相关测试文件
   */
  private async findRelatedTests(
    sourceFiles: string[],
    strategy: TestStrategy
  ): Promise<string[]> {
    if (!this.config) return [];

    const relatedTests = new Set<string>();

    for (const sourceFile of sourceFiles) {
      // 1. 直接映射查找
      const directTests = this.config.sourceToTestMap.get(sourceFile) || [];
      directTests.forEach((t) => relatedTests.add(t));

      // 2. 文件名推断
      const inferredTests = this.inferTestFiles(sourceFile);
      inferredTests.forEach((t) => relatedTests.add(t));

      // 3. 目录级别匹配
      const dirTests = await this.findDirLevelTests(sourceFile);
      dirTests.forEach((t) => relatedTests.add(t));
    }

    return Array.from(relatedTests);
  }

  /**
   * 从源文件名推断测试文件
   */
  private inferTestFiles(sourceFile: string): string[] {
    if (!this.config) return [];

    const tests: string[] = [];
    const normalized = sourceFile.replace(/\\/g, '/');

    // 移除 .ts 后缀，添加测试后缀
    const basePath = normalized.replace(/\.ts$/, '');

    for (const pattern of this.config.patterns.testFile) {
      if (pattern.includes('.test.')) {
        tests.push(`${basePath}.test.ts`);
      }
      if (pattern.includes('.spec.')) {
        tests.push(`${basePath}.spec.ts`);
      }
    }

    return tests;
  }

  /**
   * 查找目录级别的测试文件
   */
  private async findDirLevelTests(sourceFile: string): Promise<string[]> {
    if (!this.config) return [];

    const fs = await import('fs');
    const path = await import('path');

    const tests: string[] = [];
    const normalized = sourceFile.replace(/\\/g, '/');
    const dir = path.dirname(normalized);

    for (const testDir of this.config.patterns.testDir) {
      const testDirPath = path.join(dir, testDir);

      try {
        if (fs.existsSync(testDirPath)) {
          const files = fs.readdirSync(testDirPath);
          for (const file of files) {
            if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
              tests.push(path.join(testDirPath, file));
            }
          }
        }
      } catch {
        // 目录不存在或无法读取，跳过
      }
    }

    return tests;
  }

  /**
   * 计算测试文件的相关度
   */
  private calculateRelevance(testFile: string, sourceFiles: string[]): number {
    let relevance = 0.5; // 基础相关度

    const normalizedTest = testFile.replace(/\\/g, '/');

    for (const sourceFile of sourceFiles) {
      const normalizedSource = sourceFile.replace(/\\/g, '/');
      const sourceBase = normalizedSource.replace(/\.ts$/, '').split('/').pop();
      const testBase = normalizedTest.replace(/\.(test|spec)\.ts$/, '').split('/').pop();

      // 文件名匹配度
      if (sourceBase && testBase && sourceBase === testBase) {
        relevance += 0.3;
      }

      // 目录匹配度
      const sourceDir = normalizedSource.split('/').slice(0, -1).join('/');
      const testDir = normalizedTest.split('/').slice(0, -1).join('/');
      if (sourceDir && testDir && testDir.includes(sourceDir)) {
        relevance += 0.2;
      }
    }

    return Math.min(1, relevance);
  }

  /**
   * 获取建议动作
   */
  private getSuggestedAction(phase: WorkflowPhase, testFile: string): string {
    const actions: Record<WorkflowPhase, string> = {
      'find': '参考此测试定位相关实现与命名模式',
      'read': '阅读实现后优先运行此测试验证影响',
      'link': '结合依赖与引用关系补跑此测试',
      'show': '输出概览后确认此测试场景仍成立',
    };

    return actions[phase] || '运行此测试';
  }

  /**
   * 获取测试优先级
   */
  private getPriority(
    phase: WorkflowPhase,
    testFile: string,
    analysisResults?: UnifiedResult[]
  ): 'high' | 'medium' | 'low' {
    if (phase === 'link') {
      // 风险阶段：基于分析结果判断
      const riskResult = analysisResults?.find(
        (r) => r.file === testFile || testFile.includes(r.file)
      );
      if (riskResult?.metadata?.riskLevel === 'high') return 'high';
      if (riskResult?.metadata?.riskLevel === 'medium') return 'medium';
    }

    if (phase === 'show') {
      return 'high';
    }

    // 根据文件名判断
    if (testFile.includes('e2e') || testFile.includes('integration')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 获取测试关联的源文件
   */
  private getSourceFilesForTest(testFile: string, sourceFiles: string[]): string[] {
    const normalizedTest = testFile.replace(/\\/g, '/');
    const testBase = normalizedTest.replace(/\.(test|spec)\.ts$/, '');

    return sourceFiles.filter((sourceFile) => {
      const normalizedSource = sourceFile.replace(/\\/g, '/');
      const sourceBase = normalizedSource.replace(/\.ts$/, '');
      return testBase.includes(sourceBase) || sourceBase.includes(testBase);
    });
  }

  /**
   * 获取测试的风险等级
   */
  private getRiskLevel(
    testFile: string,
    analysisResults?: UnifiedResult[]
  ): 'high' | 'medium' | 'low' | undefined {
    const result = analysisResults?.find(
      (r) => r.file === testFile || testFile.includes(r.file)
    );
    return result?.metadata?.riskLevel as 'high' | 'medium' | 'low' | undefined;
  }

  /**
   * 检查文件是否存在
   */
  private async pathExists(filePath: string): Promise<boolean> {
    const fsPromises = await import('fs').then((m) => m.promises);
    try {
      await fsPromises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 解析 Vitest 配置
   */
  private async parseVitestConfig(configPath: string): Promise<TestConfig> {
    // 简化实现：返回默认 Vitest 配置
    // 实际项目中可以解析配置文件内容
    return {
      framework: 'vitest',
      patterns: {
        testFile: ['**/*.test.ts', '**/*.spec.ts'],
        testDir: ['__tests__', 'test', 'tests'],
      },
      sourceToTestMap: new Map(),
    };
  }

  /**
   * 解析 Jest 配置
   */
  private async parseJestConfig(configPath: string): Promise<TestConfig> {
    // 简化实现：返回默认 Jest 配置
    return {
      framework: 'jest',
      patterns: {
        testFile: ['**/*.test.ts', '**/*.spec.ts'],
        testDir: ['__tests__', 'test', 'tests'],
      },
      sourceToTestMap: new Map(),
    };
  }

  /**
   * 构建源文件到测试文件的映射
   */
  async buildMapping(sourceFiles: string[]): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    for (const sourceFile of sourceFiles) {
      const tests = await this.findRelatedTests([sourceFile], {
        mode: 'find-affected',
        includePatterns: this.config!.patterns.testFile,
        excludePatterns: [],
      });

      this.config!.sourceToTestMap.set(sourceFile, tests);
    }
  }

  /**
   * 获取当前阶段的测试策略
   */
  getPhaseStrategy(phase: WorkflowPhase): TestStrategy {
    return PHASE_TEST_STRATEGY[phase];
  }

  /**
   * 获取所有阶段的测试策略
   */
  getAllStrategies(): Record<WorkflowPhase, TestStrategy> {
    return { ...PHASE_TEST_STRATEGY };
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建工作流测试关联器实例
 */
export function createWorkflowTestLinker(projectRoot?: string): WorkflowTestLinker {
  return new WorkflowTestLinker(projectRoot);
}

/**
 * 快速获取测试建议（便捷函数）
 */
export async function getTestSuggestions(
  phase: WorkflowPhase,
  sourceFiles: string[],
  projectRoot?: string,
  analysisResults?: UnifiedResult[]
): Promise<TestSuggestion[]> {
  const linker = createWorkflowTestLinker(projectRoot);
  return linker.getTestSuggestions(phase, sourceFiles, analysisResults);
}

export default WorkflowTestLinker;
