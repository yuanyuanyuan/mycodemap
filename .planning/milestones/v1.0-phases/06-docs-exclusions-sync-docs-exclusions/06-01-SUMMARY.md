# 06-01 Summary

## 完成内容

- 新增 `src/core/file-discovery.ts` 作为共享发现模块，统一 `.gitignore` 感知、默认排除列表、`.git` 目录兼容与 scoped include。
- `src/core/analyzer.ts` 改为直接复用共享发现模块。
- `src/orchestrator/file-header-scanner.ts` 改为通过共享发现模块扫描目录，继承仓库根 `.gitignore`。
- 默认排除模式修正为可递归命中的 `**/*.test.ts`、`**/*.spec.ts`、`**/*.d.ts`，并同步到 `src/cli/commands/init.ts`。
- `src/cli/commands/ci.ts` 补齐 `check-branch --allow` 通配匹配与 CI 分支回退逻辑，兑现公开文档示例。

## 验证

- `pnpm exec vitest run src/orchestrator/__tests__/file-header-scanner.test.ts src/cli/commands/__tests__/ci-gate-checks.test.ts`
- `npm run typecheck`
- `npm run build`

## 失败场景预演

- 若继续使用 `*.test.ts`，嵌套测试文件会再次被扫描；本次已用共享模块和测试把它锁定。
- 若 `check-branch` 继续只做精确匹配，`release/*` 示例会失真；本次已用 wildcard 测试验证。

## 剩余风险

- 共享发现契约若只存在代码中而不回写文档/guardrail，后续仍可能漂移；留给 `06-02` / `06-03` 收口。
