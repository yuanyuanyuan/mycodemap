// ============================================
// Worker Thread Pool - 线程池管理器
// ============================================

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as path from 'path';
import * as os from 'os';
import type { ModuleInfo } from '../types/index.js';

// 解析任务
interface ParseTask {
  filePath: string;
  rootDir: string;
  parserType: 'fast' | 'smart' | 'tree-sitter';
}

// 解析结果
interface WorkerResult {
  path: string;
  exports: any[];
  imports: any[];
  symbols: any[];
  dependencies: string[];
  type: 'source' | 'test' | 'config' | 'type';
  stats: {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
  error?: string;
}

// 线程池配置
export interface WorkerPoolConfig {
  /** 线程数，默认 CPU 核心数 */
  size?: number;
  /** 单个任务超时时间（毫秒），默认 30000 */
  timeout?: number;
}

// 线程池类
export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    task: ParseTask;
    resolve: (result: WorkerResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private activeWorkers: Set<Worker> = new Set();
  private config: Required<WorkerPoolConfig>;
  private workerPath: string;

  constructor(config: WorkerPoolConfig = {}) {
    // 默认使用 CPU 核心数，但最多 8 个
    const cpuCount = os.cpus().length;
    this.config = {
      size: Math.min(config.size || cpuCount, 8),
      timeout: config.timeout || 30000
    };

    // 设置 worker 脚本路径
    this.workerPath = path.join(__dirname, 'parse-worker.js');
  }

  /**
   * 初始化线程池
   */
  async initialize(): Promise<void> {
    // 预创建 worker
    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.config.size; i++) {
      promises.push(this.createWorker());
    }
    await Promise.all(promises);
  }

  /**
   * 创建 worker
   */
  private async createWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(this.workerPath);

        worker.on('online', () => {
          this.workers.push(worker);
          resolve();
        });

        worker.on('error', (error) => {
          console.error('Worker error:', error);
          this.workers = this.workers.filter(w => w !== worker);
          this.activeWorkers.delete(worker);
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            console.error(`Worker exited with code ${code}`);
          }
          this.workers = this.workers.filter(w => w !== worker);
          this.activeWorkers.delete(worker);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 执行解析任务
   */
  async parse(task: ParseTask): Promise<WorkerResult> {
    // 如果没有可用的 worker，等待
    if (this.workers.length === 0) {
      // 创建一个临时 worker
      await this.createWorker();
    }

    // 获取一个可用的 worker
    const worker = this.workers[0];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task timeout: ${task.filePath}`));
      }, this.config.timeout);

      const messageHandler = (result: WorkerResult) => {
        clearTimeout(timeout);
        worker.removeListener('message', messageHandler);
        resolve(result);
      };

      worker.once('message', messageHandler);
      worker.postMessage(task);
    });
  }

  /**
   * 批量解析（并行）
   */
  async parseBatch(tasks: ParseTask[]): Promise<WorkerResult[]> {
    // 使用所有可用的 worker 并行处理
    const results = await Promise.all(
      tasks.map(task => this.parse(task))
    );
    return results;
  }

  /**
   * 批量解析（带并发控制）
   */
  async parseBatchWithConcurrency(
    tasks: ParseTask[],
    concurrency: number = this.config.size
  ): Promise<WorkerResult[]> {
    const results: WorkerResult[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = this.parse(task).then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // 移除已完成的
        executing.splice(
          executing.findIndex(p => (p as any).status === 'fulfilled'),
          1
        );
      }
    }

    await Promise.allSettled(executing);
    return results;
  }

  /**
   * 关闭线程池
   */
  async terminate(): Promise<void> {
    await Promise.all(
      this.workers.map(worker => worker.terminate())
    );
    this.workers = [];
    this.activeWorkers.clear();
  }

  /**
   * 获取池状态
   */
  getStatus(): { size: number; active: number; queued: number } {
    return {
      size: this.workers.length,
      active: this.activeWorkers.size,
      queued: this.taskQueue.length
    };
  }
}

// 单例实例
let workerPoolInstance: WorkerPool | null = null;

/**
 * 获取 Worker 线程池单例
 */
export function getWorkerPool(config?: WorkerPoolConfig): WorkerPool {
  if (!workerPoolInstance) {
    workerPoolInstance = new WorkerPool(config);
  }
  return workerPoolInstance;
}

/**
 * 关闭 Worker 线程池
 */
export async function terminateWorkerPool(): Promise<void> {
  if (workerPoolInstance) {
    await workerPoolInstance.terminate();
    workerPoolInstance = null;
  }
}
