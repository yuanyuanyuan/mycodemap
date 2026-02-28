// ============================================
// File Describer - 使用 Claude Code CLI 为每个文件生成内容描述
// ============================================

import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import type { ModuleInfo } from '../types/index.js';

/**
 * 文件描述生成器配置
 */
export interface FileDescriberConfig {
  /** CLI 路径 */
  cliPath?: string;
  /** 并发数限制 */
  concurrency?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存目录 */
  cacheDir?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 描述最大长度 */
  maxDescriptionLength?: number;
}

/**
 * 文件描述结果
 */
export interface FileDescription {
  /** 文件路径 */
  filePath: string;
  /** AI 生成的描述 */
  description: string;
  /** 文件用途 */
  purpose: string;
  /** 关键功能列表 */
  keyFeatures: string[];
  /** 依赖关系简述 */
  dependenciesSummary: string;
  /** 生成时间 */
  generatedAt: string;
}

/**
 * 缓存条目
 */
interface CacheEntry {
  hash: string;
  description: FileDescription;
  createdAt: string;
}

/**
 * 文件描述生成器 - 使用 Claude Code CLI
 */
export class FileDescriber {
  private config: Required<FileDescriberConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheLoaded = false;

  constructor(config: FileDescriberConfig = {}) {
    this.config = {
      cliPath: config.cliPath || 'claude',
      concurrency: config.concurrency || 3,
      enableCache: config.enableCache ?? true,
      cacheDir: config.cacheDir || '.codemap/.cache',
      timeout: config.timeout || 30000,
      maxDescriptionLength: config.maxDescriptionLength || 500
    };
  }

  /**
   * 检查是否应该跳过 AI 生成
   */
  private async shouldSkipAIGeneration(): Promise<boolean> {
    // 检查 Claude CLI 是否可用
    const isAvailable = await this.isClaudeAvailable();
    if (!isAvailable) {
      return true;
    }
    return false;
  }

  /**
   * 检查 Claude CLI 是否可用
   */
  private async isClaudeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.config.cliPath, ['--version'], {
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
   * 初始化缓存
   */
  private async initCache(): Promise<void> {
    if (!this.config.enableCache || this.cacheLoaded) return;

    try {
      const cacheFile = path.join(this.config.cacheDir, 'file-descriptions.json');
      const data = await fs.readFile(cacheFile, 'utf-8');
      const entries = JSON.parse(data) as Record<string, CacheEntry>;
      for (const [key, value] of Object.entries(entries)) {
        this.cache.set(key, value);
      }
    } catch {
      // 缓存文件不存在或读取失败，忽略
    }
    this.cacheLoaded = true;
  }

  /**
   * 保存缓存
   */
  private async saveCache(): Promise<void> {
    if (!this.config.enableCache) return;

    try {
      await fs.mkdir(this.config.cacheDir, { recursive: true });
      const cacheFile = path.join(this.config.cacheDir, 'file-descriptions.json');
      const entries = Object.fromEntries(this.cache.entries());
      await fs.writeFile(cacheFile, JSON.stringify(entries, null, 2));
    } catch {
      // 保存失败，忽略
    }
  }

  /**
   * 计算文件内容哈希（用于缓存）
   */
  private async computeHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // 简单的哈希：取内容的前 1000 字符 + 文件大小 + 修改时间
      const sample = content.slice(0, 1000);
      const stats = await fs.stat(filePath);
      return `${content.length}-${stats.mtimeMs}-${this.simpleHash(sample)}`;
    } catch {
      return Date.now().toString();
    }
  }

  /**
   * 简单字符串哈希
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 构建用于 Claude 的提示词
   */
  private buildPrompt(module: ModuleInfo, allModules: ModuleInfo[], rootDir: string): string {
    const relativePath = path.relative(rootDir, module.path);
    
    // 收集依赖信息
    const importedBy = allModules.filter(m =>
      m.dependencies.some(d => relativePath.includes(d) || d.includes(relativePath))
    ).slice(0, 5);

    // 构建符号信息摘要
    const symbols = module.symbols.slice(0, 15).map(s => ({
      name: s.name,
      kind: s.kind,
      visibility: s.visibility
    }));

    const context = {
      filePath: relativePath,
      type: module.type,
      exports: module.exports.slice(0, 10).map(e => e.name),
      imports: module.imports.slice(0, 10).map(i => i.source),
      importedBy: importedBy.map(m => path.relative(rootDir, m.path)),
      symbols,
      stats: module.stats
    };

    return `分析以下代码文件，生成简洁的描述：

文件路径: ${relativePath}
类型: ${module.type}
代码行数: ${module.stats.codeLines}
导出符号数: ${module.exports.length}
导入模块数: ${module.imports.length}

导出符号:
${module.exports.slice(0, 10).map(e => `- ${e.name} (${e.kind})`).join('\n')}

主要符号:
${symbols.map(s => `- ${s.name} (${s.kind})`).join('\n')}

请用 JSON 格式返回以下信息：
{
  "description": "用 2-3 句话描述这个文件的主要功能和用途（中文）",
  "purpose": "一句话总结文件的核心职责",
  "keyFeatures": ["关键功能1", "关键功能2", "关键功能3"],
  "dependenciesSummary": "简述依赖关系（被谁依赖、依赖谁）"
}

要求：
1. 描述要简洁、准确、专业
2. keyFeatures 最多列出 3-5 个
3. 返回必须是有效的 JSON 格式
4. 描述使用中文`;
  }

  /**
   * 调用 Claude CLI
   */
  private async callClaude(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-p',
        '--output-format', 'json',
        '--dangerously-skip-permissions'
      ];

      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn(this.config.cliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // 超时处理
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        reject(new Error(`Claude 执行超时（${this.config.timeout / 1000}秒）`));
      }, this.config.timeout);

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
          reject(new Error(`Claude CLI 错误: ${stderr || `exit code ${code}`}`));
          return;
        }

        resolve(stdout);
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        if (!killed) {
          reject(new Error(`Claude CLI 执行失败: ${error.message}`));
        }
      });

      // 发送提示词
      proc.stdin.write(prompt);
      proc.stdin.end();
    });
  }

  /**
   * 解析 AI 响应
   */
  private parseAIResponse(content: string, filePath: string): FileDescription {
    try {
      // 尝试从 Claude 的 JSON 输出中提取结果
      const lines = content.trim().split('\n');
      let jsonStr = '';

      // 从后往前找有效的 JSON 对象
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('{') && line.endsWith('}')) {
          jsonStr = line;
          break;
        }
      }

      // 如果没有找到 JSON 对象，尝试匹配 JSON
      if (!jsonStr) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        return {
          filePath,
          description: parsed.description || '暂无描述',
          purpose: parsed.purpose || '',
          keyFeatures: parsed.keyFeatures || [],
          dependenciesSummary: parsed.dependenciesSummary || '',
          generatedAt: new Date().toISOString()
        };
      }
    } catch {
      // JSON 解析失败，使用原始内容
    }

    // 回退：使用原始内容
    return {
      filePath,
      description: content.slice(0, this.config.maxDescriptionLength),
      purpose: '',
      keyFeatures: [],
      dependenciesSummary: '',
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 为单个文件生成描述
   */
  async describeFile(
    module: ModuleInfo,
    allModules: ModuleInfo[],
    rootDir: string
  ): Promise<FileDescription | null> {
    // 检查是否应该跳过
    if (await this.shouldSkipAIGeneration()) {
      return null;
    }

    await this.initCache();

    const relativePath = path.relative(rootDir, module.path);
    const cacheKey = relativePath;
    const currentHash = await this.computeHash(module.path);

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && cached.hash === currentHash) {
      return cached.description;
    }

    // 生成新描述
    try {
      const prompt = this.buildPrompt(module, allModules, rootDir);
      const stdout = await this.callClaude(prompt);
      
      // 解析响应
      const parsed = this.parseAIResponse(stdout, relativePath);
      
      // 更新缓存
      this.cache.set(cacheKey, {
        hash: currentHash,
        description: parsed,
        createdAt: new Date().toISOString()
      });
      
      // 异步保存缓存
      this.saveCache().catch(() => {});
      
      return parsed;
    } catch (error) {
      console.error(`生成文件描述失败: ${relativePath}`, error);
      return null;
    }
  }

  /**
   * 批量生成文件描述（带并发控制）
   */
  async describeFiles(
    modules: ModuleInfo[],
    allModules: ModuleInfo[],
    rootDir: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, FileDescription>> {
    // 检查 Claude CLI 是否可用
    const isAvailable = await this.isClaudeAvailable();
    if (!isAvailable) {
      console.log('⚠️  Claude CLI 不可用，跳过 AI 文件描述生成');
      return new Map();
    }

    const results = new Map<string, FileDescription>();
    
    // 过滤掉不需要生成描述的文件（如测试文件、配置文件）
    const targetModules = modules.filter(m => 
      m.type === 'source' && 
      !m.path.includes('.test.') &&
      !m.path.includes('.spec.')
    );

    const total = targetModules.length;
    let completed = 0;

    // 并发控制
    const semaphore = new Semaphore(this.config.concurrency);
    const tasks = targetModules.map(async (module) => {
      await semaphore.acquire();
      try {
        const description = await this.describeFile(module, allModules, rootDir);
        if (description) {
          const relativePath = path.relative(rootDir, module.path);
          results.set(relativePath, description);
        }
      } finally {
        semaphore.release();
        completed++;
        onProgress?.(completed, total);
      }
    });

    await Promise.all(tasks);
    return results;
  }

}

/**
 * 并发控制信号量
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve?.();
    } else {
      this.permits++;
    }
  }
}

/**
 * 创建文件描述生成器实例
 */
export function createFileDescriber(config?: FileDescriberConfig): FileDescriber {
  return new FileDescriber(config);
}
