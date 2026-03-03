/**
 * [META] Vitest 测试配置
 * [WHY] 配置测试框架的运行环境、超时时间和文件匹配规则
 * [OPTIMIZATION] 常规测试只跑 src，避免基准测试拖慢反馈，并使用稳定的 threads 池
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // 常规功能测试只覆盖 src，基准测试放到单独配置执行
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'refer/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    // vmThreads 在本地出现过 segfault，threads 更稳定
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
  },
});
