// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] Server command - starts the CodeMap HTTP API server
// ============================================
// Server 命令 - 启动 CodeMap HTTP API 服务器
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';

import { CodeGraphBuilder } from '../../domain/services/CodeGraphBuilder.js';
import { CodeMapServer } from '../../server/CodeMapServer.js';
import { createConfiguredStorage } from '../../cli/storage-runtime.js';
import type { ServerOptions } from '../types/index.js';

/**
 * Server 命令
 *
 * 启动 CodeMap HTTP API 服务器，提供 RESTful API 访问代码图数据。
 *
 * 示例:
 *   codemap server              # 默认端口 3000
 *   codemap server -p 8080      # 指定端口
 *   codemap server --open       # 自动打开浏览器
 */
export function createServerCommand(): Command {
  const command = new Command('server');

  command
    .description('启动 CodeMap HTTP API 服务器')
    .option('-p, --port <number>', '服务器端口', '3000')
    .option('-h, --host <string>', '服务器主机', '0.0.0.0')
    .option('--cors', '启用 CORS', false)
    .option('--open', '自动打开浏览器', false)
    .option('--no-watch', '禁用文件监视')
    .action(async (options: ServerOptions) => {
      try {
        const port = options.port ?? 3000;
        const host = options.host ?? '0.0.0.0';

        console.log(chalk.blue('🔧 初始化 CodeMap 服务器...\n'));

        // 创建存储实例
        const { storage } = await createConfiguredStorage(process.cwd());

        // 创建代码图构建器
        const builder = CodeGraphBuilder.create({
          mode: 'fast',
          rootDir: process.cwd(),
        });

        // 创建并启动服务器
        const server = CodeMapServer.create(storage, builder, {
          port: Number(port),
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
            // 尝试打开浏览器（使用系统命令）
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
    });

  return command;
}
