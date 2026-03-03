/**
 * [META] Vitest 基准测试配置
 * [WHY] 将 refer 基准测试与常规功能测试分离，避免影响默认测试反馈速度
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['refer/benchmark-quality.test.ts'],
    exclude: ['node_modules', 'dist'],
    // 基准测试会频繁启动子进程，使用更宽松超时并串行化保证稳定性
    testTimeout: 300000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1,
      },
    },
  },
});
