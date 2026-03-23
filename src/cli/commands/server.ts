// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Server command - starts the CodeMap HTTP API server (MVP3 architecture)
// ============================================

import chalk from 'chalk';
import { storageFactory } from '../../infrastructure/storage/StorageFactory.js';
import { CodeGraphBuilder } from '../../domain/services/CodeGraphBuilder.js';
import { CodeMapServer } from '../../server/CodeMapServer.js';

interface ServerOptions {
  port?: string;
  host?: string;
  cors?: boolean;
  open?: boolean;
}

export async function serverCommand(options: ServerOptions): Promise<void> {
  try {
    const port = parseInt(options.port ?? '3000', 10);
    const host = options.host ?? '0.0.0.0';

    console.log(chalk.blue('🔧 初始化 CodeMap 服务器...\n'));

    // 创建存储实例
    const storage = await storageFactory.createForProject(
      process.cwd(),
      {
        type: 'filesystem',
        outputPath: '.codemap/storage',
      }
    );

    // 创建代码图构建器
    const builder = CodeGraphBuilder.create({
      mode: 'fast',
      rootDir: process.cwd(),
    });

    // 创建并启动服务器
    const server = CodeMapServer.create(storage, builder, {
      port,
      host,
      cors: options.cors ? { origin: '*', credentials: true } : undefined,
    });

    const { url } = await server.start();

    console.log(chalk.green(`\n✅ 服务器已启动！\n`));
    console.log(chalk.white(`📡 API 地址: ${chalk.cyan(`${url}/api/v1`)}`));
    console.log(chalk.white(`🏥 健康检查: ${chalk.cyan(`${url}/api/v1/health`)}`));
    console.log(chalk.white(`📊 项目统计: ${chalk.cyan(`${url}/api/v1/stats`)}`));
    console.log(chalk.white(`🔍 符号搜索: ${chalk.cyan(`${url}/api/v1/search/symbols?q=`)}`));
    console.log();

    // 自动打开浏览器
    if (options.open) {
      try {
        const { exec } = await import('child_process');
        const platform = process.platform;
        const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${cmd} ${url}`);
      } catch {
        // 忽略打开浏览器失败
      }
    }

    // 优雅关闭
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n🛑 正在关闭服务器...'));
      await server.stop();
      await storage.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.stop();
      await storage.close();
      process.exit(0);
    });

    // 保持进程运行
    await new Promise(() => {});
  } catch (error) {
    console.error(chalk.red('\n❌ 服务器启动失败:'), error);
    process.exit(1);
  }
}
