/**
 * [META] since:2026-03 | owner:codemap-team | stable:false
 * [WHY] @version 2.5
 */

/**
 * 工作流 CI 执行器
 * 在工作流 CI 阶段执行 CI 门禁检查
 *
 * @module WorkflowCIExecutor
 * @version 2.5
 *
 * 设计参考: CI_GATEWAY_DESIGN.md §11.2
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { WorkflowPhase } from './types.js';
import type { WorkflowContext } from './types.js';

const execFileAsync = promisify(execFile);

// ============================================
// 类型定义
// ============================================

/**
 * CI 检查类型
 */
export type CICheckType =
  | 'commit-format'   // 提交格式检查
  | 'file-headers'    // 文件头注释检查
  | 'risk-assessment' // 风险评估
  | 'output-contract' // 输出契约检查
  | 'unit-tests'      // 单元测试
  | 'type-check'      // 类型检查
  | 'lint';           // 代码检查

/**
 * CI 检查配置
 */
export interface CICheckConfig {
  /** 检查类型 */
  type: CICheckType;
  /** 是否启用 */
  enabled: boolean;
  /** 是否阻塞 */
  blocking: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 自定义配置 */
  options?: Record<string, unknown>;
}

/**
 * CI 检查结果
 */
export interface CICheckResult {
  /** 检查类型 */
  type: CICheckType;
  /** 是否通过 */
  passed: boolean;
  /** 检查耗时（毫秒） */
  duration: number;
  /** 输出信息 */
  output: string;
  /** 错误信息 */
  errors?: string[];
  /** 警告信息 */
  warnings?: string[];
  /** 详细信息 */
  details?: Record<string, unknown>;
}

/**
 * CI 执行结果
 */
export interface CIExecutionResult {
  /** 是否全部通过 */
  success: boolean;
  /** 各检查结果 */
  checks: CICheckResult[];
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 执行时间戳 */
  timestamp: Date;
  /** 失败检查数 */
  failedCount: number;
  /** 警告数 */
  warningCount: number;
}

/**
 * CI 阶段配置
 */
export interface CIPhaseConfig {
  /** 阶段名称 */
  phase: WorkflowPhase;
  /** 启用的检查 */
  checks: CICheckType[];
  /** 并行执行 */
  parallel: boolean;
  /** 失败策略 */
  failStrategy: 'fast' | 'continue';
}

// ============================================
// 默认 CI 配置
// ============================================

/**
 * 默认 CI 检查配置
 */
const DEFAULT_CI_CHECKS: Record<CICheckType, CICheckConfig> = {
  'commit-format': {
    type: 'commit-format',
    enabled: true,
    blocking: true,
    timeout: 10000,
  },
  'file-headers': {
    type: 'file-headers',
    enabled: true,
    blocking: false,
    timeout: 30000,
  },
  'risk-assessment': {
    type: 'risk-assessment',
    enabled: true,
    blocking: false,
    timeout: 60000,
  },
  'output-contract': {
    type: 'output-contract',
    enabled: true,
    blocking: true,
    timeout: 60000,
  },
  'unit-tests': {
    type: 'unit-tests',
    enabled: true,
    blocking: true,
    timeout: 120000,
  },
  'type-check': {
    type: 'type-check',
    enabled: true,
    blocking: true,
    timeout: 60000,
  },
  'lint': {
    type: 'lint',
    enabled: true,
    blocking: false,
    timeout: 60000,
  },
};

// ============================================
// WorkflowCIExecutor 类
// ============================================

export class WorkflowCIExecutor {
  private projectRoot: string;
  private checkConfigs: Map<CICheckType, CICheckConfig>;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.checkConfigs = new Map();

    // 初始化默认配置
    for (const [type, config] of Object.entries(DEFAULT_CI_CHECKS)) {
      this.checkConfigs.set(type as CICheckType, { ...config });
    }
  }

  /**
   * 执行 CI 阶段的所有检查
   *
   * @param context - 工作流上下文
   * @param targetFiles - 目标文件列表
   * @returns CI 执行结果
   */
  async executeCI(
    context: WorkflowContext,
    targetFiles: string[]
  ): Promise<CIExecutionResult> {
    const startTime = Date.now();
    const checks: CICheckResult[] = [];

    // 确定需要执行的检查
    const enabledChecks = Array.from(this.checkConfigs.values()).filter(
      (c) => c.enabled
    );

    // 顺序执行（避免资源竞争）
    for (const config of enabledChecks) {
      const result = await this.executeCheck(config, context, targetFiles);
      checks.push(result);

      // 快速失败策略
      if (!result.passed && config.blocking) {
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    const failedCount = checks.filter((c) => !c.passed).length;
    const warningCount = checks.reduce(
      (sum, c) => sum + (c.warnings?.length || 0),
      0
    );

    return {
      success: failedCount === 0,
      checks,
      totalDuration,
      timestamp: new Date(),
      failedCount,
      warningCount,
    };
  }

  /**
   * 执行单个检查
   */
  private async executeCheck(
    config: CICheckConfig,
    context: WorkflowContext,
    targetFiles: string[]
  ): Promise<CICheckResult> {
    const startTime = Date.now();

    try {
      switch (config.type) {
        case 'commit-format':
          return await this.checkCommitFormat(config, startTime);

        case 'file-headers':
          return await this.checkFileHeaders(config, targetFiles, startTime);

        case 'risk-assessment':
          return await this.checkRiskAssessment(config, targetFiles, startTime);

        case 'output-contract':
          return await this.checkOutputContract(config, startTime);

        case 'unit-tests':
          return await this.runUnitTests(config, startTime);

        case 'type-check':
          return await this.runTypeCheck(config, startTime);

        case 'lint':
          return await this.runLint(config, startTime);

        default:
          return this.createErrorResult(
            config.type,
            startTime,
            '未知的检查类型'
          );
      }
    } catch (error) {
      return this.createErrorResult(
        config.type,
        startTime,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 检查提交格式
   */
  private async checkCommitFormat(
    config: CICheckConfig,
    startTime: number
  ): Promise<CICheckResult> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['log', '-1', '--format=%s'],
        { cwd: this.projectRoot, timeout: config.timeout }
      );

      const message = stdout.trim();
      const tagRegex = /^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]\s*.+?:.+$/;
      const valid = tagRegex.test(message);

      return {
        type: config.type,
        passed: valid,
        duration: Date.now() - startTime,
        output: valid ? '提交格式正确' : '提交格式错误',
        errors: valid
          ? undefined
          : [
              '提交信息格式: [TAG] scope: message',
              '示例: [FEATURE] auth: add login functionality',
            ],
      };
    } catch (error) {
      return this.createErrorResult(
        config.type,
        startTime,
        '无法获取提交信息'
      );
    }
  }

  /**
   * 检查文件头注释
   */
  private async checkFileHeaders(
    config: CICheckConfig,
    targetFiles: string[],
    startTime: number
  ): Promise<CICheckResult> {
    const fs = await import('fs');
    const path = await import('path');

    const errors: string[] = [];
    const warnings: string[] = [];
    let checkedCount = 0;

    for (const file of targetFiles) {
      if (!file.endsWith('.ts')) continue;

      try {
        const content = fs.readFileSync(path.join(this.projectRoot, file), 'utf-8');
        const lines = content.split('\n').slice(0, 10);
        const header = lines.join('\n');

        // 检查 [META]
        if (!header.includes('[META]')) {
          errors.push(`${file}: 缺少 [META] 注释`);
        }

        // 检查 [WHY]
        if (!header.includes('[WHY]')) {
          errors.push(`${file}: 缺少 [WHY] 注释`);
        }

        checkedCount++;
      } catch {
        warnings.push(`无法读取文件: ${file}`);
      }
    }

    return {
      type: config.type,
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      output: `检查了 ${checkedCount} 个文件的头部注释`,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      details: { checkedCount, missingCount: errors.length },
    };
  }

  /**
   * 风险评估检查
   */
  private async checkRiskAssessment(
    config: CICheckConfig,
    targetFiles: string[],
    startTime: number
  ): Promise<CICheckResult> {
    // 这里可以集成 GitAnalyzer 进行风险评估
    // 简化实现：检查文件数量
    const highRiskFiles = targetFiles.filter((f) => {
      // 模拟高风险判断：核心文件
      return f.includes('core') || f.includes('index');
    });

    const passed = highRiskFiles.length <= 3; // 最多允许 3 个高风险文件

    return {
      type: config.type,
      passed,
      duration: Date.now() - startTime,
      output: `分析了 ${targetFiles.length} 个文件的风险`,
      warnings:
        highRiskFiles.length > 0
          ? [`高风险文件: ${highRiskFiles.join(', ')}`]
          : undefined,
      details: {
        totalFiles: targetFiles.length,
        highRiskCount: highRiskFiles.length,
      },
    };
  }

  /**
   * 检查输出契约
   */
  private async checkOutputContract(
    config: CICheckConfig,
    startTime: number
  ): Promise<CICheckResult> {
    const fs = await import('fs');
    const path = await import('path');

    const outputDir = path.join(this.projectRoot, '.codemap');
    const requiredFiles = ['AI_MAP.md', 'CONTEXT.md', 'codemap.json'];

    const missingFiles: string[] = [];

    for (const file of requiredFiles) {
      const filePath = path.join(outputDir, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    return {
      type: config.type,
      passed: missingFiles.length === 0,
      duration: Date.now() - startTime,
      output: '检查输出契约',
      errors:
        missingFiles.length > 0
          ? [`缺少必需文件: ${missingFiles.join(', ')}`]
          : undefined,
      details: { requiredFiles, missingFiles },
    };
  }

  /**
   * 运行单元测试
   */
  private async runUnitTests(
    config: CICheckConfig,
    startTime: number
  ): Promise<CICheckResult> {
    try {
      const { stdout, stderr } = await execFileAsync(
        'npm',
        ['test'],
        { cwd: this.projectRoot, timeout: config.timeout }
      );

      const output = stdout + stderr;
      const passed = !output.includes('FAIL') && !output.includes('failed');

      return {
        type: config.type,
        passed,
        duration: Date.now() - startTime,
        output: passed ? '所有测试通过' : '部分测试失败',
        errors: passed ? undefined : [output.slice(-500)], // 最后 500 字符
      };
    } catch (error) {
      return {
        type: config.type,
        passed: false,
        duration: Date.now() - startTime,
        output: '测试执行失败',
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * 运行类型检查
   */
  private async runTypeCheck(
    config: CICheckConfig,
    startTime: number
  ): Promise<CICheckResult> {
    try {
      const { stdout, stderr } = await execFileAsync(
        'npm',
        ['run', 'typecheck'],
        { cwd: this.projectRoot, timeout: config.timeout }
      );

      const output = stdout + stderr;
      const passed = !output.includes('error TS');

      return {
        type: config.type,
        passed,
        duration: Date.now() - startTime,
        output: passed ? '类型检查通过' : '发现类型错误',
        errors: passed ? undefined : this.extractTypeErrors(output),
      };
    } catch (error) {
      return {
        type: config.type,
        passed: false,
        duration: Date.now() - startTime,
        output: '类型检查执行失败',
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * 运行代码检查
   */
  private async runLint(
    config: CICheckConfig,
    startTime: number
  ): Promise<CICheckResult> {
    try {
      const { stdout, stderr } = await execFileAsync(
        'npm',
        ['run', 'lint'],
        { cwd: this.projectRoot, timeout: config.timeout }
      );

      const output = stdout + stderr;
      const passed = !output.includes('error');

      return {
        type: config.type,
        passed,
        duration: Date.now() - startTime,
        output: passed ? '代码检查通过' : '发现代码问题',
        warnings: passed ? undefined : [output.slice(-500)],
      };
    } catch (error) {
      // lint 错误返回警告而非失败
      return {
        type: config.type,
        passed: true,
        duration: Date.now() - startTime,
        output: '代码检查完成',
        warnings: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * 提取类型错误
   */
  private extractTypeErrors(output: string): string[] {
    const lines = output.split('\n');
    const errors: string[] = [];

    for (const line of lines) {
      if (line.includes('error TS')) {
        errors.push(line);
      }
      if (errors.length >= 5) break; // 最多显示 5 个错误
    }

    return errors;
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(
    type: CICheckType,
    startTime: number,
    error: string
  ): CICheckResult {
    return {
      type,
      passed: false,
      duration: Date.now() - startTime,
      output: '检查执行失败',
      errors: [error],
    };
  }

  /**
   * 更新检查配置
   */
  updateCheckConfig(type: CICheckType, config: Partial<CICheckConfig>): void {
    const existing = this.checkConfigs.get(type);
    if (existing) {
      this.checkConfigs.set(type, { ...existing, ...config });
    }
  }

  /**
   * 禁用指定检查
   */
  disableCheck(type: CICheckType): void {
    this.updateCheckConfig(type, { enabled: false });
  }

  /**
   * 启用指定检查
   */
  enableCheck(type: CICheckType): void {
    this.updateCheckConfig(type, { enabled: true });
  }

  /**
   * 获取检查配置
   */
  getCheckConfig(type: CICheckType): CICheckConfig | undefined {
    return this.checkConfigs.get(type);
  }

  /**
   * 获取所有检查配置
   */
  getAllConfigs(): CICheckConfig[] {
    return Array.from(this.checkConfigs.values());
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建工作流 CI 执行器实例
 */
export function createWorkflowCIExecutor(projectRoot?: string): WorkflowCIExecutor {
  return new WorkflowCIExecutor(projectRoot);
}

/**
 * 快速执行 CI 检查（便捷函数）
 */
export async function executeCI(
  context: WorkflowContext,
  targetFiles: string[],
  projectRoot?: string
): Promise<CIExecutionResult> {
  const executor = createWorkflowCIExecutor(projectRoot);
  return executor.executeCI(context, targetFiles);
}

export default WorkflowCIExecutor;
