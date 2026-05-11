# Phase 82 Research: Interface Contract 1.0.0

## Verified Findings

1. 所有当前注册的 command contract 已经声明了 `outputShape`、`errorCodes`、`examples`，因此这轮不需要逐条补大块 schema 内容，只需要把这些字段纳入更严格的稳定性门。
2. `CommandContract` / `commandContractSchema` 缺少 `stable`，这是当前距离 roadmap success criteria 最近的结构缺口。
3. `getFullContract()` 仍返回 `version: '0.1.0'`，与 roadmap 里的 `Interface Contract 1.0.0` 目标不一致。
4. `interface-contract.test.ts`、`index-schema.test.ts`、`schema-adapter.test.ts` 都依赖 meta-schema 或手写 `CommandContract` fixture；一旦 `stable` 变为必填，这些测试需要同步更新。
5. 现有命令注册表只包含九个 contract：`analyze`、`query`、`deps`、`doctor`、`benchmark`、`init`、`preview`、`env-contract`、`agent-metrics`。把这九个都视为当前 “in-scope core commands” 是最小且一致的解释。

## Implementation Direction

- 在 `CommandContract` 与 zod schema 中新增必填 `stable: boolean`。
- 把当前注册表内全部 command contract 标记为 `stable: true`。
- 把 full contract 版本提升到 `1.0.0`。
- 强化 contract tests：除了字段存在，还要断言所有内建 contract 都是 `stable: true`，并且 `--schema` 输出与 meta-schema 对齐。

## Non-Goals

- 不为未注册命令补 contract
- 不扩展 contract 到新的 schema 子系统
- 不新增 `--schema` 子命令能力或多版本协商机制
