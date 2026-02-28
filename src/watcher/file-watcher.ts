// ============================================
// File Watcher - 文件监控
// ============================================

import chokidar, { FSWatcher } from 'chokidar';
import * as path from 'path';

/**
 * 文件变更事件
 */
export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  filePath: string;
  timestamp: number;
}

/**
 * File Watcher 配置
 */
export interface FileWatcherConfig {
  /** 监听目录 */
  rootDir: string;
  /** 监听模式 */
  glob?: string[];
  /** 忽略模式 */
  ignored?: RegExp[];
  /** 防抖延迟（毫秒） */
  debounceDelay?: number;
  /** 稳定性阈值（毫秒） */
  stabilityThreshold?: number;
}

/**
 * 文件变更处理器
 */
export type FileChangeHandler = (event: FileChangeEvent) => void | Promise<void>;

/**
 * File Watcher - 文件监控系统
 */
export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private config: FileWatcherConfig;
  private handlers: FileChangeHandler[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingEvents: Map<string, FileChangeEvent> = new Map();

  constructor(config: FileWatcherConfig) {
    this.config = {
      glob: ['src/**/*.ts'],
      ignored: [/(^|[\/\\])\../, /node_modules/],
      debounceDelay: 1000,
      stabilityThreshold: 500,
      ...config
    };
  }

  /**
   * 添加变更处理器
   */
  onChange(handler: FileChangeHandler): void {
    this.handlers.push(handler);
  }

  /**
   * 启动文件监控
   */
  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('FileWatcher 已在运行');
    }

    const glob = this.config.glob || ['**/*.ts'];

    this.watcher = chokidar.watch(glob, {
      cwd: this.config.rootDir,
      ignored: this.config.ignored,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: this.config.stabilityThreshold || 500,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (relativePath) => this.handleEvent('add', relativePath))
      .on('change', (relativePath) => this.handleEvent('change', relativePath))
      .on('unlink', (relativePath) => this.handleEvent('unlink', relativePath));

    // 等待监控就绪
    await new Promise<void>((resolve) => {
      this.watcher!.on('ready', () => resolve());
    });
  }

  /**
   * 停止文件监控
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.pendingEvents.clear();
  }

  /**
   * 处理文件变更事件
   */
  private handleEvent(type: FileChangeEvent['type'], relativePath: string): void {
    const absolutePath = path.resolve(this.config.rootDir, relativePath);

    const event: FileChangeEvent = {
      type,
      filePath: absolutePath,
      timestamp: Date.now()
    };

    // 更新待处理事件
    this.pendingEvents.set(relativePath, event);

    // 防抖处理
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushEvents();
    }, this.config.debounceDelay);
  }

  /**
   * 刷新待处理事件
   */
  private flushEvents(): void {
    for (const event of this.pendingEvents.values()) {
      // 执行所有处理器
      for (const handler of this.handlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            result.catch(console.error);
          }
        } catch (error) {
          console.error('FileChangeHandler error:', error);
        }
      }
    }

    this.pendingEvents.clear();
  }

  /**
   * 获取监控状态
   */
  getStatus(): { watching: boolean; watchedPaths: number } {
    return {
      watching: this.watcher !== null,
      watchedPaths: this.watcher ? (this.watcher as any)._watched?.size || 0 : 0
    };
  }
}

/**
 * 创建 FileWatcher 实例
 */
export function createFileWatcher(config: FileWatcherConfig): FileWatcher {
  return new FileWatcher(config);
}
