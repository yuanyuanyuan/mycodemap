// ============================================
// Watch Daemon - 守护进程管理
// ============================================

import { fork, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Watch Daemon 配置
 */
export interface WatchDaemonConfig {
  /** 监听目录 */
  rootDir: string;
  /** 输出目录 */
  outputDir: string;
  /** 分析模式 */
  mode: 'fast' | 'smart';
  /** PID 文件路径 */
  pidFile?: string;
  /** 日志文件路径 */
  logFile?: string;
}

/**
 * Watch Daemon 状态
 */
export interface WatchDaemonStatus {
  pid: number;
  rootDir: string;
  outputDir: string;
  mode: string;
  startedAt: string;
}

/**
 * Watch Daemon - 后台守护进程管理
 */
export class WatchDaemon {
  private process: ChildProcess | null = null;
  private config: WatchDaemonConfig;
  private pidFile: string;
  private logFile: string;

  constructor(config: WatchDaemonConfig) {
    this.config = config;
    this.pidFile = config.pidFile || path.join(config.outputDir, 'watch.pid');
    this.logFile = config.logFile || path.join(config.outputDir, 'watch.log');
  }

  /**
   * 启动守护进程
   */
  async start(): Promise<void> {
    // 检查是否已运行
    if (await this.isRunning()) {
      throw new Error('Watch daemon 已在运行中');
    }

    // 确保输出目录存在
    const outputDir = path.resolve(this.config.rootDir, this.config.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 解析 worker 路径
    const workerPath = path.join(__dirname, 'watch-worker.js');

    // 使用 fork 启动子进程
    this.process = fork(workerPath, {
      cwd: this.config.rootDir,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    // 发送配置到 worker
    this.process.send({
      type: 'config',
      payload: {
        rootDir: this.config.rootDir,
        outputDir: this.config.outputDir,
        mode: this.config.mode
      }
    });

    // 脱离父进程
    this.process.unref();

    // 保存 PID
    const pid = this.process.pid!;
    fs.writeFileSync(this.pidFile, String(pid));

    // 设置日志输出
    if (this.process.stdout) {
      const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
      this.process.stdout.pipe(logStream);
    }
    if (this.process.stderr) {
      const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
      this.process.stderr.pipe(logStream);
    }

    // 等待进程启动完成
    await this.waitForStart(5000);
  }

  /**
   * 停止守护进程
   */
  async stop(): Promise<void> {
    if (!fs.existsSync(this.pidFile)) {
      throw new Error('Watch daemon 未运行');
    }

    const pid = parseInt(fs.readFileSync(this.pidFile, 'utf-8'), 10);

    try {
      process.kill(pid, 'SIGTERM');

      // 等待进程退出
      await this.waitForStop(pid, 5000);

      // 删除 PID 文件
      fs.unlinkSync(this.pidFile);
    } catch (error) {
      // 如果进程不存在，删除 PID 文件
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }
      throw error;
    }
  }

  /**
   * 检查守护进程是否在运行
   */
  async isRunning(): Promise<boolean> {
    if (!fs.existsSync(this.pidFile)) {
      return false;
    }

    const pid = parseInt(fs.readFileSync(this.pidFile, 'utf-8'), 10);

    try {
      process.kill(pid, 0);
      return true;
    } catch {
      // 进程不存在，删除 stale PID 文件
      fs.unlinkSync(this.pidFile);
      return false;
    }
  }

  /**
   * 获取守护进程状态
   */
  async getStatus(): Promise<WatchDaemonStatus | null> {
    if (!fs.existsSync(this.pidFile)) {
      return null;
    }

    const pid = parseInt(fs.readFileSync(this.pidFile, 'utf-8'), 10);

    try {
      process.kill(pid, 0);
      return {
        pid,
        rootDir: this.config.rootDir,
        outputDir: this.config.outputDir,
        mode: this.config.mode,
        startedAt: fs.statSync(this.pidFile).mtime.toISOString()
      };
    } catch {
      return null;
    }
  }

  /**
   * 等待守护进程启动
   */
  private waitForStart(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // 超时后检查进程是否仍在运行
        if (this.process && !this.process.killed) {
          // 进程仍在运行，认为启动成功
          resolve();
        } else {
          reject(new Error('Watch daemon 启动超时'));
        }
      }, timeout);

      // 检查进程状态
      if (this.process) {
        this.process.on('spawn', () => {
          clearTimeout(timer);
          resolve();
        });
        this.process.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      }
    });
  }

  /**
   * 等待守护进程停止
   */
  private waitForStop(pid: number, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Watch daemon 停止超时'));
      }, timeout);

      const checkStopped = () => {
        try {
          process.kill(pid, 0);
          setTimeout(checkStopped, 100);
        } catch {
          clearTimeout(timer);
          resolve();
        }
      };

      checkStopped();
    });
  }
}

/**
 * 创建 Watch Daemon 实例
 */
export function createWatchDaemon(config: WatchDaemonConfig): WatchDaemon {
  return new WatchDaemon(config);
}
