// ============================================
// Codex CLI Provider 实现
// ============================================

import { spawn } from 'child_process';
import { AIProvider, type AIProviderConfig, type AIResponse } from './provider.js';
import type { CodeMap } from '../types/index.js';

/**
 * Codex Provider 配置
 */
export interface CodexProviderConfig extends AIProviderConfig {
  /** CLI 路径，默认 codex */
  cliPath?: string;
}

/**
 * Codex Provider - 通过 CLI 调用 Codex
 */
export class CodexProvider extends AIProvider {
  public readonly name = 'codex' as const;
  private cliPath: string;

  constructor(config: CodexProviderConfig = {}) {
    super(config);
    this.cliPath = config.cliPath || 'codex';
  }

  /**
   * 执行 AI 推理
   */
  async execute(prompt: string, context?: CodeMap): Promise<AIResponse> {
    const timeout = this.config.timeout || 60000;

    // 构建包含上下文的完整提示词
    const fullPrompt = this.buildPrompt(prompt, context);

    return new Promise((resolve, reject) => {
      // Codex exec 使用位置参数传递 prompt
      const args = [
        'exec',
        '--dangerously-bypass-approvals-and-sandbox',
        fullPrompt
      ];

      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn(this.cliPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout
      });

      // 超时处理
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        reject(new Error(`Codex 执行超时（${timeout / 1000}秒）`));
      }, timeout);

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
          reject(new Error(`Codex CLI 错误: ${stderr || `exit code ${code}`}`));
          return;
        }

        try {
          const response = this.parseResponse(stdout);
          resolve(response);
        } catch (error) {
          reject(new Error(`解析 Codex 响应失败: ${error instanceof Error ? error.message : String(error)}`));
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        if (!killed) {
          reject(new Error(`Codex CLI 执行失败: ${error.message}`));
        }
      });
    });
  }

  /**
   * 检查 Codex CLI 是否可用
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

  /**
   * 构建提示词
   */
  private buildPrompt(prompt: string, context?: CodeMap): string {
    let fullPrompt = prompt;

    if (context) {
      const contextInfo = this.summarizeContext(context);
      fullPrompt = `${contextInfo}\n\n---\n\n${prompt}`;
    }

    return fullPrompt;
  }

  /**
   * 总结 CodeMap 上下文
   */
  private summarizeContext(codeMap: CodeMap): string {
    const lines: string[] = [];

    lines.push('# Project Context');
    lines.push('');
    lines.push(`Project: ${codeMap.project.name}`);
    lines.push(`Total Files: ${codeMap.summary.totalFiles}`);
    lines.push(`Total Modules: ${codeMap.summary.totalModules}`);
    lines.push('');

    // 入口点
    const entryPoints = codeMap.modules.filter(m => {
      const basename = require('path').basename(m.path);
      return basename === 'index.ts' || basename === 'main.ts' || basename === 'app.ts';
    });

    if (entryPoints.length > 0) {
      lines.push('## Entry Points');
      for (const ep of entryPoints.slice(0, 5)) {
        lines.push(`- ${ep.path}`);
      }
      lines.push('');
    }

    // 模块列表
    lines.push('## Modules');
    for (const mod of codeMap.modules.slice(0, 20)) {
      const exports = mod.exports.map(e => e.name).join(', ');
      lines.push(`- ${mod.path}: ${exports || '(no exports)'}`);
    }

    if (codeMap.modules.length > 20) {
      lines.push(`- ... and ${codeMap.modules.length - 20} more`);
    }

    return lines.join('\n');
  }

  /**
   * 解析 Codex CLI JSON 响应
   */
  private parseResponse(stdout: string): AIResponse {
    // 尝试解析 JSON
    const trimmed = stdout.trim();

    try {
      const parsed = JSON.parse(trimmed);

      // 处理不同的响应格式
      if (parsed.result) {
        return { content: parsed.result };
      }
      if (parsed.output) {
        return { content: parsed.output };
      }
      if (parsed.response) {
        return { content: parsed.response };
      }
      if (parsed.message) {
        return { content: parsed.message };
      }

      // 如果解析成功但没有已知字段，返回 stringify 后的内容
      return { content: JSON.stringify(parsed, null, 2) };
    } catch {
      // 如果不是 JSON，直接返回原始内容
      return { content: trimmed };
    }
  }
}
