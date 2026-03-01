/**
 * [META] Vitest 测试配置
 * [WHY] 配置测试框架的运行环境、超时时间和文件匹配规则
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'refer/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
