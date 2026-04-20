---
status: awaiting_human_verify
trigger: |-
  根据下面的内容，做一个fix： # mycodemap v0.5.1 安装问题报告

  - Node.js: v22.17.1
  - npm: 10.9.2
  - 安装方式: npm install -g @mycodemap/mycodemap@latest
  - OS: Linux (WSL2)

  问题 1: devDependencies 被生产代码引用 — dependency-cruiser
  问题 2: devDependencies 被生产代码引用 — glob
  问题 3: ESM default import 兼容性 — glob 版本不匹配
created: 2026-04-19T16:20:08.097Z
updated: 2026-04-19T16:24:10.480Z
---

## Current Focus

hypothesis: 根因已确认并完成修复，剩余只需等待人工确认发布侧行为
test: 运行聚焦测试、全量测试、dist CLI help，以及 tarball 安装后的 `check --help` / `analyze --help`
expecting: 所有验证通过，且打包安装环境不再出现缺包或 `glob` ESM default export 错误
next_action: 等待用户确认是否需要补充发布前防回归检查
reasoning_checkpoint: null
tdd_checkpoint: null

## Symptoms

expected: 全局安装后 `mycodemap` / `codemap` CLI 能直接启动
actual: CLI 启动即报 `ERR_MODULE_NOT_FOUND` 或 `glob` default export 语法错误
errors: |
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dependency-cruiser'
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'glob'
  SyntaxError: The requested module 'glob' does not provide an export named 'default'
reproduction: `npm install -g @mycodemap/mycodemap@latest` 后执行 CLI 任意命令
started: v0.5.1 发布包

## Eliminated

## Evidence

- timestamp: 2026-04-19T16:20:08.097Z
  checked: package.json
  found: `dependency-cruiser` 位于 `devDependencies`，`dependencies` 中没有 `glob`
  implication: 全局安装不会携带 `dependency-cruiser`，`glob` 也不是显式运行时依赖

- timestamp: 2026-04-19T16:20:08.097Z
  checked: src/orchestrator/test-linker.ts
  found: 文件顶部使用 `import pkg from 'glob'` 并从 `pkg` 解构 `Glob`
  implication: 对 `glob` 的 default export 兼容性有硬依赖，在 ESM 环境下会触发启动错误

- timestamp: 2026-04-19T16:20:08.097Z
  checked: CodeMap impact + CLI source imports
  found: `src/cli/commands/analyze.ts` 依赖 `test-linker`，`src/cli/commands/check.ts` 依赖 `contract-checker`
  implication: 这两个模块一旦在启动路径被加载，CLI 会在命令执行前崩溃

## Resolution

root_cause: `src/cli/contract-checker.ts` 在运行时直接依赖 `dependency-cruiser`，但包被声明在 `devDependencies`；`src/orchestrator/test-linker.ts` 运行时直接 default import `glob`，既未作为生产依赖声明，也与 ESM 导出形态不兼容
fix: 将 `dependency-cruiser` 移到 `dependencies`；将 `test-linker` 的 `glob` 实现替换为仓库已存在的 `globby`，消除缺包与 default export 兼容性问题
verification: `npm run build` 通过；聚焦测试 33/33 通过；默认全量测试 916/916 通过；`src/cli/__tests__/design-verify-e2e.test.ts` 3/3 通过；`node dist/cli/index.js --help` 正常；`npm pack` 后安装到临时前缀并执行 `mycodemap --help`、`mycodemap check --help`、`mycodemap analyze --help` 均正常。注意：默认 `vitest.config.ts` 只包含 `src/**/*.test.ts`，强制运行被排除的 `tests/e2e/workflow.e2e.test.ts` 时 12/21 通过、9/21 失败，失败集中在 workflow phase 旧期望（reference/impact/risk）与现实现（find/read）不一致，和本次安装依赖修复无直接文件交集
files_changed:
  - package.json
  - package-lock.json
  - src/orchestrator/test-linker.ts
  - .planning/debug/mycodemap-install-runtime-deps.md
