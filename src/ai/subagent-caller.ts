// ============================================
// Subagent Caller - Task 工具调用封装
// ============================================

import { spawn } from 'child_process';
import type { CodeMap } from '../types/index.js';

/**
 * Subagent 输入类型
 */
export interface SubagentInput {
  project: CodeMap['project'];
  summary: CodeMap['summary'];
  modules: CodeMap['modules'];
  dependencies: CodeMap['dependencies'];
  requestType: 'overview' | 'analysis' | 'documentation';
  options: {
    includeContext: boolean;
    maxModules: number;
  };
}

/**
 * 架构信息
 */
export interface ArchitectureInfo {
  pattern: string;
  layers: Array<{
    name: string;
    responsibility: string;
    modules: string[];
  }>;
  metrics: {
    coupling: 'low' | 'medium' | 'high';
    cohesion: 'low' | 'medium' | 'high';
    complexity: 'low' | 'medium' | 'high';
  };
}

/**
 * Subagent 输出类型
 */
export interface SubagentOutput {
  type: string;
  title: string;
  content: string;
  highlights: string[];
  architecture?: ArchitectureInfo;
  metadata: {
    generatedAt: string;
    model: string;
  };
}

/**
 * Subagent Caller 配置
 */
export interface SubagentCallerConfig {
  /** CLI 路径 */
  cliPath?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 子 agent 名称 */
  subagentName?: string;
}

/**
 * Subagent Caller - 通过 Claude CLI 调用 subagent
 */
export class SubagentCaller {
  private cliPath: string;
  private timeout: number;
  private subagentName: string;

  constructor(config: SubagentCallerConfig = {}) {
    this.cliPath = config.cliPath || 'claude';
    this.timeout = config.timeout || 120000; // 默认 2 分钟
    this.subagentName = config.subagentName || 'ai-generator';
    // 使用 subagentName 构建提示词（用于日志或调试）
    void this.subagentName;
  }

  /**
   * 调用 subagent 生成项目概述
   */
  async generateOverview(codeMap: CodeMap): Promise<SubagentOutput> {
    // 准备输入数据
    const input: SubagentInput = {
      project: codeMap.project,
      summary: {
        totalFiles: codeMap.summary.totalFiles,
        totalModules: codeMap.summary.totalModules,
        totalExports: codeMap.summary.totalExports,
        totalTypes: codeMap.summary.totalTypes,
        totalLines: codeMap.summary.totalLines
      },
      modules: codeMap.modules.slice(0, 20), // 限制数量
      dependencies: codeMap.dependencies,
      requestType: 'overview',
      options: {
        includeContext: true,
        maxModules: 20
      }
    };

    // 构建 prompt
    const prompt = this.buildPrompt(input);

    // 调用 CLI
    const result = await this.execute(prompt);

    // 解析输出
    return this.parseOutput(result);
  }

  /**
   * 构建调用 subagent 的 prompt
   */
  private buildPrompt(input: SubagentInput): string {
    const contextJson = JSON.stringify(input, null, 2);

    return `# AI Generator Subagent

你是 AI Generator Subagent，负责根据 CodeMap 数据生成专业的项目概述。

## 角色定义

你是一位专业的软件架构师，擅长分析 TypeScript/JavaScript 项目结构，识别架构模式，并提供有价值的见解。

## 输入数据

\`\`\`json
${contextJson}
\`\`\`

## 任务

根据上述 CodeMap 数据，生成一个专业的项目概述，需要包含以下内容：

### 1. 项目概览
- 项目名称和基本信息
- 技术栈识别
- 总体架构描述

### 2. 统计信息
- 文件总数、代码行数、模块数量
- 导出符号数量和类型分布

### 3. 核心模块分析
- 最重要的 5-10 个模块及其职责
- 每个模块的关键导出
- 模块间的依赖关系

### 4. 架构特点
- 识别的架构模式（如分层、DDD、微服务等）
- 各层的职责和边界
- 依赖方向和耦合度

### 5. 亮点模块
- 值得注意的模块或设计模式
- 可能的创新点或最佳实践

### 6. 建议（可选）
- 潜在的改进方向
- 架构优化建议

## 输出格式

请返回 JSON 格式的结果，包含以下字段：

\`\`\`json
{
  "type": "overview",
  "title": "项目概述标题",
  "content": "Markdown 格式的详细描述（支持多级标题、列表、表格等）",
  "highlights": ["亮点1", "亮点2", ...],
  "architecture": {
    "pattern": "识别的架构模式",
    "layers": [
      {
        "name": "层名称",
        "responsibility": "职责描述",
        "modules": ["模块列表"]
      }
    ],
    "metrics": {
      "coupling": "low|medium|high",
      "cohesion": "low|medium|high",
      "complexity": "low|medium|high"
    }
  },
  "metadata": {
    "generatedAt": "ISO 时间戳",
    "model": "sonnet"
  }
}
\`\`\`

## 输出指南

1. **准确性**: 确保分析基于实际数据，不要臆造信息
2. **专业性**: 使用标准的软件架构术语
3. **简洁性**: 保持内容简洁但完整，突出重点
4. **可读性**: 使用 Markdown 格式提高可读性
5. **实用性**: 提供有价值的架构见解和建议

## 注意事项

- 如果某些信息无法从输入数据中确定，请标注为"未识别"或"需要更多信息"
- 优先分析依赖关系最复杂的模块
- 关注导出数量多、被依赖次数多的核心模块

请确保返回的是有效的 JSON 格式，不要包含其他文字说明。
`;
  }

  /**
   * 执行 CLI 调用
   */
  private execute(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-p',
        '--output-format', 'json',
        '--dangerously-skip-permissions'
      ];

      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn(this.cliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // 超时处理
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        reject(new Error(`Subagent 执行超时（${this.timeout / 1000}秒）`));
      }, this.timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);

        if (killed) return;

        if (code !== 0 && code !== null) {
          reject(new Error(`Subagent CLI 错误: ${stderr || `exit code ${code}`}`));
          return;
        }

        resolve(stdout);
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        if (!killed) {
          reject(new Error(`Subagent CLI 执行失败: ${error.message}`));
        }
      });

      // 发送提示词
      proc.stdin.write(prompt);
      proc.stdin.end();
    });
  }

  /**
   * 解析 subagent 输出
   */
  private parseOutput(stdout: string): SubagentOutput {
    // Claude 可能输出多行 JSON，需要找到有效的 JSON
    const lines = stdout.trim().split('\n');
    let jsonStr = '';

    // 从后往前找有效的 JSON 对象
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('{') && line.endsWith('}')) {
        jsonStr = line;
        break;
      }
    }

    if (!jsonStr) {
      // 如果没有 JSON，返回默认格式
      return {
        type: 'overview',
        title: '项目概述',
        content: stdout.trim(),
        highlights: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'unknown'
        }
      };
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        type: parsed.type || 'overview',
        title: parsed.title || '项目概述',
        content: parsed.content || stdout.trim(),
        highlights: parsed.highlights || [],
        architecture: parsed.architecture,
        metadata: {
          generatedAt: parsed.metadata?.generatedAt || new Date().toISOString(),
          model: parsed.metadata?.model || 'sonnet'
        }
      };
    } catch (error) {
      // 解析失败，返回原始内容
      return {
        type: 'overview',
        title: '项目概述',
        content: stdout.trim(),
        highlights: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'parse-error'
        }
      };
    }
  }

  /**
   * 检查 CLI 是否可用
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.cliPath, ['--version'], {
        stdio: 'ignore'
      });

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });

      // 2 秒超时
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 2000);
    });
  }
}

/**
 * 创建默认的 SubagentCaller 实例
 */
export function createSubagentCaller(config?: SubagentCallerConfig): SubagentCaller {
  return new SubagentCaller(config);
}
