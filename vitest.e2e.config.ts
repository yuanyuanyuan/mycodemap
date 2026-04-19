/**
 * [META] Vitest E2E 测试配置
 * [WHY] 为 `tests/e2e` 提供独立入口，供 CI 护栏稳定执行而不拖慢默认 `npm test`
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'refer/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
  },
});
